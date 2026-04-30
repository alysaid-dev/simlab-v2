import { LoanType } from "@prisma/client";
import type { Request } from "express";
import { z } from "zod";
import { deriveRoles } from "../middleware/auth.js";
import {
  historyService,
  type HistoryScope,
} from "../services/history.service.js";
import { usersService } from "../services/users.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const listQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
});

// Resolve Shibboleth uid → User.id dan role flags untuk scoping history.
// Satu DB round-trip per request — dipakai bersama oleh list & timeline.
async function deriveScope(req: Request): Promise<HistoryScope> {
  const shib = req.user!;
  const roles = deriveRoles(shib);
  const user = await usersService.getByUid(shib.uid);
  return {
    // KEPALA_LAB dulu punya view global atas modul History (lihat semua
    // transaksi di lab-nya). Diperlakukan sama dengan SUPER_ADMIN di sini
    // → bypass scoping filter, perilaku lama preserved saat modul
    // di-repurpose jadi "Riwayat Saya" untuk mahasiswa.
    isAdmin: roles.has("SUPER_ADMIN") || roles.has("KEPALA_LAB"),
    isLaboran: roles.has("LABORAN"),
    userId: user.id,
    userUid: shib.uid,
  };
}

export const historyController = {
  listLoansTA: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const scope = await deriveScope(req);
    const result = await historyService.listLoans({
      ...q,
      type: LoanType.TA,
      scope,
    });
    res.json(result);
  }),

  listLoansPracticum: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const scope = await deriveScope(req);
    const result = await historyService.listLoans({
      ...q,
      type: LoanType.PRACTICUM,
      scope,
    });
    res.json(result);
  }),

  listClearances: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const scope = await deriveScope(req);
    const result = await historyService.listClearances({ ...q, scope });
    res.json(result);
  }),

  listReservations: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const scope = await deriveScope(req);
    const result = await historyService.listReservations({ ...q, scope });
    res.json(result);
  }),

  listConsumableOutgoing: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const scope = await deriveScope(req);
    const result = await historyService.listConsumableOutgoing({ ...q, scope });
    res.json(result);
  }),

  listEquipmentLoans: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const scope = await deriveScope(req);
    const result = await historyService.listEquipmentLoans({ ...q, scope });
    res.json(result);
  }),

  loanTimeline: asyncHandler(async (req, res) => {
    const scope = await deriveScope(req);
    const result = await historyService.loanTimeline(req.params.id!, scope);
    res.json(result);
  }),

  clearanceTimeline: asyncHandler(async (req, res) => {
    const scope = await deriveScope(req);
    const result = await historyService.clearanceTimeline(
      req.params.id!,
      scope,
    );
    res.json(result);
  }),

  reservationTimeline: asyncHandler(async (req, res) => {
    const scope = await deriveScope(req);
    const result = await historyService.reservationTimeline(
      req.params.id!,
      scope,
    );
    res.json(result);
  }),
};
