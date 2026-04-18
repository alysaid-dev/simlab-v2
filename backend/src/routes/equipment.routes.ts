import { Router } from "express";
import { equipmentController } from "../controllers/equipment.controller.js";
import { requireAuth, requireRoleAtLeast } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", equipmentController.list);
router.get("/:id", equipmentController.getById);
router.post("/", requireRoleAtLeast("LABORAN"), equipmentController.create);
router.patch("/:id", requireRoleAtLeast("LABORAN"), equipmentController.update);
router.delete("/:id", requireRoleAtLeast("ADMIN"), equipmentController.remove);

export default router;
