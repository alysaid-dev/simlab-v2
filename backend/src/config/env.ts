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
} as const;

export const isDev = env.nodeEnv !== "production";
