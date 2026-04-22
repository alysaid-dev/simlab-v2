import { Router } from "express";
import { usersController } from "../controllers/users.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
// Guard role diperiksa di controller: ?role=DOSEN terbuka untuk semua user
// (buat dropdown), selain itu butuh LABORAN/KEPALA_LAB/SUPER_ADMIN.
router.get("/", usersController.list);
// Specific path before `/:id` — otherwise "me" would be matched as an id.
router.get("/me/obligations", usersController.obligations);
router.patch("/me", usersController.updateMe);
router.get("/:id", usersController.getById);

// Mutasi user + roles — Laboran mengelola akun; kalab & super admin juga.
// Sengaja WHITELIST eksplisit (bukan hierarchy) supaya DOSEN tidak ikut lolos
// lewat threshold check — mereka bukan peran operasional lab.
router.post(
  "/",
  requireRole("LABORAN", "KEPALA_LAB", "SUPER_ADMIN"),
  usersController.create,
);
router.patch(
  "/:id",
  requireRole("LABORAN", "KEPALA_LAB", "SUPER_ADMIN"),
  usersController.update,
);
router.delete(
  "/:id",
  requireRole("LABORAN", "KEPALA_LAB", "SUPER_ADMIN"),
  usersController.remove,
);
router.put(
  "/:id/roles",
  requireRole("LABORAN", "KEPALA_LAB", "SUPER_ADMIN"),
  usersController.replaceRoles,
);

export default router;
