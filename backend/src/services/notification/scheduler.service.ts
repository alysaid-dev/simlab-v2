import cron, { type ScheduledTask } from "node-cron";
import { LoanStatus } from "@prisma/client";
import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { appSettingsService } from "../appSettings.service.js";
import {
  notifyLoanReminderH0ToMahasiswa,
  notifyLoanReminderH1ToMahasiswa,
} from "./index.js";
import { fmtRupiah } from "../../utils/format.js";

/**
 * Compute a [start, end) UTC window that represents a calendar day relative to
 * "today" in the scheduler's timezone (Asia/Jakarta by default). offsetDays=0
 * returns today, 1 returns tomorrow. Loans whose endDate falls inside the
 * returned window are considered due on that day.
 */
function dayRangeInTz(
  tz: string,
  offsetDays: number,
): { start: Date; end: Date } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);

  // Interpret the target calendar day (00:00 local) as UTC — deliberate
  // approximation, good enough for daily reminders (see note in prior version).
  const start = new Date(Date.UTC(y, m - 1, d + offsetDays, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d + offsetDays + 1, 0, 0, 0));
  return { start, end };
}

export interface ReminderRunResult {
  checked: number;
  sent: number;
  failed: number;
  skippedNoContact: number;
}

type ReminderKind = "H-1" | "H-0";

async function runReminderJob(kind: ReminderKind): Promise<ReminderRunResult> {
  const offset = kind === "H-1" ? 1 : 0;
  const { start, end } = dayRangeInTz(env.scheduler.timezone, offset);
  console.log(
    `[scheduler] ${kind} reminder scan for loans ending between ${start.toISOString()} and ${end.toISOString()}`,
  );

  const [loans, settings] = await Promise.all([
    prisma.loan.findMany({
      where: {
        status: LoanStatus.ACTIVE,
        endDate: { gte: start, lt: end },
      },
      include: {
        borrower: {
          select: { id: true, displayName: true, email: true, waNumber: true },
        },
        asset: { select: { id: true, name: true, code: true } },
      },
    }),
    appSettingsService.get(),
  ]);
  const dendaPerHari = fmtRupiah(settings.lateFeePerDayIdr);

  let sent = 0;
  let failed = 0;
  let skippedNoContact = 0;

  for (const loan of loans) {
    const hasContact =
      !!loan.borrower.email?.trim() || !!loan.borrower.waNumber?.trim();
    if (!hasContact) {
      skippedNoContact++;
      continue;
    }

    const tanggalJatuhTempo = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "long",
    }).format(loan.endDate);

    const recipient = {
      email: loan.borrower.email ?? undefined,
      phone: loan.borrower.waNumber ?? undefined,
    };
    const params = {
      namaMahasiswa: loan.borrower.displayName,
      kodeLaptop: loan.asset.code,
      namaLaptop: loan.asset.name,
      tanggalJatuhTempo,
      dendaPerHari,
    };

    const result =
      kind === "H-1"
        ? await notifyLoanReminderH1ToMahasiswa(recipient, params)
        : await notifyLoanReminderH0ToMahasiswa(recipient, params);

    if (result.email.status === "sent" || result.whatsapp.status === "sent")
      sent++;
    else failed++;
  }

  console.log(
    `[scheduler] ${kind} reminder done: ${loans.length} loans, sent=${sent}, failed=${failed}, skipped=${skippedNoContact}`,
  );

  return {
    checked: loans.length,
    sent,
    failed,
    skippedNoContact,
  };
}

export function runH1ReminderJob(): Promise<ReminderRunResult> {
  return runReminderJob("H-1");
}

export function runH0ReminderJob(): Promise<ReminderRunResult> {
  return runReminderJob("H-0");
}

// -----------------------------------------------------------------------------
// Cron task lifecycle
// -----------------------------------------------------------------------------

const tasks: ScheduledTask[] = [];

export function startScheduler(): void {
  if (tasks.length > 0) {
    console.warn("[scheduler] already running — ignoring start()");
    return;
  }
  if (!env.scheduler.enabled) {
    console.log("[scheduler] disabled via SCHEDULER_ENABLED=0");
    return;
  }

  const expr = env.scheduler.reminderCron;
  if (!cron.validate(expr)) {
    console.error(
      `[scheduler] invalid cron expression: "${expr}" — scheduler not started`,
    );
    return;
  }

  // H-1 dan H-0 dijadwalkan pakai ekspresi cron yang sama (default 08:00 WIB).
  // Setiap tick, dua job jalan berurutan: reminder untuk loan yang jatuh tempo
  // besok (H-1) dan yang jatuh tempo hari ini (H-0).
  const h1Task = cron.schedule(
    expr,
    () => {
      runH1ReminderJob().catch((err) => {
        console.error("[scheduler] H-1 reminder crashed:", err);
      });
    },
    { scheduled: true, timezone: env.scheduler.timezone },
  );

  const h0Task = cron.schedule(
    expr,
    () => {
      runH0ReminderJob().catch((err) => {
        console.error("[scheduler] H-0 reminder crashed:", err);
      });
    },
    { scheduled: true, timezone: env.scheduler.timezone },
  );

  tasks.push(h1Task, h0Task);

  console.log(
    `[scheduler] H-1 + H-0 reminders scheduled with cron "${expr}" (${env.scheduler.timezone})`,
  );
}

export function stopScheduler(): void {
  if (tasks.length === 0) return;
  for (const t of tasks) t.stop();
  tasks.length = 0;
  console.log("[scheduler] stopped");
}
