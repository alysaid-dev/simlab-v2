import { prisma } from "../src/config/database.js";

async function main() {
  const assets = await prisma.asset.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
  });
  console.log("RECENT 5 ASSETS:");
  console.log(JSON.stringify(assets, null, 2));
  const labs = await prisma.laboratory.findMany();
  console.log("\nLABS:");
  console.log(JSON.stringify(labs, null, 2));
  const count = await prisma.asset.count();
  console.log("\nTOTAL ASSETS:", count);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
