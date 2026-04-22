import { Router } from "express";
import { appSettingsController } from "../controllers/appSettings.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// Semua user ter-auth boleh baca (dipakai notif/denda util di frontend).
router.get("/", appSettingsController.get);

// Hanya SUPER_ADMIN yang boleh ubah.
router.patch("/", requireRole("SUPER_ADMIN"), appSettingsController.update);

export default router;
