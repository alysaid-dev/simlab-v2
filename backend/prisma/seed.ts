import {
  AssetCondition,
  AssetStatus,
  ClearanceStatus,
  DocumentType,
  PrismaClient,
  RoleName,
} from "@prisma/client";

const prisma = new PrismaClient();

const laptops: Array<{
  code: string;
  name: string;
  condition: AssetCondition;
  status: AssetStatus;
}> = [
  { code: "LT-001", name: "Dell Latitude 5420", condition: AssetCondition.GOOD, status: AssetStatus.AVAILABLE },
  { code: "LT-002", name: "HP ProBook 450 G8", condition: AssetCondition.GOOD, status: AssetStatus.BORROWED },
  { code: "LT-003", name: "Lenovo ThinkPad X1 Carbon", condition: AssetCondition.MINOR_DAMAGE, status: AssetStatus.AVAILABLE },
  { code: "LT-004", name: "MacBook Air M2", condition: AssetCondition.GOOD, status: AssetStatus.AVAILABLE },
  { code: "LT-005", name: "Asus ROG Strix G15", condition: AssetCondition.GOOD, status: AssetStatus.BORROWED },
  { code: "LT-006", name: "Acer Aspire 5", condition: AssetCondition.MAJOR_DAMAGE, status: AssetStatus.MAINTENANCE },
  { code: "LT-007", name: "Lenovo IdeaPad 3", condition: AssetCondition.GOOD, status: AssetStatus.AVAILABLE },
  { code: "LT-008", name: "Dell XPS 13", condition: AssetCondition.MINOR_DAMAGE, status: AssetStatus.AVAILABLE },
];

async function seedAssets() {
  for (const lap of laptops) {
    await prisma.asset.upsert({
      where: { code: lap.code },
      create: lap,
      update: lap,
    });
  }
  const count = await prisma.asset.count();
  console.log(`[seed] assets total: ${count}`);
}

// ---------------------------------------------------------------------------
// Digital signature demo data
//
// Provisions a kepala-lab signer + lab + student + clearance letter, then
// creates a DigitalSignature with a fixed hash so the /verify/:hash flow
// can be tested end-to-end in the browser.
// ---------------------------------------------------------------------------

const DEMO_HASH_KEPALA_LAB = "demo-sig-kepala-lab";
const DEMO_HASH_LABORAN = "demo-sig-laboran";

