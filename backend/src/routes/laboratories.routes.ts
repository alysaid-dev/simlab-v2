import { Router } from "express";
import { laboratoriesController } from "../controllers/laboratories.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", laboratoriesController.list);
router.get("/:id", laboratoriesController.getById);

router.patch(
  "/:id",
  requireRole("SUPER_ADMIN"),
  laboratoriesController.update,
);

export default router;
