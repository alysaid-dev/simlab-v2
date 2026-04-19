import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { usersService } from "../services/users.service.js";
import { deriveRoles } from "../middleware/auth.js";

export const authController = {
  /**
   * GET /api/auth/me
   * Returns the authenticated user from Shibboleth attributes + DB roles.
   */
  me: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Belum login melalui Shibboleth SSO UII",
      });
      return;
    }

    // Lazy-provision user in DB on every /me call — cheap (single upsert) and
    // keeps the DB in sync with IdP attribute changes.
    const dbUser = await usersService
      .upsertFromShibboleth(req.user)
      .catch(() => null);

    res.json({
      uid: req.user.uid,
      email: req.user.email,
      displayName: req.user.displayName,
      affiliation: req.user.affiliation,
      orgUnitDN: req.user.orgUnitDN,
      memberOf: req.user.memberOf,
      roles: [...deriveRoles(req.user)],
      dbUser: dbUser
        ? {
            id: dbUser.id,
            isActive: dbUser.isActive,
            createdAt: dbUser.createdAt,
            waNumber: dbUser.waNumber,
          }
        : null,
    });
  }),

  /**
   * POST /api/auth/logout
   * Redirects to Shibboleth SP-initiated logout endpoint.
   * Browser will follow the redirect; SP terminates the session.
   */
  logout(_req: Request, res: Response): void {
    const returnTo = encodeURIComponent(env.shibboleth.logoutReturn);
    const url = `${env.shibboleth.logoutUrl}?return=${returnTo}`;
    res.status(302).location(url).json({
      logoutUrl: url,
      message: "Redirecting to Shibboleth logout",
    });
  },
};
