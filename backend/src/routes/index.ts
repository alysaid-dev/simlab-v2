import { Router } from "express";
import authRoutes from "./auth.routes.js";
import usersRoutes from "./users.routes.js";
import assetsRoutes from "./assets.routes.js";
import loansRoutes from "./loans.routes.js";
import equipmentRoutes from "./equipment.routes.js";
import equipmentLoansRoutes from "./equipmentLoans.routes.js";
import clearancesRoutes from "./clearances.routes.js";
import consumablesRoutes from "./consumables.routes.js";
import roomsRoutes from "./rooms.routes.js";
import reservationsRoutes from "./reservations.routes.js";
import historyRoutes from "./history.routes.js";
import appSettingsRoutes from "./appSettings.routes.js";
import laboratoriesRoutes from "./laboratories.routes.js";
import meRoutes from "./me.routes.js";
import verifyRoutes from "./verify.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/assets", assetsRoutes);
router.use("/loans", loansRoutes);
router.use("/equipment", equipmentRoutes);
router.use("/equipment-loans", equipmentLoansRoutes);
router.use("/clearances", clearancesRoutes);
router.use("/consumables", consumablesRoutes);
router.use("/rooms", roomsRoutes);
router.use("/reservations", reservationsRoutes);
router.use("/history", historyRoutes);
router.use("/app-settings", appSettingsRoutes);
router.use("/laboratories", laboratoriesRoutes);
router.use("/me", meRoutes);
// PUBLIC endpoint — QR verification. Must stay OUTSIDE any auth guard.
router.use("/verify", verifyRoutes);

export default router;
