import { AssetCondition, AssetStatus, PrismaClient } from "@prisma/client";

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

async function main() {
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

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
