import { ConsumableTransactionType, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { HttpError } from "../middleware/errorHandler.js";

export const consumablesService = {
  async list(params: {
    skip?: number;
    take?: number;
    search?: string;
    lowStock?: boolean;
  } = {}) {
    const { skip = 0, take = 50, search, lowStock } = params;
    const where: Prisma.ConsumableWhereInput = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const items = await prisma.consumable.findMany({
      where,
      skip,
      take,
      orderBy: { name: "asc" },
    });
    const filtered = lowStock
      ? items.filter((c) => c.stock < c.minimumStock)
      : items;
    return {
      items: filtered,
      total: lowStock ? filtered.length : await prisma.consumable.count({ where }),
      skip,
      take,
    };
  },

  async getById(id: string) {
    const item = await prisma.consumable.findUnique({ where: { id } });
    if (!item) throw new HttpError(404, "Barang tidak ditemukan");
    return item;
  },

  async create(input: {
    code?: string | null;
    name: string;
    unit: string;
    stock?: number;
    minimumStock?: number;
  }) {
    return prisma.consumable.create({
      data: {
        code: input.code ?? null,
        name: input.name,
        unit: input.unit,
        stock: input.stock ?? 0,
        minimumStock: input.minimumStock ?? 0,
      },
    });
  },

  async update(
    id: string,
    input: Partial<{
      code: string | null;
      name: string;
      unit: string;
      stock: number;
      minimumStock: number;
    }>,
  ) {
    return prisma.consumable.update({ where: { id }, data: input });
  },

  async remove(id: string) {
    await prisma.consumable.delete({ where: { id } });
  },

  async listTransactions(consumableId: string, params: { skip?: number; take?: number } = {}) {
    const { skip = 0, take = 50 } = params;
    const where: Prisma.ConsumableTransactionWhereInput = { consumableId };
    const [items, total] = await Promise.all([
      prisma.consumableTransaction.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, displayName: true, uid: true } },
        },
      }),
      prisma.consumableTransaction.count({ where }),
    ]);
    return { items, total, skip, take };
  },

  // Global list — semua transaksi consumable lintas barang. Dipakai modul
  // Transaksi Habis Pakai tab "Riwayat". Support filter rentang tanggal,
  // tipe, dan pencarian teks (nama/uid user, notes, nama barang).
  async listAllTransactions(
    params: {
      skip?: number;
      take?: number;
      type?: ConsumableTransactionType;
      dateFrom?: Date;
      dateTo?: Date;
      search?: string;
    } = {},
  ) {
    const { skip = 0, take = 100, type, dateFrom, dateTo, search } = params;
    const where: Prisma.ConsumableTransactionWhereInput = {
      ...(type ? { type } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { notes: { contains: search, mode: "insensitive" } },
              { user: { displayName: { contains: search, mode: "insensitive" } } },
              { user: { uid: { contains: search, mode: "insensitive" } } },
              { consumable: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.consumableTransaction.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, displayName: true, uid: true } },
          consumable: { select: { id: true, name: true, unit: true } },
        },
      }),
      prisma.consumableTransaction.count({ where }),
    ]);
    return { items, total, skip, take };
  },

  /**
   * Catat beberapa transaksi IN (penerimaan) atau OUT (pengeluaran) dalam
   * satu transaksi DB — dipakai modul Transaksi Habis Pakai (OUT) dan
   * Terima Barang (IN). Gagal di salah satu baris → seluruh set di-rollback.
   */
  async createTransactionBulk(input: {
    actorId: string;
    type: ConsumableTransactionType;
    lines: Array<{ consumableId: string; quantity: number }>;
    notes?: string;
  }) {
    if (input.lines.length === 0) {
      throw new HttpError(400, "Tidak ada barang yang dipilih");
    }
    return prisma.$transaction(async (tx) => {
      const created: Array<{
        id: string;
        consumableId: string;
        quantity: number;
        name: string;
        unit: string;
      }> = [];
      for (const line of input.lines) {
        if (line.quantity <= 0) {
          throw new HttpError(400, "Jumlah transaksi harus lebih dari 0");
        }
        const consumable = await tx.consumable.findUnique({
          where: { id: line.consumableId },
        });
        if (!consumable) {
          throw new HttpError(
            404,
            `Barang ${line.consumableId} tidak ditemukan`,
          );
        }
        const delta =
          input.type === ConsumableTransactionType.OUT
            ? -line.quantity
            : line.quantity;
        const newStock = consumable.stock + delta;
        if (newStock < 0) {
          throw new HttpError(
            400,
            `Stok ${consumable.name} tidak mencukupi (tersisa ${consumable.stock} ${consumable.unit})`,
          );
        }
        await tx.consumable.update({
          where: { id: line.consumableId },
          data: { stock: newStock },
        });
        const row = await tx.consumableTransaction.create({
          data: {
            consumableId: line.consumableId,
            userId: input.actorId,
            quantity: line.quantity,
            type: input.type,
            notes: input.notes,
          },
        });
        created.push({
          id: row.id,
          consumableId: line.consumableId,
          quantity: line.quantity,
          name: consumable.name,
          unit: consumable.unit,
        });
      }
      return created;
    });
  },

  /**
   * Catat transaksi IN (restock) atau OUT (pengeluaran) — sekaligus update
   * stok di Consumable dalam satu transaksi DB agar konsisten.
   */
  async createTransaction(
    consumableId: string,
    input: {
      userId: string;
      quantity: number;
      type: ConsumableTransactionType;
      notes?: string;
    },
  ) {
    if (input.quantity <= 0) {
      throw new HttpError(400, "Jumlah transaksi harus lebih dari 0");
    }

    return prisma.$transaction(async (tx) => {
      const consumable = await tx.consumable.findUnique({
        where: { id: consumableId },
      });
      if (!consumable) throw new HttpError(404, "Barang tidak ditemukan");

      const delta =
        input.type === ConsumableTransactionType.OUT
          ? -input.quantity
          : input.quantity;
      const newStock = consumable.stock + delta;
      if (newStock < 0) {
        throw new HttpError(
          400,
          `Stok tidak mencukupi (tersisa ${consumable.stock} ${consumable.unit})`,
        );
      }

      await tx.consumable.update({
        where: { id: consumableId },
        data: { stock: newStock },
      });

      return tx.consumableTransaction.create({
        data: {
          consumableId,
          userId: input.userId,
          quantity: input.quantity,
          type: input.type,
          notes: input.notes,
        },
        include: {
          user: { select: { id: true, displayName: true, uid: true } },
        },
      });
    });
  },
};
