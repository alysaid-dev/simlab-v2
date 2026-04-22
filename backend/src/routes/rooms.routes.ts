import { Router } from "express";
import { roomsController } from "../controllers/rooms.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", roomsController.list);
router.get("/:id", roomsController.getById);

export default router;
