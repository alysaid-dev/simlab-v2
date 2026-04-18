import { verifyService } from "../services/verify.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyController = {
  verify: asyncHandler(async (req, res) => {
    const hash = req.params.hash;
    if (!hash) {
      res.json({ valid: false });
      return;
    }
    const result = await verifyService.verify(hash);
    res.json(result);
  }),
};
