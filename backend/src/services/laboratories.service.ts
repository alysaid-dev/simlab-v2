import { prisma } from "../config/database.js";
import { HttpError } from "../middleware/errorHandler.js";

const labSelect = {
  id: true,
  name: true,
  code: true,
  description: true,
  isActive: true,
  kepalaLabId: true,
  kepalaLab: {
    select: { id: true, displayName: true, email: true, waNumber: true },
  },
  laborans: {
    select: {
      userId: true,
      user: {
        select: { id: true, displayName: true, email: true, waNumber: true },
      },
    },
  },
  createdAt: true,
  updatedAt: true,
} as const;

export const laboratoriesService = {
  async list() {
    const items = await prisma.laboratory.findMany({
      orderBy: { name: "asc" },
      select: labSelect,
    });
    return { items, total: items.length };
  },

  async getById(id: string) {
    const lab = await prisma.laboratory.findUnique({
      where: { id },
      select: labSelect,
    });
    if (!lab) throw new HttpError(404, "Laboratorium tidak ditemukan");
    return lab;
  },

  async update(
    id: string,
    patch: {
      description?: string | null;
      isActive?: boolean;
      kepalaLabId?: string | null;
      laboranIds?: string[];
    },
  ) {
    const existing = await prisma.laboratory.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Laboratorium tidak ditemukan");

    return prisma.$transaction(async (tx) => {
      await tx.laboratory.update({
        where: { id },
        data: {
          description:
            patch.description !== undefined ? patch.description : undefined,
          isActive: patch.isActive ?? undefined,
          kepalaLabId:
            patch.kepalaLabId !== undefined ? patch.kepalaLabId : undefined,
        },
      });

      // Laboran assignment — replace-all saat `laboranIds` dikirim.
      if (patch.laboranIds !== undefined) {
        await tx.laboratoryLaboran.deleteMany({ where: { laboratoryId: id } });
        if (patch.laboranIds.length > 0) {
          await tx.laboratoryLaboran.createMany({
            data: patch.laboranIds.map((userId) => ({
              laboratoryId: id,
              userId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.laboratory.findUnique({ where: { id }, select: labSelect });
    });
  },
};
