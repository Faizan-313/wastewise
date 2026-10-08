import cors from "cors";
import express from "express";
import helmet from "helmet";

import { errorHandler } from "./middleware/error-handler.js";
import { HttpError } from "./lib/http-error.js";
import { healthRouter } from "./routes/health.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || process.env.CORS_ORIGINS?.includes("*") || process.env.CORS_ORIGINS?.includes(origin));
    },
  }),
);

app.use(express.json({ limit: "2mb" }));

app.get("/", (_request, response) => {
  response.status(200).json({ service: "wastewise-api", status: "ok" });
});

app.use("/health", healthRouter);

app.use((_request, _response, next) => {
  next(new HttpError(404, "NOT_FOUND", "Route not found"));
});

app.use(errorHandler);
