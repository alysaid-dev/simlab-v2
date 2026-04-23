import { GuideAudience, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface GuideSeed {
  audience: GuideAudience;
  slug: string;
  title: string;
  order: number;
}

// Initial sections — konten kosong; super admin isi via UI Manajemen Petunjuk.
const guides: GuideSeed[] = [
  // Mahasiswa
  { audience: "MAHASISWA", slug: "peminjaman-laptop-ta", title: "Peminjaman Laptop TA", order: 10 },
  { audience: "MAHASISWA", slug: "peminjaman-laptop-praktikum", title: "Peminjaman Laptop Praktikum", order: 20 },
  { audience: "MAHASISWA", slug: "peminjaman-ruangan", title: "Peminjaman Ruangan", order: 30 },
  { audience: "MAHASISWA", slug: "penerbitan-surat-bebas-lab", title: "Penerbitan Surat Bebas Lab", order: 40 },
  // Dosen
  { audience: "DOSEN", slug: "persetujuan-laptop", title: "Persetujuan Laptop", order: 10 },
  { audience: "DOSEN", slug: "peminjaman-ruangan", title: "Peminjaman Ruangan", order: 20 },
  // Tendik (STAFF)
  { audience: "STAFF", slug: "pengajuan-peminjaman-ruangan", title: "Pengajuan Peminjaman Ruangan", order: 10 },
];

async function main() {
  for (const g of guides) {
    await prisma.guide.upsert({
      where: { audience_slug: { audience: g.audience, slug: g.slug } },
      create: {
        audience: g.audience,
        slug: g.slug,
        title: g.title,
        order: g.order,
        contentMd: "",
        isPublished: false,
      },
      update: {
        title: g.title,
        order: g.order,
      },
    });
  }
  const total = await prisma.guide.count();
  console.log(`[seed:guides] total guides: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
