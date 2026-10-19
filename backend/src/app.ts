import cors from "cors";
import express from "express";
import helmet from "helmet";

import { errorHandler } from "./middleware/error-handler.js";
import { HttpError } from "./lib/http-error.js";
import { connectRedis } from "./config/redis.config.js";

import conversationRoutes from "./routes/chat.routes.js";
import authRoutes from "./routes/auth.routes.js";

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

app.use(express.json());

connectRedis();

app.get("/", (_request, response) => {
  response.status(200).json({ service: "wastewise-api", status: "ok" });
});

app.use("/api/conversation", conversationRoutes);
app.use("/api/auth", authRoutes);


//@desc    Catch all unhandled routes
app.use((_request, _response, next) => {
  const error = new HttpError(404, "NOT_FOUND", "Route not found");
  next(error);
});

app.use(errorHandler);
