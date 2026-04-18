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
};
