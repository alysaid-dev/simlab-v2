import { LoanType } from "@prisma/client";
import { z } from "zod";
import { historyService } from "../services/history.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const listQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
});

export const historyController = {
  listLoansTA: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const result = await historyService.listLoans({ ...q, type: LoanType.TA });
    res.json(result);
  }),

  listLoansPracticum: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const result = await historyService.listLoans({
      ...q,
      type: LoanType.PRACTICUM,
    });
    res.json(result);
  }),

  listClearances: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const result = await historyService.listClearances(q);
    res.json(result);
  }),

  listReservations: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const result = await historyService.listReservations(q);
    res.json(result);
  }),

  listConsumableOutgoing: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const result = await historyService.listConsumableOutgoing(q);
    res.json(result);
  }),

  loanTimeline: asyncHandler(async (req, res) => {
    const result = await historyService.loanTimeline(req.params.id!);
    res.json(result);
  }),

  clearanceTimeline: asyncHandler(async (req, res) => {
    const result = await historyService.clearanceTimeline(req.params.id!);
    res.json(result);
  }),

  reservationTimeline: asyncHandler(async (req, res) => {
    const result = await historyService.reservationTimeline(req.params.id!);
    res.json(result);
  }),
};
