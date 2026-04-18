import { LoanStatus, LoanType } from "@prisma/client";
import { z } from "zod";
import { loansService } from "../services/loans.service.js";
import { usersService } from "../services/users.service.js";
import { hasRoleAtLeast } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const listQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  status: z.nativeEnum(LoanStatus).optional(),
  userId: z.string().uuid().optional(),
});

// `userId` is intentionally NOT in the request body — it's resolved from the
// authenticated session so a user cannot create a loan on behalf of someone
// else. Admins needing that capability should use a dedicated endpoint.
const createBody = z.object({
  assetId: z.string().uuid(),
  lecturerId: z.string().uuid().optional(),
  type: z.nativeEnum(LoanType),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  thesisTitle: z.string().optional(),
  thesisAbstract: z.string().optional(),
  notes: z.string().optional(),
});

const statusBody = z.object({
  status: z.nativeEnum(LoanStatus),
});

export const loansController = {
  list: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const result = await loansService.list(q);
    res.json(result);
  }),

  getById: asyncHandler(async (req, res) => {
    const loan = await loansService.getById(req.params.id!);
    const requester = await usersService.getByUid(req.user!.uid);
    const isOwner = loan.userId === requester.id;
    if (!isOwner && !hasRoleAtLeast(req.user!, "LABORAN")) {
      throw new HttpError(403, "Anda tidak berhak melihat peminjaman ini");
    }
    res.json(loan);
  }),

  create: asyncHandler(async (req, res) => {
    const body = createBody.parse(req.body);
    const requester = await usersService.getByUid(req.user!.uid);
    const loan = await loansService.create({ ...body, userId: requester.id });
    res.status(201).json(loan);
  }),

  // Route guard restricts this to LABORAN / KEPALA_LAB / ADMIN / SUPER_ADMIN.
  updateStatus: asyncHandler(async (req, res) => {
    const { status } = statusBody.parse(req.body);
    const loan = await loansService.updateStatus(req.params.id!, status);
    res.json(loan);
  }),
};
