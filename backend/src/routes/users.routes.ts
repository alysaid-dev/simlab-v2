import { Router } from "express";
import { usersController } from "../controllers/users.controller.js";
import { requireAuth, requireRoleAtLeast } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
// Guard role diperiksa di controller: ?role=DOSEN terbuka untuk semua user
// (buat dropdown), selain itu butuh LABORAN+.
router.get("/", usersController.list);
// Specific path before `/:id` — otherwise "me" would be matched as an id.
router.get("/me/obligations", usersController.obligations);
router.patch("/me", usersController.updateMe);
router.get("/:id", usersController.getById);

// Mutasi user + roles — LABORAN+ (Laboran mengelola akun).
router.post("/", requireRoleAtLeast("LABORAN"), usersController.create);
router.patch("/:id", requireRoleAtLeast("LABORAN"), usersController.update);
router.delete("/:id", requireRoleAtLeast("LABORAN"), usersController.remove);
router.put(
  "/:id/roles",
  requireRoleAtLeast("LABORAN"),
  usersController.replaceRoles,
);

export default router;
