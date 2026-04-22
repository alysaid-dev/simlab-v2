import { AssetCondition } from "@prisma/client";

export function fmtRupiah(n: number): string {
  return `Rp${n.toLocaleString("id-ID")}`;
}

export function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return "-";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function calcLateDays(
  dueDate: Date,
  returnedAt: Date,
  toleranceDays: number,
): number {
  const DAY = 24 * 60 * 60 * 1000;
  const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const ret = new Date(returnedAt.getFullYear(), returnedAt.getMonth(), returnedAt.getDate());
  const diff = Math.floor((ret.getTime() - due.getTime()) / DAY);
  const effective = diff - toleranceDays;
  return effective > 0 ? effective : 0;
}

export const CONDITION_LABEL: Record<AssetCondition, string> = {
  GOOD: "Baik",
  MINOR_DAMAGE: "Rusak Ringan",
  MAJOR_DAMAGE: "Rusak Berat",
};
