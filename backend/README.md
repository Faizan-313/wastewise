# WasteWise backend

Node.js 22+ and TypeScript API service with an Express application that can be hosted behind a Node HTTP server or wrapped for AWS Lambda.

## Local development

```sh
npm ci
Copy-Item .env.example .env
npm run dev
```

The development command uses Nodemon to restart the TypeScript server when source files change.

The service listens on `0.0.0.0:$PORT` (default `3000`). `GET /health/live` reports process liveness, `GET /health/ready` reports that the API can accept requests, and `GET /` identifies the service. Readiness currently has no external dependency checks.

Set `CORS_ORIGINS` to a comma-separated list of allowed origins, or `*` to allow any origin. Set `LOG_LEVEL` to a Pino level. Production deployments should set `NODE_ENV=production` and configure allowed origins explicitly.

## Build and verify

```sh
npm test
npm run typecheck
npm run build
npm start
```

The production artifact is emitted to `dist/`. Do not deploy `src/` as the runtime entry point.

## Serverless and deployment

- The standalone HTTP application is exported from `src/app.ts`.
- The AWS Lambda / API Gateway handler is `dist/lambda.handler`. Build before packaging, use a Node.js 22+ runtime, and configure `NODE_ENV`, `LOG_LEVEL`, and `CORS_ORIGINS` in the platform environment.
- A conventional Node host can start the service with `npm start`; configure its health probe to use `/health/ready` and forward termination signals for graceful shutdown.

Do not commit `.env` files. Use the deployment platform's secret/environment-variable manager for production configuration.
