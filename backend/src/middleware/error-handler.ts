import { randomUUID } from "node:crypto";
import type { ErrorRequestHandler } from "express";

import { HttpError } from "../lib/http-error.js";

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  const statusCode =
    error instanceof HttpError
      ? error.statusCode
      : typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
        ? error.status
        : 500;
  const safeStatusCode = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
  const code = error instanceof HttpError ? error.code : safeStatusCode === 400 ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR";
  const message =
    safeStatusCode >= 500
      ? "An unexpected error occurred"
      : error instanceof HttpError
        ? error.message
        : "Invalid request";
  const requestId = randomUUID();

  if (safeStatusCode >= 500) {
    console.error("Request failed", { requestId, error });
  } else {
    console.warn("Request rejected", { requestId, statusCode: safeStatusCode, error });
  }

  response.status(safeStatusCode).json({
    error: {
      code,
      message,
      requestId,
    },
  });
};
