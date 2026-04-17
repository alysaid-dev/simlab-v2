import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { isDev } from "../config/env.js";

/**
 * Application error with an explicit HTTP status.
 * Use `throw new HttpError(404, "Loan not found")` in services / controllers.
 */
export class HttpError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({
    error: "NotFound",
    message: `Route ${req.method} ${req.originalUrl} tidak ditemukan`,
  });
}

// Signature MUST have 4 args for Express to recognise it as an error handler.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Validation errors from zod
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "ValidationError",
      message: "Permintaan tidak valid",
      issues: err.issues,
    });
    return;
  }

  // Known Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint
    if (err.code === "P2002") {
      res.status(409).json({
        error: "Conflict",
        message: "Data sudah ada (unique constraint)",
        meta: err.meta,
      });
      return;
    }
    // Record not found
    if (err.code === "P2025") {
      res.status(404).json({
        error: "NotFound",
        message: "Data tidak ditemukan",
        meta: err.meta,
      });
      return;
    }
    res.status(400).json({
      error: "DatabaseError",
      code: err.code,
      message: err.message,
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: err.name,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Unknown / unexpected
  const message = err instanceof Error ? err.message : "Internal server error";
  console.error("[errorHandler]", err);
  res.status(500).json({
    error: "InternalServerError",
    message: isDev ? message : "Internal server error",
    ...(isDev && err instanceof Error ? { stack: err.stack } : {}),
  });
}
