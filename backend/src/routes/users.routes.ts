import { Router } from "express";
import { usersController } from "../controllers/users.controller.js";
import { requireAuth, requireRoleAtLeast } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", requireRoleAtLeast("LABORAN"), usersController.list);
// Specific path before `/:id` — otherwise "me" would be matched as an id.
router.get("/me/obligations", usersController.obligations);
router.get("/:id", usersController.getById);

export default router;
