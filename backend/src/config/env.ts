import "dotenv/config";

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

function parseList(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number.parseInt(process.env.PORT ?? "3000", 10),
  corsOrigins: parseList(process.env.CORS_ORIGIN, ["http://localhost:5173"]),
  databaseUrl: process.env.DATABASE_URL ?? "",
  shibboleth: {
    logoutUrl: process.env.SHIBBOLETH_LOGOUT_URL ?? "/Shibboleth.sso/Logout",
    logoutReturn:
      process.env.SHIBBOLETH_LOGOUT_RETURN ?? "http://localhost:5173/",
    devMock: parseBool(process.env.SHIBBOLETH_DEV_MOCK, false),
  },
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number.parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: parseBool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "labstatistika.uii@gmail.com",
    fromName: process.env.SMTP_FROM_NAME ?? "Laboratorium Statistika UII",
  },
  whatsapp: {
    // Fonnte-compatible: POST { target, message } to apiUrl with Authorization: <token>
    apiUrl: process.env.WA_API_URL ?? "",
    token: process.env.WA_API_TOKEN ?? "",
  },
scheduler: {
    enabled: parseBool(process.env.SCHEDULER_ENABLED, true),
    timezone: process.env.SCHEDULER_TZ ?? "Asia/Jakarta",
    reminderCron: process.env.SCHEDULER_REMINDER_CRON ?? "0 8 * * *",
  },
} as const;

export const isDev = env.nodeEnv !== "production";
