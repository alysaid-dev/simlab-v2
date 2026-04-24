import { AssetCondition, EquipmentStatus } from "@prisma/client";
import { z } from "zod";
import { equipmentService } from "../services/equipment.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const listQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  status: z.nativeEnum(EquipmentStatus).optional(),
  category: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
});

const createBody = z.object({
  code: z.string().trim().min(1).optional(),
  name: z.string().min(1),
  category: z.string().optional(),
  stock: z.number().int().min(0).optional(),
  condition: z.nativeEnum(AssetCondition).optional(),
  status: z.nativeEnum(EquipmentStatus).optional(),
  laboratoryId: z.string().uuid().optional(),
});

const updateBody = createBody.partial();

export const equipmentController = {
  list: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const result = await equipmentService.list(q);
    res.json(result);
  }),

  getById: asyncHandler(async (req, res) => {
    const equipment = await equipmentService.getById(req.params.id!);
    res.json(equipment);
  }),

  create: asyncHandler(async (req, res) => {
    const body = createBody.parse(req.body);
    const { laboratoryId, ...rest } = body;
    const equipment = await equipmentService.create({
      ...rest,
      ...(laboratoryId
        ? { laboratory: { connect: { id: laboratoryId } } }
        : {}),
    });
    res.status(201).json(equipment);
  }),

  update: asyncHandler(async (req, res) => {
    const body = updateBody.parse(req.body);
    const { laboratoryId, ...rest } = body;
    const equipment = await equipmentService.update(req.params.id!, {
      ...rest,
      ...(laboratoryId
        ? { laboratory: { connect: { id: laboratoryId } } }
        : {}),
    });
    res.json(equipment);
  }),

  remove: asyncHandler(async (req, res) => {
    await equipmentService.remove(req.params.id!);
    res.status(204).end();
  }),
};
