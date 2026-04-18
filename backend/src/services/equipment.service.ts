import { EquipmentStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { HttpError } from "../middleware/errorHandler.js";

export const equipmentService = {
  async list(
    params: {
      skip?: number;
      take?: number;
      status?: EquipmentStatus;
      category?: string;
      search?: string;
    } = {}
  ) {
    const { skip = 0, take = 50, status, category, search } = params;
    const where: Prisma.EquipmentWhereInput = {
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(search
        ? { name: { contains: search, mode: "insensitive" } }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.equipment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.equipment.count({ where }),
    ]);
    return { items, total, skip, take };
  },

  async getById(id: string) {
    const equipment = await prisma.equipment.findUnique({ where: { id } });
    if (!equipment) throw new HttpError(404, "Peralatan tidak ditemukan");
    return equipment;
  },

  async create(input: Prisma.EquipmentCreateInput) {
    return prisma.equipment.create({ data: input });
  },

  async update(id: string, input: Prisma.EquipmentUpdateInput) {
    return prisma.equipment.update({ where: { id }, data: input });
  },

  async remove(id: string) {
    await prisma.equipment.delete({ where: { id } });
  },
};
