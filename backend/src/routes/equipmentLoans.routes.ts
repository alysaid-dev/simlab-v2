import { Router } from "express";
import { equipmentLoansController } from "../controllers/equipmentLoans.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", equipmentLoansController.list);
router.get("/:id", equipmentLoansController.getById);
router.post("/", equipmentLoansController.create);
router.patch(
  "/:id/status",
  requireRole("LABORAN", "KEPALA_LAB", "SUPER_ADMIN"),
  equipmentLoansController.updateStatus
);

export default router;
