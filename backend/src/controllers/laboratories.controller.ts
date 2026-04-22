import { z } from "zod";
import { laboratoriesService } from "../services/laboratories.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const patchBody = z.object({
  description: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  kepalaLabId: z.string().uuid().nullable().optional(),
  laboranIds: z.array(z.string().uuid()).optional(),
});

export const laboratoriesController = {
  list: asyncHandler(async (_req, res) => {
    const result = await laboratoriesService.list();
    res.json(result);
  }),

  getById: asyncHandler(async (req, res) => {
    const lab = await laboratoriesService.getById(req.params.id!);
    res.json(lab);
  }),

  update: asyncHandler(async (req, res) => {
    const patch = patchBody.parse(req.body);
    const lab = await laboratoriesService.update(req.params.id!, patch);
    res.json(lab);
  }),
};
