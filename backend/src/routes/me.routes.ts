import { Router } from "express";
import { meController } from "../controllers/me.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/active-items", meController.activeItems);

export default router;
