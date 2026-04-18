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

async function main() {
  await seedAssets();
  await seedDigitalSignatures();
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
