# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Development server (tsx watch)
npm run build        # Compile TypeScript → dist/
npm start            # Production (requires build first)
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run coverage     # Tests with coverage report

# Run a single test file
npx jest tests/application/MarcasService.test.ts

# Enrich inventory CSV from provider
npm run enrich:inventario
npm run enrich:inventario:retry-no-encontrado
```

Coverage threshold enforced at 80% (branches, functions, lines, statements). CI will fail if coverage drops.

## Architecture

Clean Architecture with four layers. Dependency flow is strictly inward: interface → application → domain ← infrastructure.

```
domain/        # Entities, ports (interfaces), domain errors — zero dependencies
application/   # Use cases (SearchProductsUseCase, MarcasService) — depend only on domain ports
infrastructure/ # Adapters implementing domain ports (RamosScraperAdapter, JsonMarcaRepository)
interface/     # HTTP routes, Zod schemas, DTOs, middleware — depend on application layer
```

**Dependency injection** is wired manually in [src/server.ts](src/server.ts) — no DI container. Routes are factory functions that receive their use-case as an argument (e.g., `scraperRoutes(searchProductsUseCase)`).

### Key components

- **[RamosScraperAdapter](src/infrastructure/scrapers/RamosScraperAdapter.ts)** — implements `ProductSearcher`. Manages an authenticated session with an 18-minute TTL (server session expires at 20 min). Login flow: POST form-urlencoded → extract `PHPSESSID` cookie → GET catalog page → scrape `idCliente` and discount variables from JS globals in the HTML → POST AJAX for paginated product JSON. Session is refreshed transparently on expiry or redirect-to-login detection.

- **[JsonMarcaRepository](src/infrastructure/repositories/JsonMarcaRepository.ts)** — persists marcas to [src/data/marcas/marcas.json](src/data/marcas/marcas.json). This is a **mutable file in the repo** used as a lightweight database; edits to it are intentional.

- **[ErrorHandler](src/interface/middleware/errorHandler.ts)** — centralized domain-error-to-HTTP mapping. All route handlers delegate to `ErrorHandler.handle()`. Domain errors and their HTTP codes: `LoginError → 401`, `ProviderError/ParsingError → 502`, `NotFoundError → 404`, `ConflictError → 409`, `InvalidParamsError → 400`.

- **Validation** — Zod schemas live in `src/interface/schemas/`. Routes validate via `Schema.safeParse()` and return structured `400` on failure. Fastify's own schema validation also runs and is unified with Zod errors via a local `setErrorHandler`.

### CORS

- Development (`NODE_ENV !== 'production'`): all origins allowed.
- Production: reads `ALLOWED_ORIGINS` env var (comma-separated list).

### Price calculation in RamosScraperAdapter

The provider returns `precio` with `descuentoCliente` already applied. The adapter re-derives `precioLista`, then computes `costo` and `precioSugerido` using percentages extracted from the catalog HTML. The `DESCUENTO_CLIENTE` env var (default `55`) can override the discount used in `mapToProduct`.

## Environment variables

Copy `.env.example` to `.env`. Required: `LOGIN_URL`, `CATALOG_URL`, `SEARCH_URL`, `PROVIDER_USER`, `PROVIDER_PASSWORD`. Optional: `PROVIDER_CLIENT_ID` (fixed fallback if HTML extraction fails), `PORT` (default 3000), `HOST` (default 0.0.0.0), `ALLOWED_ORIGINS` (production CORS), `DESCUENTO_CLIENTE` (price calculation).

## API docs

Swagger UI available at `/docs` when the server is running.
