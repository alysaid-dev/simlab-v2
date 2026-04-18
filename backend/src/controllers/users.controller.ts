import { z } from "zod";
import { usersService } from "../services/users.service.js";
import { hasRoleAtLeast } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const listQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  search: z.string().trim().min(1).optional(),
});

export const usersController = {
  // Route guard restricts this to LABORAN and above.
  list: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const result = await usersService.list(q);
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
