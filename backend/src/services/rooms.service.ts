import { prisma } from "../config/database.js";
import { HttpError } from "../middleware/errorHandler.js";

export const roomsService = {
  async list(params: { activeOnly?: boolean } = {}) {
    const { activeOnly = true } = params;
    const items = await prisma.room.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: "asc" },
    });
    return { items, total: items.length };
  },

  async getById(id: string) {
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) throw new HttpError(404, "Ruangan tidak ditemukan");
    return room;
  },
};
