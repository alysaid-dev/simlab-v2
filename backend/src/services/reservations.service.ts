import { Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "../config/database.js";
import { HttpError } from "../middleware/errorHandler.js";

const listInclude = {
  user: { select: { id: true, displayName: true, uid: true, email: true } },
  room: { select: { id: true, name: true, code: true } },
  checker: { select: { id: true, displayName: true } },
  approver: { select: { id: true, displayName: true } },
} satisfies Prisma.RoomReservationInclude;

export const reservationsService = {
  async list(params: {
    skip?: number;
    take?: number;
    status?: ReservationStatus;
    userId?: string;
  } = {}) {
    const { skip = 0, take = 50, status, userId } = params;
    const where: Prisma.RoomReservationWhereInput = {
      ...(status ? { status } : {}),
      ...(userId ? { userId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.roomReservation.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: listInclude,
      }),
      prisma.roomReservation.count({ where }),
    ]);
    return { items, total, skip, take };
  },

  async getById(id: string) {
    const reservation = await prisma.roomReservation.findUnique({
      where: { id },
      include: listInclude,
    });
    if (!reservation) throw new HttpError(404, "Reservasi tidak ditemukan");
    return reservation;
  },

  async create(input: {
    userId: string;
    roomId: string;
    purpose: string;
    startTime: Date;
    endTime: Date;
    notes?: string;
    suratPermohonanPath?: string;
  }) {
    if (input.endTime <= input.startTime) {
      throw new HttpError(400, "Waktu selesai harus setelah waktu mulai");
    }
    return prisma.roomReservation.create({
      data: {
        userId: input.userId,
        roomId: input.roomId,
        purpose: input.purpose,
        startTime: input.startTime,
        endTime: input.endTime,
        notes: input.notes,
        suratPermohonanPath: input.suratPermohonanPath,
      },
      include: listInclude,
    });
  },

  /**
   * Transition the reservation to a new status. Captures the actor for
   * CHECKED (laboran) / APPROVED|REJECTED (kepala lab) stages — used for
   * audit + for filling notification fields.
   */
  async updateStatus(id: string, status: ReservationStatus, actorId: string) {
    const data: Prisma.RoomReservationUpdateInput = { status };
    if (status === ReservationStatus.CHECKED) {
      data.checker = { connect: { id: actorId } };
      data.checkedAt = new Date();
    } else if (status === ReservationStatus.APPROVED) {
      data.approver = { connect: { id: actorId } };
      data.approvedAt = new Date();
    }
    return prisma.roomReservation.update({
      where: { id },
      data,
      include: listInclude,
    });
  },
};