async function seedDigitalSignatures() {
  // 1. Ensure the two roles we need exist.
  const kepalaRole = await prisma.role.upsert({
    where: { name: RoleName.KEPALA_LAB },
    create: { name: RoleName.KEPALA_LAB, description: "Kepala Laboratorium" },
    update: {},
  });
  const laboranRole = await prisma.role.upsert({
    where: { name: RoleName.LABORAN },
    create: { name: RoleName.LABORAN, description: "Laboran" },
    update: {},
  });

  // 2. Signers.
  const kepalaSigner = await prisma.user.upsert({
    where: { uid: "demo-kepala-lab" },
    create: {
      uid: "demo-kepala-lab",
      email: "kepala.lab.demo@uii.ac.id",
      displayName: "Ghiffari Ahnaf Danarwindu, M.Sc.",
      isActive: true,
    },
    update: {},
  });
  const laboranSigner = await prisma.user.upsert({
    where: { uid: "demo-laboran" },
    create: {
      uid: "demo-laboran",
      email: "laboran.demo@uii.ac.id",
      displayName: "Ridhani Anggit Safitri, A.Md",
      isActive: true,
    },
    update: {},
  });

  // UserRole tidak punya composite unique (userId, roleId), jadi pakai
  // findFirst + create manual agar idempotent.
  async function ensureUserRole(userId: string, roleId: string) {
    const exists = await prisma.userRole.findFirst({
      where: { userId, roleId },
    });
    if (!exists) {
      await prisma.userRole.create({ data: { userId, roleId } });
    }
  }
  await ensureUserRole(kepalaSigner.id, kepalaRole.id);
  await ensureUserRole(laboranSigner.id, laboranRole.id);

  // 3. Laboratory (kepala = kepalaSigner, laboran = laboranSigner).
  let lab = await prisma.laboratory.findFirst({
    where: { name: "Laboratorium Statistika Sains Data" },
  });
  if (!lab) {
    lab = await prisma.laboratory.create({
      data: {
        name: "Laboratorium Statistika Sains Data",
        description: "Lab demo untuk seeding verifikasi QR.",
        kepalaLabId: kepalaSigner.id,
      },
    });
  }
  const laboranLink = await prisma.laboratoryLaboran.findFirst({
    where: { laboratoryId: lab.id, userId: laboranSigner.id },
  });
  if (!laboranLink) {
    await prisma.laboratoryLaboran.create({
      data: { laboratoryId: lab.id, userId: laboranSigner.id },
    });
  }

  // 4. Student user.
  const student = await prisma.user.upsert({
    where: { uid: "22611147" },
    create: {
      uid: "22611147",
      email: "22611147@students.uii.ac.id",
      displayName: "Putriana Dwi Agustin",
      isActive: true,
    },
    update: {},
  });

  // 5. ClearanceLetter (APPROVED) for the student.
  let letter = await prisma.clearanceLetter.findFirst({
    where: { userId: student.id, status: ClearanceStatus.APPROVED },
  });
  if (!letter) {
    letter = await prisma.clearanceLetter.create({
      data: {
        userId: student.id,
        status: ClearanceStatus.APPROVED,
        approvedBy: kepalaSigner.id,
        approvedAt: new Date(),
      },
    });
  }

  // 6. DigitalSignatures — idempotent via unique `hash`.
  await prisma.digitalSignature.upsert({
    where: { hash: DEMO_HASH_KEPALA_LAB },
    create: {
      hash: DEMO_HASH_KEPALA_LAB,
      documentId: letter.id,
      documentType: DocumentType.CLEARANCE_LETTER,
      signerId: kepalaSigner.id,
    },
    update: { signerId: kepalaSigner.id, documentId: letter.id },
  });
  await prisma.digitalSignature.upsert({
    where: { hash: DEMO_HASH_LABORAN },
    create: {
      hash: DEMO_HASH_LABORAN,
      documentId: letter.id,
      documentType: DocumentType.CLEARANCE_LETTER,
      signerId: laboranSigner.id,
    },
    update: { signerId: laboranSigner.id, documentId: letter.id },
  });

  console.log(
    `[seed] digital signatures ready — test URLs:\n` +
      `  /simlab/verify/${DEMO_HASH_KEPALA_LAB}\n` +
      `  /simlab/verify/${DEMO_HASH_LABORAN}`,
  );
}

// Per lab code (dari LABORATORIES), map ke default kapasitas + lokasi dan
// kode ruangan lama (sebelum sync) — dipakai buat migrasi row yang sudah ada
// di DB production. Setelah sync: Room.code = Laboratory.code dan nama
// ruangan persis mengikuti nama laboratorium.
const ROOM_DEFAULTS: Record<
  string,
  { oldCodes: string[]; capacity: number; location: string }
> = {
  SBIS: { oldCodes: ["LAB-BIS"], capacity: 30, location: "Gedung FMIPA Lantai 2" },
  SMRK: { oldCodes: ["LAB-MRK"], capacity: 30, location: "Gedung FMIPA Lantai 2" },
  SSD: { oldCodes: ["LAB-SD"], capacity: 30, location: "Gedung FMIPA Lantai 3" },
};

async function seedRooms() {
  for (const lab of LABORATORIES) {
    const dbLab = await prisma.laboratory.findUnique({
      where: { name: lab.name },
    });
    if (!dbLab) {
      console.warn(`[seed] laboratory ${lab.code} tidak ditemukan — skip room`);
      continue;
    }
    const meta = ROOM_DEFAULTS[lab.code];
    if (!meta) continue;
    // Cari room eksisting lewat kode lama ATAU kode baru (= lab.code) agar
    // idempotent: jalankan seed berulang kali tetap satu row per lab.
    const existing = await prisma.room.findFirst({
      where: { code: { in: [...meta.oldCodes, lab.code] } },
    });
    if (existing) {
      await prisma.room.update({
        where: { id: existing.id },
        data: {
          code: lab.code,
          name: lab.name,
          capacity: meta.capacity,
          location: meta.location,
          laboratoryId: dbLab.id,
          isActive: true,
        },
      });
    } else {
      await prisma.room.create({
        data: {
          code: lab.code,
          name: lab.name,
          capacity: meta.capacity,
          location: meta.location,
          laboratoryId: dbLab.id,
          isActive: true,
        },
      });
    }
  }
  const count = await prisma.room.count();
  console.log(`[seed] rooms total: ${count}`);
}

