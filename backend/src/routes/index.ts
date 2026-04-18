import { Router } from "express";
import authRoutes from "./auth.routes.js";
import usersRoutes from "./users.routes.js";
import assetsRoutes from "./assets.routes.js";
import loansRoutes from "./loans.routes.js";
import equipmentRoutes from "./equipment.routes.js";
import equipmentLoansRoutes from "./equipmentLoans.routes.js";
import clearancesRoutes from "./clearances.routes.js";
// ⚠️ TEST-ONLY — remove before production.
import testRoutes from "./test.routes.js";

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
// ⚠️ TEST-ONLY — remove before production.
router.use("/test", testRoutes);

export default router;
