import { AssetStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { HttpError } from "../middleware/errorHandler.js";

export const assetsService = {
  async list(params: {
    skip?: number;
    take?: number;
    status?: AssetStatus;
    search?: string;
  } = {}) {
    const { skip = 0, take = 50, status, search } = params;
    const where: Prisma.AssetWhereInput = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.asset.count({ where }),
    ]);
    return { items, total, skip, take };
  },

  async getById(id: string) {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new HttpError(404, "Aset tidak ditemukan");
    return asset;
  },

  async create(input: Prisma.AssetCreateInput) {
    return prisma.asset.create({ data: input });
  },

  async update(id: string, input: Prisma.AssetUpdateInput) {
    return prisma.asset.update({ where: { id }, data: input });
  },

  async remove(id: string) {
    await prisma.asset.delete({ where: { id } });
  },
};
