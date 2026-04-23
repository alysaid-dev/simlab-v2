import { GuideAudience, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { HttpError } from "../middleware/errorHandler.js";

const listSelect = {
  id: true,
  audience: true,
  slug: true,
  title: true,
  contentMd: true,
  order: true,
  isPublished: true,
  updatedAt: true,
  createdAt: true,
  updatedBy: { select: { id: true, displayName: true } },
} satisfies Prisma.GuideSelect;

export const guidesService = {
  async list(params: { audience?: GuideAudience; publishedOnly?: boolean } = {}) {
    const { audience, publishedOnly = false } = params;
    const where: Prisma.GuideWhereInput = {
      ...(audience ? { audience } : {}),
      ...(publishedOnly ? { isPublished: true } : {}),
    };
    return prisma.guide.findMany({
      where,
      orderBy: [{ audience: "asc" }, { order: "asc" }, { title: "asc" }],
      select: listSelect,
    });
  },

  async getById(id: string) {
    const guide = await prisma.guide.findUnique({
      where: { id },
      select: listSelect,
    });
    if (!guide) throw new HttpError(404, "Petunjuk tidak ditemukan");
    return guide;
  },

  async getBySlug(audience: GuideAudience, slug: string) {
    const guide = await prisma.guide.findUnique({
      where: { audience_slug: { audience, slug } },
      select: listSelect,
    });
    if (!guide) throw new HttpError(404, "Petunjuk tidak ditemukan");
    return guide;
  },

  async create(input: {
    audience: GuideAudience;
    slug: string;
    title: string;
    contentMd?: string;
    order?: number;
    isPublished?: boolean;
    updatedById: string;
  }) {
    try {
      return await prisma.guide.create({
        data: {
          audience: input.audience,
          slug: input.slug,
          title: input.title,
          contentMd: input.contentMd ?? "",
          order: input.order ?? 0,
          isPublished: input.isPublished ?? false,
          updatedById: input.updatedById,
        },
        select: listSelect,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new HttpError(
          409,
          "Slug sudah dipakai untuk audience yang sama",
        );
      }
      throw e;
    }
  },

  async update(
    id: string,
    input: Partial<{
      slug: string;
      title: string;
      contentMd: string;
      order: number;
      isPublished: boolean;
    }>,
    updatedById: string,
  ) {
    const existing = await prisma.guide.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Petunjuk tidak ditemukan");

    const contentChanged =
      input.contentMd !== undefined && input.contentMd !== existing.contentMd;

    return prisma.$transaction(async (tx) => {
      // Snapshot revisi sebelum overwrite — append-only safety net.
      if (contentChanged) {
        await tx.guideSectionRevision.create({
          data: {
            guideId: id,
            contentMd: existing.contentMd,
            updatedById: existing.updatedById,
          },
        });
      }
      try {
        return await tx.guide.update({
          where: { id },
          data: {
            ...input,
            updatedById,
          },
          select: listSelect,
        });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        ) {
          throw new HttpError(
            409,
            "Slug sudah dipakai untuk audience yang sama",
          );
        }
        throw e;
      }
    });
  },

  /**
   * Soft delete — set isPublished=false. Hard delete tersedia via service
   * tapi tidak diekspos ke route default karena revisions ikut cascade.
   */
  async unpublish(id: string, updatedById: string) {
    const existing = await prisma.guide.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Petunjuk tidak ditemukan");
    return prisma.guide.update({
      where: { id },
      data: { isPublished: false, updatedById },
      select: listSelect,
    });
  },

  async hardDelete(id: string) {
    const existing = await prisma.guide.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Petunjuk tidak ditemukan");
    await prisma.guide.delete({ where: { id } });
  },

  async listRevisions(guideId: string) {
    const guide = await prisma.guide.findUnique({ where: { id: guideId } });
    if (!guide) throw new HttpError(404, "Petunjuk tidak ditemukan");
    return prisma.guideSectionRevision.findMany({
      where: { guideId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        contentMd: true,
        createdAt: true,
        updatedBy: { select: { id: true, displayName: true } },
      },
    });
  },
};

export const guideImagesService = {
  async record(input: {
    filename: string;
    path: string;
    mimeType: string;
    sizeBytes: number;
    uploadedById: string;
  }) {
    return prisma.guideImage.create({
      data: input,
      select: {
        id: true,
        filename: true,
        path: true,
        mimeType: true,
        sizeBytes: true,
        uploadedAt: true,
      },
    });
  },

  async getByFilename(filename: string) {
    return prisma.guideImage.findUnique({ where: { filename } });
  },
};
