import { Router } from "express";
import { loansController } from "../controllers/loans.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", loansController.list);
// Riwayat Denda — LABORAN/KEPALA_LAB/SUPER_ADMIN only. Harus di atas route
// dinamis "/:id" biar string "fines" tidak ke-match sebagai id UUID.
router.get(
  "/fines",
  requireRole("LABORAN", "KEPALA_LAB", "SUPER_ADMIN"),
  loansController.listFines,
);
router.get("/:id", loansController.getById);
router.post("/", loansController.create);
router.patch("/:id/status", loansController.updateStatus);
router.patch(
  "/:id/fine",
  requireRole("LABORAN", "KEPALA_LAB", "SUPER_ADMIN"),
  loansController.markFine,
);
router.patch("/:id", loansController.update);

export default router;
