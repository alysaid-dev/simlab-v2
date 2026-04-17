import { z } from "zod";
import { usersService } from "../services/users.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const listQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  search: z.string().trim().min(1).optional(),
});

export const usersController = {
  list: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const result = await usersService.list(q);
    res.json(result);
  }),

  getById: asyncHandler(async (req, res) => {
    const user = await usersService.getById(req.params.id!);
    res.json(user);
  }),
};
