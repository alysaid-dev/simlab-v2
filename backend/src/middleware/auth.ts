import https from "node:https";
import http from "node:http";
import { URL } from "node:url";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

/**
 * User object populated from Shibboleth-injected request headers.
 * These headers are typically set by Nginx (auth_request to mod_shib /
 * shibauthorizer) which forwards attributes released by the IdP as
 * plain HTTP headers to the backend.
 */
export interface ShibbolethUser {
  uid: string;
  email: string;
  displayName: string;
  affiliation: string[];
  orgUnitDN: string | null;
  memberOf: string[];
}

// ---------------------------------------------------------------------------
// Roles & hierarchy
// ---------------------------------------------------------------------------

/** Mirrors Prisma's RoleName enum. Source of truth for RBAC. */
export type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "KEPALA_LAB"
  | "DOSEN"
  | "LABORAN"
  | "STAFF";

/**
 * Hierarchy ranks — higher = more authority. Used by `hasRoleAtLeast()`.
 * SUPER_ADMIN > ADMIN > KEPALA_LAB > DOSEN > LABORAN > STAFF.
 */
const ROLE_RANK: Record<Role, number> = {
  STAFF: 1,
  LABORAN: 2,
  DOSEN: 3,
  KEPALA_LAB: 4,
  ADMIN: 5,
  SUPER_ADMIN: 6,
};

/**
 * Exact-match map from canonical group CN / affiliation value → Role.
 * Compared case-insensitively. Anything not in this map is ignored —
 * substring matching is intentionally avoided so e.g. a group named
 * `admintest` does NOT grant ADMIN.
 */
const ROLE_MAP: Record<string, Role> = {
  // SUPER_ADMIN
  "super-admin": "SUPER_ADMIN",
  superadmin: "SUPER_ADMIN",
  "simlab-super-admin": "SUPER_ADMIN",
  // ADMIN
  admin: "ADMIN",
  "simlab-admin": "ADMIN",
  // KEPALA_LAB
  "kepala-lab": "KEPALA_LAB",
  kalab: "KEPALA_LAB",
  "simlab-kepala-lab": "KEPALA_LAB",
  // DOSEN
  dosen: "DOSEN",
  lecturer: "DOSEN",
  faculty: "DOSEN",
  "simlab-dosen": "DOSEN",
  // LABORAN
  laboran: "LABORAN",
  "simlab-laboran": "LABORAN",
  // STAFF
  staff: "STAFF",
  "simlab-staff": "STAFF",
};

/** Extract the leading `cn=<value>` from an LDAP DN, else return input as-is. */
function extractCN(value: string): string {
  const m = value.match(/^\s*cn=([^,]+)/i);
  return (m?.[1] ?? value).trim();
}

/**
 * Derive the set of Roles a user holds by exact-matching their group CNs and
 * affiliation values against ROLE_MAP. Empty set means the user has no
 * recognized role (typical for mahasiswa).
 *
 * As a bootstrap, any UID listed in `env.shibboleth.superAdminUids` is
 * elevated to SUPER_ADMIN regardless of IdP attributes — this gives the
 * first admin a way in before a role-management UI exists.
 */
export function deriveRoles(user: ShibbolethUser): Set<Role> {
  const roles = new Set<Role>();
  for (const g of user.memberOf) {
    const key = extractCN(g).toLowerCase();
    const role = ROLE_MAP[key];
    if (role) roles.add(role);
  }
  for (const a of user.affiliation) {
    const role = ROLE_MAP[a.toLowerCase().trim()];
    if (role) roles.add(role);
  }
  if (env.shibboleth.superAdminUids.includes(user.uid)) {
    roles.add("SUPER_ADMIN");
  }
  return roles;
}

/**
 * True if `user` holds any role at or above `min` in the hierarchy.
 * A user with no recognized role always returns false.
 */
export function hasRoleAtLeast(user: ShibbolethUser, min: Role): boolean {
  const roles = deriveRoles(user);
  if (roles.size === 0) return false;
  const minRank = ROLE_RANK[min];
  for (const r of roles) {
    if (ROLE_RANK[r] >= minRank) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Header parsing & user attach
// ---------------------------------------------------------------------------

function mockUser(): ShibbolethUser {
  return {
    uid: "22611147",
    email: "22611147@students.uii.ac.id",
    displayName: "Muhammad Aly Sa`id",
    affiliation: ["student", "member"],
    orgUnitDN: "ou=Statistika,ou=FMIPA,o=UII,c=ID",
    memberOf: ["cn=simlab-users", "cn=statistika-students"],
  };
}

/**
 * Read the `_shibsession_<...>` cookie pair (entire "name=value") from the
 * request. Returns undefined if none is present. The SP's /Session endpoint
 * uses this cookie to identify the active session.
 */
function extractShibSessionCookie(
  cookieHeader: string | undefined,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const name = trimmed.slice(0, eq);
    if (name.startsWith("_shibsession_")) return trimmed;
  }
  return undefined;
}

/**
 * Parse the response body of /Shibboleth.sso/Session (plain text wrapped in
 * HTML by default). We strip tags and collect `Key: Value` pairs from the
 * attribute section. Returns null if no `uid` was found.
 */
function parseSessionBody(body: string): ShibbolethUser | null {
  const map: Record<string, string> = {};
  const lineRe = /^\s*([A-Za-z][\w-]*)\s*:\s*(.+?)\s*$/;
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/<[^>]+>/g, "").trim();
    const m = line.match(lineRe);
    if (!m) continue;
    const [, key, value] = m;
    if (!value || value === "(none)") continue;
    if (!(key in map)) map[key] = value;
  }
  const uid = map.uid;
  if (!uid) return null;
  return {
    uid,
    email: map.mail ?? "",
    displayName: map.displayName ?? uid,
    affiliation: (map.eduPersonAffiliation ?? "")
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
    orgUnitDN: map.eduPersonOrgUnitDN ?? null,
    memberOf: (map.memberOf ?? "")
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  };
}

