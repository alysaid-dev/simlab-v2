import { Router } from "express";
import { loansController } from "../controllers/loans.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", loansController.list);
router.get("/:id", loansController.getById);
router.post("/", loansController.create);
router.patch("/:id/status", loansController.updateStatus);

export default router;
