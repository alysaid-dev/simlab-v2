import https from "node:https";
import http from "node:http";
import { URL } from "node:url";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { prisma } from "../config/database.js";

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
  /**
   * Roles yang disimpan di DB (`user_roles` → `roles.name`). Di-populate
   * sekali saat resolve Shibboleth session, lalu di-cache bareng user object
   * di `sessionCache` — jadi guard tidak query DB tiap request.
   */
  dbRoles?: Role[];
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

/** Mirrors Prisma's RoleName enum. Source of truth for RBAC. */
export type Role =
  | "SUPER_ADMIN"
  | "KEPALA_LAB"
  | "DOSEN"
  | "LABORAN"
  | "STAFF"
  | "MAHASISWA";

/**
 * Exact-match map from canonical group CN / affiliation value → Role.
 * Compared case-insensitively. Anything not in this map is ignored.
 *
 * Hanya marker SIMLAB-spesifik (`simlab-*`) yang dipercaya sebagai
 * auto-grant role dari IdP. Marker generik seperti `staff`, `dosen`,
 * `faculty` sengaja DIHAPUS karena UII IdP memberi `affiliation=Staff`
 * ke semua karyawan (dosen/tendik/laboran sama saja) — mapping generik
 * itu memicu over-granting. Source of truth untuk non-mahasiswa adalah
 * tabel `user_roles` (lihat `dbRoles` di bawah), di-manage admin via
 * `/akun`. MAHASISWA dan SUPER_ADMIN masih di-bootstrap dari email
 * domain dan env `superAdminUids`.
 */
const ROLE_MAP: Record<string, Role> = {
  "simlab-super-admin": "SUPER_ADMIN",
  "simlab-kepala-lab": "KEPALA_LAB",
  "simlab-dosen": "DOSEN",
  "simlab-laboran": "LABORAN",
  "simlab-staff": "STAFF",
  "simlab-mahasiswa": "MAHASISWA",
};

/** UII student email domain — auto-map ke role MAHASISWA. */
const STUDENT_EMAIL_DOMAIN = "@students.uii.ac.id";

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
  // Roles yang di-assign Admin/Super Admin via UI (/api/users/:id/roles),
  // tersimpan di tabel user_roles. Populated oleh shibbolethAttach.
  if (user.dbRoles) {
    for (const r of user.dbRoles) roles.add(r);
  }
  // Mahasiswa UII — auto-tag berdasarkan domain email, tanpa perlu assignment.
  if (user.email.toLowerCase().endsWith(STUDENT_EMAIL_DOMAIN)) {
    roles.add("MAHASISWA");
  }
  if (env.shibboleth.superAdminUids.includes(user.uid)) {
    roles.add("SUPER_ADMIN");
  }
  return roles;
}

/**
 * Query `user_roles` untuk UID tertentu. Dipanggil sekali saat shibboleth
 * session di-resolve, hasilnya di-cache di `sessionCache` bareng user object.
 * Return empty array kalau user belum ada di DB (akan di-upsert nanti oleh
 * `/api/auth/me`) atau belum punya role assignment.
 */
async function fetchDbRoles(uid: string): Promise<Role[]> {
  try {
    const rec = await prisma.user.findUnique({
      where: { uid },
      select: { roles: { select: { role: { select: { name: true } } } } },
    });
    if (!rec) return [];
    return rec.roles.map((ur) => ur.role.name as Role);
  } catch (err) {
    console.error("[fetchDbRoles] query failed for uid=", uid, err);
    return [];
  }
}

/**
 * True if `user` holds any of the listed roles. Use this instead of any
 * hierarchy-based check — SIMLAB roles are different functions (LABORAN ≠
 * DOSEN ≠ KEPALA_LAB), not stacked authorities, so ranking them invites
 * accidental over-granting (e.g. DOSEN passing a LABORAN threshold).
 */
export function hasAnyRole(user: ShibbolethUser, ...roles: Role[]): boolean {
  const userRoles = deriveRoles(user);
  return roles.some((r) => userRoles.has(r));
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

  // Enrich dengan role dari DB sekali (bukan per-request) — sessionCache
  // TTL biasanya 60s, jadi perubahan role lewat /api/users/:id/roles akan
  // aktif paling lambat setelah TTL expire.
  user.dbRoles = await fetchDbRoles(user.uid);

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
 * Example: requireRole("LABORAN", "KEPALA_LAB", "SUPER_ADMIN").
 *
 * Always prefer this (whitelist) over any hierarchy/threshold check — SIMLAB
 * roles are distinct functions, not stacked authorities.
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

