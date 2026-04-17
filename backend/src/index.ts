import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env, isDev } from "./config/env.js";
import { disconnectPrisma } from "./config/database.js";
import { shibbolethAttach } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import apiRoutes from "./routes/index.js";

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

  const shutdown = async (signal: string) => {
    console.log(`[simlab-v2] Received ${signal}, shutting down gracefully...`);
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
