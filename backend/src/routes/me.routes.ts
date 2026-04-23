import { Router } from "express";
import { meController } from "../controllers/me.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/active-items", meController.activeItems);

// Transaksi Saya — aktif + selesai, scope by userId (consumables by notes).
router.get("/transactions/laptops", meController.transaksiLaptops);
router.get("/transactions/equipment", meController.transaksiEquipment);
router.get("/transactions/rooms", meController.transaksiRooms);
router.get("/transactions/consumables", meController.transaksiConsumables);

export default router;