// ---------------------------------------------------------------------------
// Staff / Dosen bootstrap
//
// Data dosen, laboran, admin, dan staff Laboratorium Statistika FMIPA UII.
// Upsert by email — jika email sudah ada, update nama/uid/wa/roles (tidak
// duplicate). Multi-role didukung (mis. LABORAN + ADMIN).
// ---------------------------------------------------------------------------

interface StaffSeed {
  wa: string;
  email: string;
  uid: string;
  name: string;
  roles: RoleName[];
}

const STAFF: StaffSeed[] = [
  { wa: "081804455720", email: "176110101@uii.ac.id", uid: "176110101", name: "Abdullah Ahmad Dzikrullah, S.Si., M.Sc.", roles: [RoleName.DOSEN, RoleName.KEPALA_LAB] },
  { wa: "085727009603", email: "176110102@uii.ac.id", uid: "176110102", name: "Achmad Fauzan, S.Pd., M.Si.", roles: [RoleName.DOSEN] },
  { wa: "0818934903",   email: "956110101@uii.ac.id", uid: "956110101", name: "Akhmad Fauzy, Prof., S.Si., M.Si.. Ph.D.", roles: [RoleName.DOSEN] },
  { wa: "085866166769", email: "146110504@uii.ac.id", uid: "146110504", name: "Arum Handini Primandari, S.Pd.Si., M.Sc.", roles: [RoleName.DOSEN] },
  { wa: "085741234512", email: "151001301@uii.ac.id", uid: "151001301", name: "Dr. Asyharul Mu'ala, S.H.I., M.H.I.", roles: [RoleName.DOSEN] },
  { wa: "08172384386",  email: "146110101@uii.ac.id", uid: "146110101", name: "Dr. Atina Ahdika, S.Si., M.Si.", roles: [RoleName.DOSEN] },
  { wa: "081548551999", email: "136111102@uii.ac.id", uid: "136111102", name: "Ayundyah Kesumawati, S.Si., M.Si.", roles: [RoleName.DOSEN] },
  { wa: "085747916101", email: "176110103@uii.ac.id", uid: "176110103", name: "Dina Tri Utari, S.Si., M.Sc.", roles: [RoleName.DOSEN] },
  { wa: "081227291710", email: "966110103@uii.ac.id", uid: "966110103", name: "Dr. Edy Widodo, S.Si., M.Si.", roles: [RoleName.DOSEN] },
  { wa: "087738981118", email: "956110102@uii.ac.id", uid: "956110102", name: "Prof., Dr. Jaka Nugraha, S.Si., M.Si.", roles: [RoleName.DOSEN] },
  { wa: "081578000680", email: "966110102@uii.ac.id", uid: "966110102", name: "Dr. Kariyam, S.Si., M.Si.", roles: [RoleName.DOSEN] },
  { wa: "081225854222", email: "156111303@uii.ac.id", uid: "156111303", name: "Muhammad Hasan Sidiq Kurniawan, S.Si., M.Sc.", roles: [RoleName.DOSEN] },
  { wa: "089637608885", email: "146110505@uii.ac.id", uid: "146110505", name: "Muhammad Muhajir, S.Si., M.Sc.", roles: [RoleName.DOSEN] },
  { wa: "082121103104", email: "166110102@uii.ac.id", uid: "166110102", name: "Mujiati Dwi Kartikasari., S.Si., M.Sc.", roles: [RoleName.DOSEN] },
  { wa: "085761148760", email: "986110101@uii.ac.id", uid: "986110101", name: "Dr. Raden Bagus Fajriya Hakim, S.Si., M.Si.", roles: [RoleName.DOSEN] },
  { wa: "081369380938", email: "156111305@uii.ac.id", uid: "156111305", name: "Rahmadi Yotenka, S.Si., M.Sc.", roles: [RoleName.DOSEN] },
  { wa: "081291740205", email: "966110101@uii.ac.id", uid: "966110101", name: "Dr.techn. Rohmatul Fajriyah, S.Si., M.Si.", roles: [RoleName.DOSEN] },
  { wa: "085743795362", email: "186110101@uii.ac.id", uid: "186110101", name: "Sekti Kartika Dini, S.Si., M.Si.", roles: [RoleName.DOSEN] },
  { wa: "081380274958", email: "156110502@uii.ac.id", uid: "156110502", name: "Tuti Purwaningsih, S.Stat., M.Si.", roles: [RoleName.DOSEN] },
  { wa: "085702134245", email: "246111201@uii.ac.id", uid: "246111201", name: "Ghiffari Ahnaf Danarwindu, M.Sc.", roles: [RoleName.DOSEN, RoleName.KEPALA_LAB] },
  { wa: "081377678619", email: "246111202@uii.ac.id", uid: "246111202", name: "Purnama Akbar, S.Stat., M.Si.", roles: [RoleName.DOSEN] },
  { wa: "085643619779", email: "101002219@uii.ac.id", uid: "101002219", name: "Muhammad Achnaf, A.Md.", roles: [RoleName.STAFF] },
  { wa: "085743551172", email: "121002207@uii.ac.id", uid: "121002207", name: "Ridhani Anggit Safitri, A.Md.", roles: [RoleName.LABORAN, RoleName.ADMIN] },
  { wa: "087767142726", email: "151002233@uii.ac.id", uid: "151002233", name: "Rizal Pratama Putra, S.T.", roles: [RoleName.LABORAN, RoleName.ADMIN] },
  { wa: "085869192215", email: "223102602@uii.ac.id", uid: "223102602", name: "Sri Devi Maheswari, S.M", roles: [RoleName.STAFF] },
  { wa: "081215481452", email: "241003314@uii.ac.id", uid: "241003314", name: "Muhammad Aly Sa'id, S.Pd., M.Pd", roles: [RoleName.LABORAN, RoleName.SUPER_ADMIN] },
];

