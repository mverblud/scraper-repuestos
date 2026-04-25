import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { RamosScraperAdapter, RamosConfig, JsonMarcaRepository } from './infrastructure';
import { SearchProductsUseCase, MarcasService } from './application';
import { scraperRoutes, marcasRoutes } from './interface';
import { registerRequestLogger } from './interface/middleware';

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

// ─── Configuración de CORS segura ─────────────────────────────────────

const corsOrigin = process.env.NODE_ENV === 'production'
  ? (process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : ['http://localhost:3000'])
  : true; // desarrollo: acepta cualquier origen

// ─── Composición (Dependency Injection manual) ──────────────────────────

const ramosAdapter = new RamosScraperAdapter(config);
const searchProductsUseCase = new SearchProductsUseCase(ramosAdapter);

const marcaRepository = new JsonMarcaRepository();
const marcasService = new MarcasService(marcaRepository);

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

// ─── Middlewares ────────────────────────────────────────────────────────

// Logging de request/response
registerRequestLogger(app);

// CORS con whitelist segura
app.register(cors, { origin: corsOrigin });

// Swagger / OpenAPI
app.register(swagger, {
  openapi: {
    info: {
      title: 'Scraper Repuestos API',
      description: 'API REST para scraping de catálogos de proveedores de repuestos automotor.',
      version: '1.0.0',
    },
    tags: [
      { name: 'scraper', description: 'Endpoints de búsqueda de productos' },
      { name: 'marcas',  description: 'CRUD de marcas de repuestos' },
      { name: 'health',  description: 'Estado del servidor' },
    ],
  },
});

app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list', deepLinking: true },
});

// Health check
app.get('/health', {
  schema: {
    tags: ['health'],
    summary: 'Estado del servidor',
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
}, async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Registrar rutas de scraping
app.register(scraperRoutes(searchProductsUseCase));

// Registrar rutas de marcas
app.register(marcasRoutes(marcasService));

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
