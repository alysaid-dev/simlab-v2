import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env, isDev } from "./config/env.js";
import { disconnectPrisma } from "./config/database.js";
import { shibbolethAttach } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import apiRoutes from "./routes/index.js";
import {
  startScheduler,
  stopScheduler,
} from "./services/notification/scheduler.service.js";

import { configureNotificationTransports } from "./services/notification/index.js";
import { sendEmail, sendWhatsApp } from "./services/notification/transports.js";

function createApp(): Express {
  const app = express();

  // Security / logging / body parsing
  app.use(
    helmet({
      // Shibboleth-integrated deployments typically sit behind a reverse proxy
      // that also serves the frontend — relax CSP to let that work. Tighten
      // in production as appropriate.
      contentSecurityPolicy: false,
    })
  );

  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-HTTP-Method-Override",
        // Shibboleth attributes forwarded by Nginx
        "uid",
        "mail",
        "displayname",
        "edupersonaffiliation",
        "edupersonorgunitdn",
        "memberof",
      ],
    })
  );

  // Cloudflare WAF di statistics.uii.ac.id memblokir method PATCH dengan 403.
  // Workaround: frontend kirim POST + header X-HTTP-Method-Override, middleware
  // ini rewrite req.method sebelum router cocokkan. DELETE ikut di-whitelist
  // untuk amannya (belum terkonfirmasi diblok, tapi pola override-nya sama).
  const METHOD_OVERRIDE_WHITELIST = new Set(["PATCH", "DELETE", "PUT"]);
  app.use((req, _res, next) => {
    if (req.method === "POST") {
      const override = req.header("x-http-method-override")?.toUpperCase();
      if (override && METHOD_OVERRIDE_WHITELIST.has(override)) {
        req.method = override;
      }
    }
    next();
  });

  app.use(morgan(isDev ? "dev" : "combined"));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Trust reverse proxy (Nginx) — so req.ip reflects X-Forwarded-For
  app.set("trust proxy", 1);

  // Populate req.user from Shibboleth headers (global — non-enforcing)
  app.use(shibbolethAttach);

  // Root & health
  app.get("/", (_req, res) => {
    res.json({
      name: "SIMLAB V2 API",
      version: "0.1.0",
      docs: "/api/health",
    });
  });

  // All application routes
  app.use("/api", apiRoutes);

  // 404 + global error handler (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

async function main(): Promise<void> {
  const app = createApp();

  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(
      `[simlab-v2] API listening on http://localhost:${env.port} (${env.nodeEnv})`
    );
    if (env.shibboleth.devMock) {
      console.log(
        "[simlab-v2] Shibboleth DEV MOCK enabled — /api/auth/me returns a fake user when no headers are present."
      );
    }
  });

  // Start cron jobs (H-1 loan reminder etc.) after HTTP is up
configureNotificationTransports({ sendEmail, sendWhatsApp });
startScheduler();

  const shutdown = async (signal: string) => {
    console.log(`[simlab-v2] Received ${signal}, shutting down gracefully...`);
    stopScheduler();
    server.close(async () => {
      await disconnectPrisma();
      process.exit(0);
    });
    // Force-exit after 10s if graceful shutdown stalls
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[simlab-v2] Fatal startup error:", err);
  process.exit(1);
});
