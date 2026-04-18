import { RoleName } from "@prisma/client";
import { z } from "zod";
import { usersService } from "../services/users.service.js";
import { hasRoleAtLeast } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const listQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  search: z.string().trim().min(1).optional(),
  role: z.nativeEnum(RoleName).optional(),
});

const createBody = z.object({
  uid: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
  displayName: z.string().trim().min(1),
  waNumber: z.string().trim().min(6).optional(),
  roles: z.array(z.nativeEnum(RoleName)).default([]),
});

const updateBody = z.object({
  displayName: z.string().trim().min(1).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  waNumber: z.string().trim().min(6).nullable().optional(),
  isActive: z.boolean().optional(),
});

const rolesBody = z.object({
  roles: z.array(z.nativeEnum(RoleName)),
});

export const usersController = {
  // Akses: LABORAN+ untuk list bebas; user biasa hanya boleh ?role=DOSEN
  // (untuk dropdown dosen pembimbing di form peminjaman laptop).
  list: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    if (q.role !== RoleName.DOSEN && !hasRoleAtLeast(req.user!, "LABORAN")) {
      throw new HttpError(
        403,
        "Akses ditolak. Dibutuhkan peran minimum: LABORAN",
      );
    }
    const result = await usersService.list(q);
    res.json(result);
  }),

  // GET /users/me/obligations — cek tanggungan aktif user sendiri.
  // Digunakan sebagai prasyarat sebelum mengajukan surat bebas lab.
  obligations: asyncHandler(async (req, res) => {
    const requester = await usersService.getByUid(req.user!.uid);
    const result = await usersService.getObligations(requester.id);
    res.json(result);
  }),

  getById: asyncHandler(async (req, res) => {
    const requestedId = req.params.id!;
    const requester = await usersService.getByUid(req.user!.uid);
    const isSelf = requester.id === requestedId;
    if (!isSelf && !hasRoleAtLeast(req.user!, "LABORAN")) {
      throw new HttpError(403, "Anda hanya dapat melihat profil Anda sendiri");
    }
    const user = await usersService.getById(requestedId);
    res.json(user);
  }),

  // Route guard: ADMIN+. Upsert by email — email unik, aman dipanggil lagi
  // untuk user yang sudah ada.
  create: asyncHandler(async (req, res) => {
    const body = createBody.parse(req.body);
    const user = await usersService.createOrUpsert(body);
    res.status(201).json(user);
  }),

  // Route guard: ADMIN+. Tidak menyentuh roles — untuk itu pakai PUT
  // /users/:id/roles.
  update: asyncHandler(async (req, res) => {
    const body = updateBody.parse(req.body);
    const user = await usersService.update(req.params.id!, body);
    res.json(user);
  }),

  // Route guard: ADMIN+. Soft delete — set isActive=false.
  remove: asyncHandler(async (req, res) => {
    const user = await usersService.softDelete(req.params.id!);
    res.json(user);
  }),

  // Route guard: ADMIN+. Replace daftar roles user.
  replaceRoles: asyncHandler(async (req, res) => {
    const body = rolesBody.parse(req.body);
    const user = await usersService.replaceRoles(req.params.id!, body.roles);
    res.json(user);
  }),
};
