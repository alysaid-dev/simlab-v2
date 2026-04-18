import { Router } from "express";
import { verifyController } from "../controllers/verify.controller.js";

// PUBLIC route — QR verification must work for anyone scanning the code.
// No requireAuth applied here (parent router doesn't apply auth either).
const router = Router();

router.get("/:hash", verifyController.verify);

export default router;
