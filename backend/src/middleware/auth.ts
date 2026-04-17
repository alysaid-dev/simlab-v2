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

/**
 * Read a Shibboleth-mapped header. Shibboleth attributes sometimes arrive
 * URL-encoded (RFC 2047 UTF-8 percent-encoded) — if decoding fails we just
 * return the raw value.
 */
function readHeader(req: Request, name: string): string | null {
  const raw = req.header(name);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Parse a multi-valued Shibboleth header. The SP typically joins repeated
 * attribute values with `;` (configurable via `attribute-map.xml`), but some
 * deployments use `,`. We handle both.
 */
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

  // uid is the minimum required identity claim
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

/**
 * Development mock — injects a fake user when SHIBBOLETH_DEV_MOCK=1 and
 * no real Shibboleth headers are present. Makes it possible to hit the
 * API from a dev browser without running mod_shib locally.
 */
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
 * Populates `req.user` from Shibboleth headers if present.
 * Does NOT reject the request — use `requireAuth` to enforce authentication.
 */
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

/**
 * Rejects the request with 401 if no Shibboleth user is attached.
 * Should run AFTER `shibbolethAttach`.
 */
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

/**
 * Role guard — checks if the user's `memberOf` groups OR `affiliation`
 * contain at least one of the required roles.
 * Example: requireRole("kepala-lab", "admin")
 */
export function requireRole(...roles: string[]) {
  return function (req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const userRoles = new Set<string>([
      ...req.user.memberOf.map((g) => g.toLowerCase()),
      ...req.user.affiliation.map((a) => a.toLowerCase()),
    ]);
    const hasRole = roles.some((r) => {
      const rl = r.toLowerCase();
      return Array.from(userRoles).some((ur) => ur.includes(rl));
    });
    if (!hasRole) {
      res.status(403).json({
        error: "Forbidden",
        message: `Akses ditolak. Dibutuhkan peran: ${roles.join(", ")}`,
      });
      return;
    }
    next();
  };
}
