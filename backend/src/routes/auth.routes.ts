import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";

const router = Router();

// GET /api/auth/me — requires Shibboleth attributes (attached by shibbolethAttach)
router.get("/me", authController.me);

// POST /api/auth/logout — redirects to SP logout
router.post("/logout", authController.logout);

export default router;
