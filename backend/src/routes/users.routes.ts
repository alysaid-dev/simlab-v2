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
router.get("/:id", usersController.getById);

// Mutasi user + roles — hanya ADMIN+.
router.post("/", requireRoleAtLeast("ADMIN"), usersController.create);
router.patch("/:id", requireRoleAtLeast("ADMIN"), usersController.update);
router.delete("/:id", requireRoleAtLeast("ADMIN"), usersController.remove);
router.put(
  "/:id/roles",
  requireRoleAtLeast("ADMIN"),
  usersController.replaceRoles,
);

export default router;
