import { Router } from "express";
import { assetsController } from "../controllers/assets.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// Read — any authenticated user
router.get("/", assetsController.list);
router.get("/:id", assetsController.getById);

// Write — only laboran / admin / kepala-lab
router.post("/", requireRole("laboran", "admin", "kepala-lab"), assetsController.create);
router.patch("/:id", requireRole("laboran", "admin", "kepala-lab"), assetsController.update);
router.delete("/:id", requireRole("admin", "kepala-lab"), assetsController.remove);

export default router;