async function seedStaff() {
  // Pastikan semua Role tersedia lebih dulu — pakai Object.values(RoleName)
  // supaya otomatis ikut enum baru kalau schema bertambah.
  const roleByName = new Map<RoleName, string>();
  for (const name of Object.values(RoleName)) {
    const role = await prisma.role.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    roleByName.set(name, role.id);
  }

  for (const s of STAFF) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      create: {
        uid: s.uid,
        email: s.email,
        displayName: s.name,
        waNumber: s.wa,
        isActive: true,
      },
      update: {
        uid: s.uid,
        displayName: s.name,
        waNumber: s.wa,
        isActive: true,
      },
    });

    for (const roleName of s.roles) {
      const roleId = roleByName.get(roleName);
      if (!roleId) continue;
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId } },
        create: { userId: user.id, roleId },
        update: {},
      });
    }
  }

  const total = await prisma.user.count();
  console.log(`[seed] staff upsert selesai — total users di DB: ${total}`);
}

// ---------------------------------------------------------------------------
// 3 Laboratorium yang dikelola Lab Statistika FMIPA UII.
// kepalaLab & laboran belum di-assign di seed — diset via modul Pengaturan
// Aplikasi (tidak overwrite kalau sudah diset supaya tidak menimpa assignment
// manual dari UI).
// ---------------------------------------------------------------------------

const LABORATORIES: Array<{ code: string; name: string }> = [
  { code: "SBIS", name: "Laboratorium Statistika Bisnis, Industri dan Sosial" },
  { code: "SMRK", name: "Laboratorium Statistika Manajemen Risiko dan Kebencanaan" },
  { code: "SSD", name: "Laboratorium Statistika Sains Data" },
];

async function seedLaboratories() {
  for (const lab of LABORATORIES) {
    await prisma.laboratory.upsert({
      where: { name: lab.name },
      create: { name: lab.name, code: lab.code, isActive: true },
      update: { code: lab.code, isActive: true },
    });
  }
  const total = await prisma.laboratory.count();
  console.log(`[seed] laboratories total: ${total}`);
}

async function seedAppSettings() {
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
  console.log(`[seed] app_settings singleton ready`);
}

async function main() {
  await seedAssets();
  // Laboratories harus ada dulu supaya seedRooms bisa set laboratoryId.
  await seedLaboratories();
  await seedRooms();
  await seedAppSettings();
  await seedStaff();
  await seedDigitalSignatures();
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
