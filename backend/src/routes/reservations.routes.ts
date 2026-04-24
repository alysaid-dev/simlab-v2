import { Router } from "express";
import {
  reservationsController,
  reservationUpload,
} from "../controllers/reservations.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", reservationsController.list);
router.get("/:id", reservationsController.getById);
router.get("/:id/surat", reservationsController.serveSurat);
// Multipart upload — "surat" = File (PDF ≤ 200KB).
router.post(
  "/",
  reservationUpload.single("surat"),
  reservationsController.create,
);

router.patch(
  "/:id/status",
  requireRole("LABORAN", "KEPALA_LAB", "SUPER_ADMIN"),
  reservationsController.updateStatus,
);

export default router;
