import { Router } from "express";
import { historyController } from "../controllers/history.controller.js";
import { requireAuth, requireRoleAtLeast } from "../middleware/auth.js";

const router = Router();

// Seluruh modul History hanya untuk Kepala Lab & Super Admin.
router.use(requireAuth);
router.use(requireRoleAtLeast("KEPALA_LAB"));

router.get("/loans/ta", historyController.listLoansTA);
router.get("/loans/practicum", historyController.listLoansPracticum);
router.get("/loans/:id/timeline", historyController.loanTimeline);

router.get("/clearances", historyController.listClearances);
router.get("/clearances/:id/timeline", historyController.clearanceTimeline);

router.get("/reservations", historyController.listReservations);
router.get("/reservations/:id/timeline", historyController.reservationTimeline);

router.get("/consumables/outgoing", historyController.listConsumableOutgoing);

export default router;
