import { prisma } from "../src/config/database.js";

const LAPTOPS: Array<{ name: string; description: string }> = [
  { name: "Asus VivoBook 14 A416", description: "Intel i3-1115G4 | 8 GB | SSD 256 GB | Intel UHD" },
  { name: "Asus VivoBook 15 A516", description: "Intel i5-1135G7 | 8 GB | SSD 512 GB | Intel Iris Xe" },
  { name: "Asus VivoBook S14 S433", description: "Intel i5-1240P | 16 GB | SSD 512 GB | Intel Iris Xe" },
  { name: "Asus ZenBook 14 UX425", description: "Intel i7-1260P | 16 GB | SSD 1 TB | Intel Iris Xe" },
  { name: "Asus ZenBook 13 OLED UX325", description: "Intel i5-1240P | 8 GB | SSD 512 GB | Intel Iris Xe" },
  { name: "Asus ExpertBook B1 B1400", description: "Intel i5-1235U | 8 GB | SSD 256 GB | Intel UHD" },
  { name: "Asus ExpertBook B5 B5402", description: "Intel i7-1260P | 16 GB | SSD 512 GB | Intel Iris Xe" },
  { name: "Asus VivoBook 14X OLED M1403", description: "AMD Ryzen 5 5600H | 8 GB | SSD 512 GB | AMD Radeon" },
  { name: "Asus VivoBook 15 OLED M1503", description: "AMD Ryzen 7 5700U | 16 GB | SSD 512 GB | AMD Radeon" },
  { name: "Asus TUF Gaming F15 FX507", description: "Intel i5-11400H | 16 GB | SSD 512 GB | RTX 3050" },
  { name: "Asus TUF Gaming A15 FA507", description: "AMD Ryzen 7 6800H | 16 GB | SSD 1 TB | RTX 3060" },
  { name: "Asus ROG Strix G15 G513", description: "AMD Ryzen 7 6800H | 16 GB | SSD 1 TB | RTX 3060" },
  { name: "Asus ROG Zephyrus G14 GA402", description: "AMD Ryzen 9 6900HS | 16 GB | SSD 1 TB | RTX 3060" },
  { name: "Asus VivoBook Pro 14 OLED M3401", description: "AMD Ryzen 7 5800H | 16 GB | SSD 1 TB | RTX 3050" },
  { name: "Asus VivoBook Pro 15 OLED K3500", description: "Intel i7-11370H | 16 GB | SSD 1 TB | RTX 3050" },
  { name: "Asus Chromebook CX1 CX1101", description: "Intel Celeron N3350 | 4 GB | eMMC 64 GB | Intel HD" },
  { name: "Asus E410 E410MA", description: "Intel Celeron N4020 | 4 GB | eMMC 128 GB | Intel UHD 600" },
  { name: "Asus VivoBook 14 X415", description: "Intel i3-1215U | 8 GB | SSD 256 GB | Intel UHD" },
  { name: "Asus ProArt Studiobook 16 H7600", description: "Intel i7-12700H | 32 GB | SSD 1 TB | RTX A2000" },
  { name: "Asus VivoBook S15 OLED K3502", description: "Intel i7-12700H | 16 GB | SSD 512 GB | Intel Iris Xe" },
  { name: "Asus ExpertBook L1 L1400", description: "Intel i3-1115G4 | 8 GB | SSD 256 GB | Intel UHD" },
  { name: "Asus VivoBook Flip 14 TP470", description: "Intel i5-1135G7 | 8 GB | SSD 512 GB | Intel Iris Xe" },
  { name: "Asus ZenBook Duo 14 UX482", description: "Intel i7-1195G7 | 16 GB | SSD 1 TB | Intel Iris Xe" },
  { name: "Asus VivoBook 16X M1603", description: "AMD Ryzen 5 5600H | 8 GB | SSD 512 GB | AMD Radeon" },
  { name: "Asus TUF Dash F15 FX516", description: "Intel i7-11370H | 16 GB | SSD 512 GB | RTX 3060" },
];

async function main() {
  if (LAPTOPS.length !== 25) {
    throw new Error(`Expected 25 laptops, got ${LAPTOPS.length}`);
  }

  const data = LAPTOPS.map((l, idx) => ({
    name: `[Tes] ${l.name}`,
    code: `TES${String(idx + 1).padStart(3, "0")}`,
    description: l.description,
  }));

  // Skip existing — supaya idempotent kalau script di-run ulang.
  const result = await prisma.asset.createMany({
    data,
    skipDuplicates: true,
  });

  console.log(`Inserted ${result.count} laptop test rows.`);
  if (result.count < data.length) {
    const existingCodes = await prisma.asset.findMany({
      where: { code: { in: data.map((d) => d.code) } },
      select: { code: true, name: true },
    });
    console.log(
      `${existingCodes.length} sudah ada sebelumnya (skipped):`,
      existingCodes.map((e) => `${e.code} ${e.name}`).join(", "),
    );
  }

  const tesAssets = await prisma.asset.findMany({
    where: { name: { startsWith: "[Tes]" } },
    orderBy: { code: "asc" },
    select: { code: true, name: true, description: true, status: true },
  });
  console.log(`\nSemua aset [Tes] di DB (${tesAssets.length} baris):`);
  for (const a of tesAssets) {
    console.log(`  ${a.code}  ${a.status.padEnd(10)}  ${a.name}  —  ${a.description ?? ""}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