/**
 * GET the Shibboleth session URL. We forward the user's own `_shibsession_`
 * cookie plus an `X-Forwarded-For` equal to their original IP — nginx is
 * configured to honor XFF only when the request comes from 127.0.0.1, so mod
 * _shib sees the same REMOTE_ADDR that was recorded when the session was
 * established (passing the session consistency check).
 *
 * Resolves to the response body on HTTP 200, or null on any failure/non-200.
 */
function fetchSessionBody(
  sessionUrl: string,
  cookie: string,
  hostname: string,
  clientIp: string,
): Promise<string | null> {
  return new Promise((resolve) => {
    let url: URL;
    try {
      url = new URL(sessionUrl);
    } catch {
      resolve(null);
      return;
    }

    const isHttps = url.protocol === "https:";
    const lib = isHttps ? https : http;
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: "GET",
        headers: {
          Cookie: cookie,
          Host: hostname,
          "X-Forwarded-For": clientIp,
        },
        // Localhost loopback with a self-signed cert — safe to skip TLS verify.
        ...(isHttps ? { rejectUnauthorized: false } : {}),
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          resolve(null);
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () =>
          resolve(Buffer.concat(chunks).toString("utf8")),
        );
        res.on("error", () => resolve(null));
      },
    );

    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });
    req.on("error", () => resolve(null));
    req.end();
  });
}

interface CacheEntry {
  user: ShibbolethUser;
  expiresAt: number;
}

const sessionCache = new Map<string, CacheEntry>();

function pickClientIp(req: Request): string {
  const header = req.header("x-real-ip");
  if (header) return header.trim();
  // req.ip respects `trust proxy` — falls back to socket address otherwise.
  return req.ip ?? "127.0.0.1";
}

async function resolveShibbolethUser(
  req: Request,
): Promise<ShibbolethUser | null> {
  const cookie = extractShibSessionCookie(req.headers.cookie);
  if (!cookie) return null;

  const now = Date.now();
  const cached = sessionCache.get(cookie);
  if (cached && cached.expiresAt > now) return cached.user;

  const body = await fetchSessionBody(
    env.shibboleth.sessionUrl,
    cookie,
    env.shibboleth.hostname,
    pickClientIp(req),
  );
  if (!body) return null;

  const user = parseSessionBody(body);
  if (!user) return null;

  sessionCache.set(cookie, {
    user,
    expiresAt: now + env.shibboleth.sessionCacheTtlMs,
  });
  return user;
}

export async function shibbolethAttach(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await resolveShibbolethUser(req);
    if (user) {
      req.user = user;
    } else if (env.shibboleth.devMock) {
      req.user = mockUser();
    }
  } catch (err) {
    console.error("[shibbolethAttach] unexpected error:", err);
    if (env.shibboleth.devMock) req.user = mockUser();
  }
  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: "Unauthorized",
      message:
        "Sesi Shibboleth tidak ditemukan. Silakan login melalui SSO UII.",
    });
    return;
  }
  next();
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/**
 * Allows the request only if the user holds at least one of `roles` (exact).
 * Example: requireRole("LABORAN", "KEPALA_LAB", "ADMIN", "SUPER_ADMIN").
 *
 * For "minimum role" semantics use `requireRoleAtLeast` instead.
 */
export function requireRole(...roles: Role[]) {
  return function (req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const userRoles = deriveRoles(req.user);
    const ok = roles.some((r) => userRoles.has(r));
    if (!ok) {
      res.status(403).json({
        error: "Forbidden",
        message: `Akses ditolak. Dibutuhkan peran: ${roles.join(", ")}`,
      });
      return;
    }
    next();
  };
}

/** Allows the request only if the user holds a role at or above `min`. */
export function requireRoleAtLeast(min: Role) {
  return function (req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!hasRoleAtLeast(req.user, min)) {
      res.status(403).json({
        error: "Forbidden",
        message: `Akses ditolak. Dibutuhkan peran minimum: ${min}`,
      });
      return;
    }
    next();
  };
}
