import { Router } from "express";
import { clearancesController } from "../controllers/clearances.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", clearancesController.list);
router.get("/:id", clearancesController.getById);
router.get("/:id/download", clearancesController.download);
router.post("/", clearancesController.create);
router.patch(
  "/:id/status",
  requireRole("LABORAN", "KEPALA_LAB", "SUPER_ADMIN"),
  clearancesController.updateStatus
);

export default router;
