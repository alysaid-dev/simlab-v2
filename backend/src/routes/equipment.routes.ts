import { Router } from "express";
import { equipmentController } from "../controllers/equipment.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", equipmentController.list);
router.get("/:id", equipmentController.getById);
router.post(
  "/",
  requireRole("LABORAN", "KEPALA_LAB", "SUPER_ADMIN"),
  equipmentController.create,
);
router.patch(
  "/:id",
  requireRole("LABORAN", "KEPALA_LAB", "SUPER_ADMIN"),
  equipmentController.update,
);
router.delete("/:id", requireRole("SUPER_ADMIN"), equipmentController.remove);

export default router;
