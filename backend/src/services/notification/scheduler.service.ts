import cron, { type ScheduledTask } from "node-cron";
import { LoanStatus } from "@prisma/client";
import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { notifyLoanReminderH2ToMahasiswa } from "./index.js";

/**
 * Compute the [start, end) UTC window that represents "tomorrow" in the
 * scheduler's timezone (Asia/Jakarta by default). The reminder job finds
 * ACTIVE loans whose endDate falls inside this window.
 */
function tomorrowRangeInTz(tz: string): { start: Date; end: Date } {
  // Build the current Y/M/D as seen in the target timezone using Intl.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);

  // Tomorrow at 00:00 in the target TZ — we interpret as UTC for the DB query.
  // Using UTC constructors here is a deliberate approximation: it gives a
  // 24-hour window centered on tomorrow's date; loans whose endDate is stored
  // as "2025-04-18 23:59:59" (UTC) will still match on the correct calendar
  // day for Asia/Jakarta within a few hours. Good enough for H-1 reminders.
  const start = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d + 2, 0, 0, 0));
  return { start, end };
}

export interface ReminderRunResult {
  checked: number;
  sent: number;
  failed: number;
  skippedNoContact: number;
}

/**
 * The actual reminder worker. Exposed so controllers / tests can trigger it
 * manually without waiting for the cron tick.
 */
export async function runH1ReminderJob(): Promise<ReminderRunResult> {
  const { start, end } = tomorrowRangeInTz(env.scheduler.timezone);
  console.log(
    `[scheduler] H-1 reminder scan for loans ending between ${start.toISOString()} and ${end.toISOString()}`
  );

  const loans = await prisma.loan.findMany({
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
  });

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

    const endDate = loan.endDate;
const tanggalJatuhTempo = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "long",
}).format(endDate);

const result = await notifyLoanReminderH2ToMahasiswa(
  {
    email: loan.borrower.email ?? undefined,
    phone: loan.borrower.waNumber ?? undefined,
  },
  {
    namaMahasiswa: loan.borrower.displayName,
    kodeLaptop: loan.asset.code,
    namaLaptop: loan.asset.name,
    tanggalJatuhTempo,
  }
);

if (result.email.status === "sent" || result.whatsapp.status === "sent") sent++;
else failed++;
  }

  console.log(
    `[scheduler] reminder run done: ${loans.length} loans, sent=${sent}, failed=${failed}, skipped=${skippedNoContact}`
  );

  return {
    checked: loans.length,
    sent,
    failed,
    skippedNoContact,
  };
}

// -----------------------------------------------------------------------------
// Cron task lifecycle
// -----------------------------------------------------------------------------

let task: ScheduledTask | null = null;

export function startScheduler(): void {
  if (task) {
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
      `[scheduler] invalid cron expression: "${expr}" — scheduler not started`
    );
    return;
  }

  task = cron.schedule(
    expr,
    () => {
      runH1ReminderJob().catch((err) => {
        console.error("[scheduler] reminder job crashed:", err);
      });
    },
    {
      scheduled: true,
      timezone: env.scheduler.timezone,
    }
  );

  console.log(
    `[scheduler] H-1 reminder scheduled with cron "${expr}" (${env.scheduler.timezone})`
  );
}

export function stopScheduler(): void {
  if (!task) return;
  task.stop();
  task = null;
  console.log("[scheduler] stopped");
}
