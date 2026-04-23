import { Router } from "express";
import {
  guideImageUpload,
  guidesController,
} from "../controllers/guides.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Image serve — PUBLIC (gambar petunjuk dirender lewat <img src>, tidak
// boleh butuh auth headers). File disajikan via DB lookup, jadi enumerasi
// random filename juga tidak meleak data sensitif.
router.get("/image/:filename", guidesController.serveImage);

router.use(requireAuth);

// Reader endpoints — siapa pun yang login.
router.get("/my", guidesController.listMine);
router.get("/audience/:audience", guidesController.listByAudience);

// Admin endpoints — SUPER_ADMIN only.
router.get("/", requireRole("SUPER_ADMIN"), guidesController.listAll);
router.get("/:id", requireRole("SUPER_ADMIN"), guidesController.getById);
router.get(
  "/:id/revisions",
  requireRole("SUPER_ADMIN"),
  guidesController.listRevisions,
);
router.post("/", requireRole("SUPER_ADMIN"), guidesController.create);
router.patch("/:id", requireRole("SUPER_ADMIN"), guidesController.update);
router.delete(
  "/:id/publish",
  requireRole("SUPER_ADMIN"),
  guidesController.unpublish,
);
router.delete("/:id", requireRole("SUPER_ADMIN"), guidesController.hardDelete);

router.post(
  "/image",
  requireRole("SUPER_ADMIN"),
  guideImageUpload.single("image"),
  guidesController.uploadImage,
);

export default router;
