import { z } from "zod";
import { roomsService } from "../services/rooms.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const listQuery = z.object({
  activeOnly: z
    .enum(["true", "false", "1", "0"])
    .transform((v) => v === "true" || v === "1")
    .optional(),
});

export const roomsController = {
  list: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const result = await roomsService.list({ activeOnly: q.activeOnly ?? true });
    res.json(result);
  }),

  getById: asyncHandler(async (req, res) => {
    const room = await roomsService.getById(req.params.id!);
    res.json(room);
  }),
};
