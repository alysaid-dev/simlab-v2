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

function readHeader(req: Request, name: string): string | null {
  const raw = req.header(name);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function readMultiHeader(req: Request, name: string): string[] {
  const value = readHeader(req, name);
  if (!value) return [];
  return value
    .split(/[;,]/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function buildUser(req: Request): ShibbolethUser | null {
  const uid = readHeader(req, "uid");
  const email = readHeader(req, "mail");
  const displayName = readHeader(req, "displayname");
  if (!uid) return null;
  return {
    uid,
    email: email ?? "",
    displayName: displayName ?? uid,
    affiliation: readMultiHeader(req, "edupersonaffiliation"),
    orgUnitDN: readHeader(req, "edupersonorgunitdn"),
    memberOf: readMultiHeader(req, "memberof"),
  };
}

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

export function shibbolethAttach(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const user = buildUser(req);
  if (user) {
    req.user = user;
  } else if (env.shibboleth.devMock) {
    req.user = mockUser();
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
