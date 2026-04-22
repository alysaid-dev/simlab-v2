import { ConsumableTransactionType } from "@prisma/client";
import { z } from "zod";
import { consumablesService } from "../services/consumables.service.js";
import { usersService } from "../services/users.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { notifyConsumableHandoverToMahasiswa } from "../services/notification/index.js";

const listQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  search: z.string().trim().min(1).optional(),
  lowStock: z
    .enum(["true", "false", "1", "0"])
    .transform((v) => v === "true" || v === "1")
    .optional(),
});

const createBody = z.object({
  code: z.string().trim().min(1).nullable().optional(),
  name: z.string().min(1),
  unit: z.string().min(1),
  stock: z.number().int().min(0).optional(),
  minimumStock: z.number().int().min(0).optional(),
});

const updateBody = createBody.partial();

const txBody = z.object({
  type: z.nativeEnum(ConsumableTransactionType),
  quantity: z.number().int().min(1),
  notes: z.string().optional(),
});

const bulkBody = z.object({
  type: z.nativeEnum(ConsumableTransactionType).default("OUT"),
  recipientUid: z.string().trim().min(1).optional(),
  notes: z.string().trim().max(500).optional(),
  lines: z
    .array(
      z.object({
        consumableId: z.string().uuid(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
});

const txListQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
});

const allTxListQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(500).optional(),
  type: z.nativeEnum(ConsumableTransactionType).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().trim().min(1).optional(),
});

export const consumablesController = {
  list: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const result = await consumablesService.list(q);
    res.json(result);
  }),

  getById: asyncHandler(async (req, res) => {
    const item = await consumablesService.getById(req.params.id!);
    res.json(item);
  }),

  create: asyncHandler(async (req, res) => {
    const body = createBody.parse(req.body);
    const item = await consumablesService.create(body);
    res.status(201).json(item);
  }),

  update: asyncHandler(async (req, res) => {
    const body = updateBody.parse(req.body);
    const item = await consumablesService.update(req.params.id!, body);
    res.json(item);
  }),

  remove: asyncHandler(async (req, res) => {
    await consumablesService.remove(req.params.id!);
    res.status(204).end();
  }),

  listAllTransactions: asyncHandler(async (req, res) => {
    const q = allTxListQuery.parse(req.query);
    const result = await consumablesService.listAllTransactions(q);
    res.json(result);
  }),

  listTransactions: asyncHandler(async (req, res) => {
    const q = txListQuery.parse(req.query);
    const result = await consumablesService.listTransactions(
      req.params.id!,
      q,
    );
    res.json(result);
  }),

  createTransactionBulk: asyncHandler(async (req, res) => {
    const body = bulkBody.parse(req.body);
    const actor = await usersService.getByUid(req.user!.uid);

    let recipient: Awaited<ReturnType<typeof usersService.getByUid>> | null = null;
    if (body.type === "OUT" && body.recipientUid) {
      try {
        recipient = await usersService.getByUid(body.recipientUid);
      } catch {
        throw new HttpError(
          404,
          `Pengguna dengan ID "${body.recipientUid}" tidak ditemukan`,
        );
      }
    }

    // Prioritas note: user-provided notes > auto-generated dari recipient.
    const noteSuffix = body.notes
      ? body.notes
      : recipient
        ? `Diambil oleh ${recipient.displayName} (${recipient.uid})`
        : undefined;

    const rows = await consumablesService.createTransactionBulk({
      actorId: actor.id,
      type: body.type,
      lines: body.lines,
      notes: noteSuffix,
    });

    // Notif ke penerima (best-effort — tidak rollback kalau notif gagal).
    // Hanya untuk OUT yang punya recipient. IN tidak ada notif.
    if (recipient) {
      const totalItem = rows.reduce((sum, r) => sum + r.quantity, 0);
      const waktu = new Date().toLocaleString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      void notifyConsumableHandoverToMahasiswa(
        {
          email: recipient.email ?? undefined,
          phone: recipient.waNumber ?? undefined,
        },
        {
          namaMahasiswa: recipient.displayName,
          nim: recipient.uid,
          items: rows.map((r) => ({
            nama: r.name,
            jumlah: r.quantity,
            satuan: r.unit,
          })),
          totalItem,
          diserahkanOleh: actor.displayName,
          waktuTransaksi: waktu,
        },
      );
    }

    res.status(201).json({ items: rows, total: rows.length });
  }),

  createTransaction: asyncHandler(async (req, res) => {
    const body = txBody.parse(req.body);
    const actor = await usersService.getByUid(req.user!.uid);
    const tx = await consumablesService.createTransaction(req.params.id!, {
      userId: actor.id,
      quantity: body.quantity,
      type: body.type,
      notes: body.notes,
    });
    res.status(201).json(tx);
  }),
};
