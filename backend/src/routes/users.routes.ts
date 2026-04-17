import { Router } from "express";
import { usersController } from "../controllers/users.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", usersController.list);
router.get("/:id", usersController.getById);

export default router;
