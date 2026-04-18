import { Router } from "express";
import { assetsController } from "../controllers/assets.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// Read — any authenticated user
router.get("/", assetsController.list);
router.get("/:id", assetsController.getById);

// Write — only LABORAN / KEPALA_LAB / ADMIN / SUPER_ADMIN
router.post(
  "/",
  requireRole("LABORAN", "KEPALA_LAB", "ADMIN", "SUPER_ADMIN"),
  assetsController.create
);
router.patch(
  "/:id",
  requireRole("LABORAN", "KEPALA_LAB", "ADMIN", "SUPER_ADMIN"),
  assetsController.update
);
router.delete(
  "/:id",
  requireRole("KEPALA_LAB", "ADMIN", "SUPER_ADMIN"),
  assetsController.remove
);

export default router;
