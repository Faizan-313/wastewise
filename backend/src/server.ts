import { app } from "./app.js";
import "dotenv/config.js";

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

const server = app.listen(port, "0.0.0.0", () => {
  console.info(`API server listening on port ${port} Environment: ${process.env.NODE_ENV}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  console.error("API server failed to start", error);
  process.exitCode = 1;
});
