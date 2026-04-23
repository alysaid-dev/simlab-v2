import path from "node:path";
import fs from "node:fs";
import { GuideAudience } from "@prisma/client";
import multer from "multer";
import { z } from "zod";
import { guideImagesService, guidesService } from "../services/guides.service.js";
import { usersService } from "../services/users.service.js";
import { deriveRoles } from "../middleware/auth.js";
import type { Role } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ---------------------------------------------------------------------------
// Multer: upload gambar petunjuk (JPG/PNG/WebP/GIF, max 2 MB)
// ---------------------------------------------------------------------------

const UPLOAD_DIR = path.resolve("uploads/guides");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".bin";
    const stamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 10);
    cb(null, `gambar-${stamp}-${rand}${ext}`);
  },
});

export const guideImageUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new HttpError(400, "Format gambar harus JPG, PNG, WebP, atau GIF"));
      return;
    }
    cb(null, true);
  },
});

// ---------------------------------------------------------------------------
// Mapping role → audience untuk endpoint /my
// ---------------------------------------------------------------------------

function audienceForRoles(roles: Set<Role>): GuideAudience[] {
  const out: GuideAudience[] = [];
  if (roles.has("MAHASISWA")) out.push(GuideAudience.MAHASISWA);
  if (roles.has("DOSEN")) out.push(GuideAudience.DOSEN);
  if (roles.has("STAFF")) out.push(GuideAudience.STAFF);
  return out;
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/, "Slug hanya boleh huruf kecil, angka, dan tanda hubung");

const createBody = z.object({
  audience: z.nativeEnum(GuideAudience),
  slug: slugSchema,
  title: z.string().trim().min(1).max(150),
  contentMd: z.string().max(100_000).optional(),
  order: z.coerce.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});

const updateBody = z.object({
  slug: slugSchema.optional(),
  title: z.string().trim().min(1).max(150).optional(),
  contentMd: z.string().max(100_000).optional(),
  order: z.coerce.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});

const listQuery = z.object({
  audience: z.nativeEnum(GuideAudience).optional(),
  publishedOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export const guidesController = {
  /**
   * Reader endpoint — derive audience dari role caller. Hanya yang
   * isPublished=true. Super admin lihat semua audience yang dia derive
   * dari role-nya (biasanya tidak punya MAHASISWA/DOSEN/STAFF, jadi
   * pakai endpoint admin /api/guides untuk preview).
   */
  listMine: asyncHandler(async (req, res) => {
    const roles = deriveRoles(req.user!);
    const audiences = audienceForRoles(roles);
    if (audiences.length === 0) {
      res.json({ items: [] });
      return;
    }
    const items = await Promise.all(
      audiences.map((aud) =>
        guidesService.list({ audience: aud, publishedOnly: true }),
      ),
    );
    res.json({ items: items.flat() });
  }),

  /**
   * Reader endpoint per audience — caller harus punya role yang sesuai
   * (atau super admin). Mencegah staff intip petunjuk dosen, dst.
   */
  listByAudience: asyncHandler(async (req, res) => {
    const audience = z.nativeEnum(GuideAudience).parse(req.params.audience);
    const roles = deriveRoles(req.user!);
    const isSuperAdmin = roles.has("SUPER_ADMIN");
    const allowed =
      isSuperAdmin || audienceForRoles(roles).includes(audience);
    if (!allowed) {
      throw new HttpError(
        403,
        "Anda tidak berhak mengakses petunjuk untuk audience ini",
      );
    }
    const items = await guidesService.list({
      audience,
      publishedOnly: !isSuperAdmin,
    });
    res.json({ items });
  }),

  /** Admin endpoint — list semua, semua state. SUPER_ADMIN only via route. */
  listAll: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const items = await guidesService.list({
      audience: q.audience,
      publishedOnly: q.publishedOnly,
    });
    res.json({ items });
  }),

  getById: asyncHandler(async (req, res) => {
    const guide = await guidesService.getById(req.params.id!);
    res.json(guide);
  }),

  create: asyncHandler(async (req, res) => {
    const body = createBody.parse(req.body);
    const actor = await usersService.getByUid(req.user!.uid);
    const guide = await guidesService.create({
      ...body,
      updatedById: actor.id,
    });
    res.status(201).json(guide);
  }),

  update: asyncHandler(async (req, res) => {
    const body = updateBody.parse(req.body);
    const actor = await usersService.getByUid(req.user!.uid);
    const guide = await guidesService.update(req.params.id!, body, actor.id);
    res.json(guide);
  }),

  unpublish: asyncHandler(async (req, res) => {
    const actor = await usersService.getByUid(req.user!.uid);
    const guide = await guidesService.unpublish(req.params.id!, actor.id);
    res.json(guide);
  }),

  hardDelete: asyncHandler(async (req, res) => {
    await guidesService.hardDelete(req.params.id!);
    res.status(204).end();
  }),

  listRevisions: asyncHandler(async (req, res) => {
    const items = await guidesService.listRevisions(req.params.id!);
    res.json({ items });
  }),

  uploadImage: asyncHandler(async (req, res) => {
    const file = (req as typeof req & { file?: Express.Multer.File }).file;
    if (!file) {
      throw new HttpError(400, "File gambar wajib diunggah");
    }
    const actor = await usersService.getByUid(req.user!.uid);
    const record = await guideImagesService.record({
      filename: file.filename,
      path: path.relative(path.resolve("."), file.path),
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedById: actor.id,
    });
    res.status(201).json({
      ...record,
      url: `/api/guides/image/${encodeURIComponent(record.filename)}`,
    });
  }),

  serveImage: asyncHandler(async (req, res) => {
    const filename = req.params.filename!;
    // Defense in depth — block path traversal via normalize check.
    if (filename.includes("/") || filename.includes("..")) {
      throw new HttpError(400, "Nama file tidak valid");
    }
    const record = await guideImagesService.getByFilename(filename);
    if (!record) throw new HttpError(404, "Gambar tidak ditemukan");
    const abs = path.resolve(record.path);
    if (!abs.startsWith(UPLOAD_DIR)) {
      throw new HttpError(400, "Path gambar tidak valid");
    }
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(abs);
  }),
};
