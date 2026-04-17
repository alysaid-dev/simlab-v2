import { prisma } from "../config/database.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { ShibbolethUser } from "../middleware/auth.js";

export const usersService = {
  /**
   * Lazy provisioning — upsert a user row from their Shibboleth attributes.
   * Called on login so the DB always has a record matching the SSO identity.
   */
  async upsertFromShibboleth(shib: ShibbolethUser) {
    return prisma.user.upsert({
      where: { uid: shib.uid },
      create: {
        uid: shib.uid,
        email: shib.email,
        displayName: shib.displayName,
        isActive: true,
      },
      update: {
        email: shib.email,
        displayName: shib.displayName,
      },
    });
  },

  async list(params: { skip?: number; take?: number; search?: string } = {}) {
    const { skip = 0, take = 50, search } = params;
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { displayName: { contains: search, mode: "insensitive" as const } },
            { uid: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { roles: { include: { role: true } } },
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total, skip, take };
  },

  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new HttpError(404, "Pengguna tidak ditemukan");
    return user;
  },

  async getByUid(uid: string) {
    const user = await prisma.user.findUnique({
      where: { uid },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new HttpError(404, "Pengguna tidak ditemukan");
    return user;
  },
};
