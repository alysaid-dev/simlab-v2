import { Router } from "express";
import { historyController } from "../controllers/history.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Akses: semua user terautentikasi. Scoping per-role ditangani di
// controller/service — MAHASISWA/DOSEN/STAFF/LABORAN hanya melihat
// riwayat miliknya; LABORAN ditambah record yang dia handle;
// SUPER_ADMIN melihat semua.
router.use(requireAuth);

router.get("/loans/ta", historyController.listLoansTA);
router.get("/loans/practicum", historyController.listLoansPracticum);
router.get("/loans/equipment", historyController.listEquipmentLoans);
router.get("/loans/:id/timeline", historyController.loanTimeline);

router.get("/clearances", historyController.listClearances);
router.get("/clearances/:id/timeline", historyController.clearanceTimeline);

router.get("/reservations", historyController.listReservations);
router.get("/reservations/:id/timeline", historyController.reservationTimeline);

router.get("/consumables/outgoing", historyController.listConsumableOutgoing);

export default router;
