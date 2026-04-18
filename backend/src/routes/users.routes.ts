import { Router } from "express";
import { usersController } from "../controllers/users.controller.js";
import { requireAuth, requireRoleAtLeast } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", requireRoleAtLeast("LABORAN"), usersController.list);
router.get("/:id", usersController.getById);

export default router;
