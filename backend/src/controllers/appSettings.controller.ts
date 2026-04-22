import { z } from "zod";
import { appSettingsService } from "../services/appSettings.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const patchBody = z
  .object({
    lateFeePerDayIdr: z.number().int().nonnegative().max(100_000_000).optional(),
    lateFeeToleranceDays: z.number().int().min(0).max(365).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Minimal satu field harus diisi",
  });

export const appSettingsController = {
  get: asyncHandler(async (_req, res) => {
    const settings = await appSettingsService.get();
    res.json(settings);
  }),

  update: asyncHandler(async (req, res) => {
    const patch = patchBody.parse(req.body);
    const settings = await appSettingsService.update(patch);
    res.json(settings);
  }),
};
