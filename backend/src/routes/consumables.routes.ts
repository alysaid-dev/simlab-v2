import { Router } from "express";
import { consumablesController } from "../controllers/consumables.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// Read — any authenticated user.
router.get("/", consumablesController.list);
// Global transactions list — taruh sebelum "/:id" supaya "transactions"
// tidak ke-match sebagai id UUID.
router.get(
  "/transactions",
  requireRole("LABORAN", "KEPALA_LAB", "SUPER_ADMIN"),
  consumablesController.listAllTransactions,
);
router.get("/:id", consumablesController.getById);
router.get("/:id/transactions", consumablesController.listTransactions);

// Write — LABORAN ke atas.
router.post(
  "/",
  requireRole("LABORAN", "KEPALA_LAB", "SUPER_ADMIN"),
  consumablesController.create,
);
router.patch(
  "/:id",
  requireRole("LABORAN", "KEPALA_LAB", "SUPER_ADMIN"),
  consumablesController.update,
);
router.post(
  "/:id/transactions",
  requireRole("LABORAN", "KEPALA_LAB", "SUPER_ADMIN"),
  consumablesController.createTransaction,
);
// Bulk — satu transaksi atomik untuk banyak barang + notif ke penerima.
router.post(
  "/transactions/bulk",
  requireRole("LABORAN", "KEPALA_LAB", "SUPER_ADMIN"),
  consumablesController.createTransactionBulk,
);

// Delete — ADMIN ke atas.
router.delete(
  "/:id",
  requireRole("SUPER_ADMIN"),
  consumablesController.remove,
);

export default router;
