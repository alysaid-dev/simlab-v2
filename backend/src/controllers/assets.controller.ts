import { AssetCondition, AssetStatus } from "@prisma/client";
import { z } from "zod";
import { assetsService } from "../services/assets.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const listQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  search: z.string().trim().min(1).optional(),
});

const createBody = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  condition: z.nativeEnum(AssetCondition).optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  qrHash: z.string().optional(),
  laboratoryId: z.string().uuid().optional(),
});

const updateBody = createBody.partial();

export const assetsController = {
  list: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const result = await assetsService.list(q);
    res.json(result);
  }),

  getById: asyncHandler(async (req, res) => {
    const asset = await assetsService.getById(req.params.id!);
    res.json(asset);
  }),

  create: asyncHandler(async (req, res) => {
    const body = createBody.parse(req.body);
    const { laboratoryId, ...rest } = body;
    const asset = await assetsService.create({
      ...rest,
      ...(laboratoryId
        ? { laboratory: { connect: { id: laboratoryId } } }
        : {}),
    });
    res.status(201).json(asset);
  }),

  update: asyncHandler(async (req, res) => {
    const body = updateBody.parse(req.body);
    const { laboratoryId, ...rest } = body;
    const asset = await assetsService.update(req.params.id!, {
      ...rest,
      ...(laboratoryId
        ? { laboratory: { connect: { id: laboratoryId } } }
        : {}),
    });
    res.json(asset);
  }),

  remove: asyncHandler(async (req, res) => {
    await assetsService.remove(req.params.id!);
    res.status(204).end();
  }),
};
