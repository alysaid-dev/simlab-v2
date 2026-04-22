import { prisma } from "../config/database.js";

const SINGLETON_ID = "singleton";

export const appSettingsService = {
  async get() {
    return prisma.appSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID },
      update: {},
    });
  },

  async update(patch: {
    lateFeePerDayIdr?: number;
    lateFeeToleranceDays?: number;
  }) {
    return prisma.appSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...patch },
      update: patch,
    });
  },
};
