import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';

import { RamosScraperAdapter, RamosConfig } from './infrastructure';
import { SearchProductsUseCase } from './application';
import { scraperRoutes } from './interface';

// ─── Validar variables de entorno requeridas ────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Variable de entorno requerida: ${name}`);
    process.exit(1);
  }
  return value;
}

const config: RamosConfig = {
  loginUrl: requireEnv('LOGIN_URL'),
  catalogUrl: requireEnv('CATALOG_URL'),
  searchUrl: requireEnv('SEARCH_URL'),
  username: requireEnv('PROVIDER_USER'),
  password: requireEnv('PROVIDER_PASSWORD'),
  clientId: process.env.PROVIDER_CLIENT_ID || undefined,
};

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// ─── Composición (Dependency Injection manual) ──────────────────────────

const ramosAdapter = new RamosScraperAdapter(config);
const searchProductsUseCase = new SearchProductsUseCase(ramosAdapter);

// ─── Fastify ────────────────────────────────────────────────────────────

const app = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
    },
  },
});

// CORS habilitado para todos los orígenes
app.register(cors, { origin: true });

// Health check
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Registrar rutas de scraping
app.register(scraperRoutes(searchProductsUseCase));

// ─── Arrancar servidor ──────────────────────────────────────────────────

async function start(): Promise<void> {
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`🚀 Servidor corriendo en http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
