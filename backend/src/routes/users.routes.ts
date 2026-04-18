import { Router } from "express";
import { usersController } from "../controllers/users.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
// Guard role diperiksa di controller: ?role=DOSEN terbuka untuk semua user
// (buat dropdown), selain itu butuh LABORAN+.
router.get("/", usersController.list);
// Specific path before `/:id` — otherwise "me" would be matched as an id.
router.get("/me/obligations", usersController.obligations);
router.get("/:id", usersController.getById);

export default router;
