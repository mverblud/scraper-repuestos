---
name: Backend Refactoring Architecture Guide
description: Guía de arquitectura, refactorización y estandarización para el backend Node.js/Fastify
applyTo:
  - src/**/*.ts
  - "!tests/**"
tags:
  - architecture
  - fastify
  - clean-architecture
  - error-handling
  - backend
---

# Backend Refactoring Architecture Guide

**Proyecto:** Scraper Repuestos (Fastify + Clean Architecture)  
**Versión:** 1.0.0 (Post-refactorización Fase 1)  
**Última actualización:** Marzo 2026  
**Enfoque:** Mantenibilidad + Quick Wins (sin romper compatibilidad)

---

## 1. Estado Actual de la Arquitectura

### Fortalezas Existentes ✅

Tu proyecto ya implementa patrones sólidos:

- **Clean Architecture:** Separación clara en `domain`, `application`, `infrastructure`, `interface`
- **Inyección de Dependencias:** Manual pero explícita en `server.ts`
- **Puertos y Adapters (Hexagonal):** 
  - `ProductSearcher` (port) → `RamosScraperAdapter` (adapter)
  - `MarcaRepository` (port) → `JsonMarcaRepository` (adapter)
- **Errores tipados:** Clases de error del dominio sin frameworks (`LoginError`, `NotFoundError`, etc.)
- **Validación con Zod:** Schemas claros en `interface/schemas/`
- **Logging con Pino:** Structured logging integrado
- **OpenAPI/Swagger:** Documentación automática de endpoints

### Problemas Detectados 🔴

| Problema | Severidad | Impacto | Estado |
|----------|-----------|--------|--------|
| Error handling duplicado (2 rutas) | Media | Mantenimiento difícil | ✅ Resuelto |
| DTOs implícitos | Media | Confusión de tipos | ✅ Resuelto |
| CORS abierto a todos (`origin: true`) | Alta | Seguridad CSRF | ✅ Resuelto |
| Logging incompleto (solo errors) | Baja | Debugging pobre | ✅ Resuelto |
| Validación redundante (Zod + OpenAPI) | Baja | Duplicidad de código | 🟡 Parcial |

---

## 2. Refactorización Implementada (Fase 1)

### 2.1 Error Handling Centralizado

#### Problema
Ambas rutas (`scraperRoutes.ts` y `marcasRoutes.ts`) tenían funciones `handleError()` idénticas y en otras partes del código duplicadas. Mantenimiento en dos lugares = inconsistencias futuras.

#### Solución
Crear `src/interface/middleware/errorHandler.ts` con una clase centralizada:

```typescript
// ✅ DESPUÉS: Centralizado
export class ErrorHandler {
  static handle(
    error: unknown,
    reply: FastifyReply,
    log: FastifyRequest['log'],
  ): FastifyReply {
    if (error instanceof LoginError) { /* ... */ }
    if (error instanceof NotFoundError) { /* ... */ }
    // ... toda la lógica en UN lugar
  }
}

// Uso en rutas (ahora simple):
try {
  const result = await useCase.execute(params);
  return reply.send(result);
} catch (error) {
  return ErrorHandler.handle(error, reply, request.log);
}
```

#### Beneficios
- ✅ Single Responsibility: Un solo lugar para mapear errores
- ✅ Mantenimiento: Agregar nuevos tipos de error en un sitio
- ✅ Consistencia: Todos los endpoints retornan el mismo formato de error
- ✅ Testeable: Fácil de unit testar en aislamiento

#### Archivos
- Creado: `src/interface/middleware/errorHandler.ts`
- Creado: `src/interface/middleware/index.ts`
- Modificado: `src/interface/routes/scraperRoutes.ts` (removido `handleError()`)
- Modificado: `src/interface/routes/marcasRoutes.ts` (removido `handleError()`)

---

### 2.2 DTOs Explícitos

#### Problema
Los schemas Zod en `interface/schemas/` actúan como "DTOs implícitos" pero no tenía claridad sobre qué es entrada vs salida:

```typescript
// ❌ CONFUSO: ¿Es esquema de validación o DTO?
export const SearchProductsSchema = z.object({
  codigoAuto: z.string().max(200).default(''),
  // ...
});
```

#### Solución
Crear carpeta `src/interface/dtos/` con tipos de transferencia explícitos:

```typescript
// ✅ CLARO: Entrada vs salida desambiguada
export interface SearchProductsRequestDTO {
  codigoAuto: string;
  marcaId: string;
  rubroId: string;
  cantidadRenglones: number;
}

export interface ProductDTO {
  codigo: string;
  marca: string;
  // ... todos los campos
}

export interface SearchProductsResponseDTO {
  params: SearchProductsRequestDTO;
  totalProductos: number;
  productos: ProductDTO[];
}

// Uso en rutas:
const requestData: SearchProductsRequestDTO = parsed.data;
const response: SearchProductsResponseDTO = await useCase.execute(requestData);
```

#### Beneficios
- ✅ Claridad: Queda explícito qué entra y qué sale
- ✅ Type Safety: TypeScript valida automáticamente
- ✅ Documentación: El código es auto-documentado
- ✅ Reutilización: DTOs se reutilizan en tests, clientes, documentación

#### Archivos
- Creado: `src/interface/dtos/SearchProductsDTO.ts`
- Creado: `src/interface/dtos/MarcasDTO.ts`
- Creado: `src/interface/dtos/index.ts`

---

### 2.3 Logging de Requests

#### Problema
Solo se logueaban errores. Sin visibilidad en requests/responses → debugging difícil, sin trazabilidad.

#### Solución
Middleware `src/interface/middleware/requestLogger.ts`:

```typescript
export async function requestLogger(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const startTime = Date.now();

  // Log entrada
  request.log.info({
    method: request.method,
    url: request.url,
    query: request.query,
    body: sanitizeBody(request.body), // Sin passwords
  }, 'Incoming request');

  // Log salida con duración
  reply.addHook('onResponse', (request, reply, done) => {
    const duration = Date.now() - startTime;
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
    }, 'Request completed');
    done();
  });
}
```

#### Beneficios
- ✅ Trazabilidad: Ver cada request/response
- ✅ Performance: Tracking de response time
- ✅ Seguridad: Sanitización de datos sensibles
- ✅ Debugging: Contexto completo en logs

#### Archivos
- Creado: `src/interface/middleware/requestLogger.ts`
- Modificado: `src/server.ts` (registrar middleware)

---

### 2.4 Seguridad CORS

#### Problema
CORS estaba abierto a todos: `app.register(cors, { origin: true })`  
→ Vulnerable a CSRF, permite cualquier origen

#### Solución
CORS con whitelist desde `.env`:

```typescript
// server.ts
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

const corsOrigin = ALLOWED_ORIGINS.length === 1 && ALLOWED_ORIGINS[0] === '*'
  ? true
  : ALLOWED_ORIGINS;

app.register(cors, { origin: corsOrigin });
```

```bash
# .env.example
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

#### Beneficios
- ✅ Seguridad: Solo orígenes confiables pueden acceder
- ✅ Configurabilidad: Diferente por entorno (dev/prod)
- ✅ Flexibilidad: Agregar más orígenes sin recodificar

#### Archivos
- Modificado: `src/server.ts`
- Modificado: `.env.example`

---

## 3. Arquitectura Recomendada (Visión a Largo Plazo)

Tu proyecto ya está bien estructurado. La visión es evolucionar así:

### Nivel Actual (Post-Refactorización)
```
src/
├── domain/              ✅ Lógica pura (sin frameworks)
│   ├── entities/        ✅ Marca, Product, SearchParams
│   ├── errors/          ✅ LoginError, NotFoundError, etc.
│   └── ports/           ✅ Interfaces de entrada/salida
├── application/         ✅ Casos de uso
│   ├── SearchProductsUseCase.ts
│   └── MarcasService.ts
├── infrastructure/      ✅ Implementaciones concretas
│   ├── repositories/    ✅ JsonMarcaRepository
│   └── scrapers/        ✅ RamosScraperAdapter
├── interface/           ✅ Capa HTTP (Fastify)
│   ├── routes/          ✅ Endpoints
│   ├── schemas/         ✅ Validación (Zod)
│   ├── dtos/            ✅ Data Transfer Objects (NUEVO)
│   └── middleware/      ✅ Middlewares centralizados (NUEVO)
└── server.ts            ✅ Composición + Fastify setup
```

### Nivel Futuro (Escalabilidad)
Si el proyecto crece:

1. **Feature-based structure** (por dominio):
   ```
   src/
   ├── features/
   │   ├── products/
   │   │   ├── domain/
   │   │   ├── application/
   │   │   ├── infrastructure/
   │   │   └── interface/
   │   └── brands/
   │       ├── domain/
   │       ├── application/
   │       └── ...
   ```

2. **IoC Container** (Inversión de Control):
   - Actualmente: Composición manual en `server.ts`
   - Futuro: `tsyringe` o `awilix` para autoinyección

3. **Eventos de Dominio** (Event Sourcing opcional):
   - Para audit trail de cambios en marcas
   - Para triggers asincronos

---

## 4. Convenciones de Código

### Naming

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| **Entities** | PascalCase | `Marca`, `Product`, `SearchParams` |
| **DTOs** | PascalCase + "DTO" | `SearchProductsRequestDTO`, `MarcaDTO` |
| **Servicios** | PascalCase + "Service" | `MarcasService` |
| **Use Cases** | PascalCase + "UseCase" | `SearchProductsUseCase` |
| **Repos** | PascalCase + "Repository" | `JsonMarcaRepository` |
| **Adapters** | PascalCase + "Adapter" | `RamosScraperAdapter` |
| **Err Classes** | PascalCase + "Error" | `LoginError`, `NotFoundError` |
| **Variables** | camelCase | `marcaId`, `totalProductos` |
| **Routes** | lowercase (kebab-case en URL) | `/marcas/:id` |

### Estructura de Carpetas

```
src/
├── domain/           # 🔒 Reglas de negocio (sin dependencias externas)
│   ├── entities/     # Objetos de dominio
│   ├── errors/       # Excepciones del dominio
│   └── ports/        # Interfaces (dependen de dominio, no de infraestructura)
├── application/      # 📦 Orquestación (servicios + use cases)
├── infrastructure/   # 🔌 Implementaciones concretas
│   ├── repositories/ # Acceso a datos
│   └── scrapers/     # APIs externas, HTTP clients
├── interface/        # 🌐 Adaptación a HTTP (Fastify)
│   ├── routes/       # Endpoints
│   ├── middleware/   # Middlewares centralizados
│   ├── schemas/      # Validación (Zod)
│   └── dtos/         # Data Transfer Objects
└── server.ts         # 🚀 Entry point + composición
```

---

## 5. Manejo de Errores (Centralizado)

### Estrategia

Todos los errores fluyen así:

```
Route Controller
    ↓
Service / UseCase
    ↓
throws Domain Error (LoginError, NotFoundError, etc.)
    ↓
ErrorHandler.handle() 
    ↓
HTTP Response (401, 404, 500, etc.)
```

### Ejemplo Completo

```typescript
// 1. DOMINIO: Define el error
export class ProductNotAvailableError extends Error {
  constructor(codigo: string) {
    super(`Producto ${codigo} no disponible`);
    this.name = 'ProductNotAvailableError';
  }
}

// 2. SERVICE: Lanza el error
export class SearchProductsUseCase {
  async execute(params: SearchParams): Promise<SearchResult> {
    const result = await this.searcher.search(params);
    if (result.productos.length === 0) {
      throw new ProductNotAvailableError(params.codigoAuto);
    }
    return result;
  }
}

// 3. MIDDLEWARE: Maneja el error
export class ErrorHandler {
  static handle(error: unknown, reply: FastifyReply, log: FastifyRequest['log']): FastifyReply {
    if (error instanceof ProductNotAvailableError) {
      return reply.status(404).send({
        error: 'Producto no disponible',
        message: error.message,
      });
    }
    // ... resto de errores
  }
}

// 4. ROUTE: Usa el handler
fastify.get('/productos/:codigo', async (request, reply) => {
  try {
    const result = await useCase.execute(request.params.codigo);
    return reply.send(result);
  } catch (error) {
    return ErrorHandler.handle(error, reply, request.log);
  }
});
```

### Mapeo de Errores → HTTP

| Error de Dominio | Código HTTP | Significado |
|------------------|------------|------------|
| `InvalidParamsError` | 400 | Bad Request |
| `LoginError` | 401 | Unauthorized |
| `NotFoundError` | 404 | Not Found |
| `ConflictError` | 409 | Conflict (ej: duplicado) |
| `ProviderError` | 502 | Bad Gateway (proveedor down) |
| `ParsingError` | 502 | Bad Gateway (proveedor retorna formato inválido) |
| Otros (`Error` nativo) | 500 | Internal Server Error |

---

## 6. Validación de Requests

### Zod → DTO → Service

```typescript
// 1. Schema: Validar entrada
export const CreateMarcaSchema = z.object({
  marcaName: z.string().min(1).max(100),
  marcaHabilitado: z.boolean().default(true),
});

// 2. DTO: Tipar la transferencia
export interface CreateMarcaRequestDTO {
  marcaName: string;
  marcaHabilitado?: boolean;
}

// 3. Route: Validar + tipar + servir
fastify.post('/marcas', async (request, reply) => {
  const parsed = CreateMarcaSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      error: 'Parámetros inválidos',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const dto: CreateMarcaRequestDTO = parsed.data;
  const marca = await service.create(dto);
  return reply.status(201).send(marca);
});
```

### Recomendación Futura
Si crece la validalidad:
```typescript
// Validator helper
async function validateRequest<T>(
  schema: z.Schema<T>,
  data: unknown,
  reply: FastifyReply,
): Promise<T | null> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    reply.status(400).send({
      error: 'Parámetros inválidos',
      details: parsed.error.flatten().fieldErrors,
    });
    return null;
  }
  return parsed.data;
}

// Usar en rutas
const dto = await validateRequest(CreateMarcaSchema, request.body, reply);
if (!dto) return;
```

---

## 7. Logging y Monitoreo

### Niveles de Log (Pino)

```typescript
request.log.debug({ data }, 'Información muy detallada');
request.log.info({ action }, 'Evento importante');
request.log.warn({ issue }, 'Algo anómalo pero recuperable');
request.log.error({ error }, 'Error que debe investigarse');
```

### Ejemplos Reales

```typescript
// ✅ Login exitoso
request.log.info({ username, loginTime: '150ms' }, 'Usuario autenticado');

// ⚠️ Reintento de autenticación
request.log.warn({ username, attempts: 3 }, 'Múltiples intentos de login');

// ❌ Error del proveedor
request.log.error({ 
  providerName: 'Ramos', 
  statusCode: 500,
  error: error.message 
}, 'Provider no responde');

// 📊 Performance tracking
request.log.info({ 
  endpoint: '/scraper/productos',
  queryTime: '2340ms',
  productsCount: 150
}, 'Búsqueda completada');
```

### Sanitización Automática

El middleware `requestLogger` removería automáticamente campos sensibles:

```typescript
request.body = {
  username: 'user@example.com',
  password: 'secret123',        // ← será [REDACTED]
  token: 'jwt-token-here',      // ← será [REDACTED]
  codigoAuto: '123',
}

// Log: { username, password: '[REDACTED]', token: '[REDACTED]', codigoAuto }
```

---

## 8. Testing

### Test de ErrorHandler

```typescript
import { ErrorHandler } from '../middleware/errorHandler';
import { NotFoundError } from '../../domain/errors';

describe('ErrorHandler', () => {
  it('debe mapear NotFoundError a 404', () => {
    const mockReply = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const mockLog = { error: jest.fn(), warn: jest.fn() };
    const error = new NotFoundError('Marca no encontrada');

    ErrorHandler.handle(error, mockReply as any, mockLog as any);

    expect(mockReply.status).toHaveBeenCalledWith(404);
    expect(mockReply.send).toHaveBeenCalledWith({
      error: 'No encontrado',
      message: 'Marca no encontrada',
    });
  });
});
```

### Integration Test de Rutas

```typescript
describe('GET /marcas/:id', () => {
  it('debe retornar 404 si no existe', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/marcas/9999',
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({
      error: 'No encontrado',
      message: expect.any(String),
    });
  });
});
```

---

## 9. Seguridad

### Validación de Inputs

✅ **Ya implementado:**
- Zod valida tipos y longitudes
- `maxLength` en schemas previene ataques de buffer overflow
- Sanitización de logs (passwords redactados)

### Mejoras Futuras

1. **Rate Limiting:**
   ```typescript
   import rateLimit from '@fastify/rate-limit';
   app.register(rateLimit, {
     max: 100,
     timeWindow: '15 minutes'
   });
   ```

2. **CSRF Protection:**
   ```typescript
   import fastifyCsrf from '@fastify/csrf-protection';
   app.register(fastifyCsrf);
   ```

3. **Helmet (Headers de seguridad):**
   ```typescript
   import helmet from '@fastify/helmet';
   app.register(helmet);
   ```

4. **Auth con JWT:**
   ```typescript
   import fastifyJwt from '@fastify/jwt';
   app.register(fastifyJwt, { secret: process.env.JWT_SECRET });
   ```

---

## 10. Roadmap de Mejoras Progresivas

### ✅ Completado (Fase 1)
- [x] Error handling centralizado
- [x] DTOs explícitos
- [x] Logging de requests
- [x] CORS seguro (whitelist)

### 🟡 Recomendado (Fase 2)
- [ ] Validador helper reutilizable
- [ ] Unit tests del middleware
- [ ] Documentación OpenAPI mejorada (generar desde DTOs)
- [ ] Observabilidad (Prometheus metrics)

### 🟠 Largo Plazo (Fase 3+)
- [ ] IoC Container (`tsyringe`)
- [ ] Feature-based structure
- [ ] Event Domain Pattern
- [ ] API Versioning (`/v1/`, `/v2/`)
- [ ] GraphQL (opcional)

---

## 11. Ejemplo ANTES/DESPUÉS: Refactorización Completa

### ❌ ANTES (Código duplicado, sin DTOs)

**scraperRoutes.ts:**
```typescript
// Duplicación de handleError
function handleError(error: unknown, reply: FastifyReply, log: FastifyRequest['log']): FastifyReply {
  if (error instanceof LoginError) { /* 20 líneas */ }
  if (error instanceof InvalidParamsError) { /* ... */ }
  // ... resto del código
}

fastify.post('/scraper/productos', async (request, reply) => {
  try {
    const parsed = SearchProductsSchema.safeParse(request.body);
    if (!parsed.success) { /* ... */ }
    const params = parsed.data; // ¿Es DTO o schema?
    const result = await useCase.execute(params);
    return reply.status(200).send(result);
  } catch (error) {
    return handleError(error, reply, request.log); // Acoplado a handleError
  }
});
```

**marcasRoutes.ts:**
```typescript
// MISMA FUNCIÓN DUPLICADA
function handleError(error: unknown, reply: FastifyReply, log: FastifyRequest['log']): FastifyReply {
  if (error instanceof NotFoundError) { /* ... */ }
  // ... código casi idéntico
}

fastify.get('/marcas/:id', async (request, reply) => {
  // No hay DTOs, tipos implícitos
  const id = parseInt(request.params.id, 10);
  const marca = await service.getById(id);
  return reply.status(200).send(marca);
});
```

### ✅ DESPUÉS (Centralizado, con DTOs, logging)

**middleware/errorHandler.ts (NUEVO):**
```typescript
export class ErrorHandler {
  static handle(
    error: unknown,
    reply: FastifyReply,
    log: FastifyRequest['log'],
  ): FastifyReply {
    if (error instanceof LoginError) { /* ... */ }
    if (error instanceof NotFoundError) { /* ... */ }
    // ... TODA la lógica en UN lugar
  }
}
```

**dtos/SearchProductsDTO.ts (NUEVO):**
```typescript
export interface SearchProductsRequestDTO {
  codigoAuto: string;
  marcaId: string;
  rubroId: string;
  cantidadRenglones: number;
}

export interface SearchProductsResponseDTO {
  params: SearchProductsRequestDTO;
  totalProductos: number;
  productos: ProductDTO[];
}
```

**routes/scraperRoutes.ts (REFACTORIZADO):**
```typescript
import { ErrorHandler } from '../middleware';
import { SearchProductsRequestDTO, SearchProductsResponseDTO } from '../dtos';

fastify.post('/scraper/productos', async (request, reply) => {
  try {
    const parsed = SearchProductsSchema.safeParse(request.body);
    if (!parsed.success) { /* ... */ }
    
    const requestData: SearchProductsRequestDTO = parsed.data;
    const response: SearchProductsResponseDTO = await useCase.execute(requestData);
    
    return reply.status(200).send(response);
  } catch (error) {
    return ErrorHandler.handle(error, reply, request.log); // Centralizado
  }
});
```

**routes/marcasRoutes.ts (REFACTORIZADO):**
```typescript
import { ErrorHandler } from '../middleware';
import { MarcaDTO, CreateMarcaRequestDTO } from '../dtos';

fastify.post('/marcas', async (request, reply) => {
  const parsed = CreateMarcaSchema.safeParse(request.body);
  if (!parsed.success) { /* ... */ }
  
  const requestData: CreateMarcaRequestDTO = parsed.data;
  const response: MarcaDTO = await service.create(requestData);
  
  return reply.status(201).send(response);
});
```

**Cambios principales:**
- ✅ `handleError()` → `ErrorHandler.handle()` (centralizado)
- ✅ Tipos implícitos → DTOs explícitos
- ✅ Código duplicado eliminado
- ✅ Logging automático de requests
- ✅ CORS seguro

---

## 12. Checklist de Implementación

### Para nuevos endpoints

- [ ] Crear DTO en `src/interface/dtos/`
- [ ] Crear schema Zod en `src/interface/schemas/`
- [ ] Crear error customizado en `src/domain/errors/` si es necesario
- [ ] Implementar service/usecase en `src/application/`
- [ ] Crear route usando `ErrorHandler.handle()`
- [ ] Validar con Zod + retornar DTO tipado
- [ ] Escribir unit test de service
- [ ] Escribir integration test de endpoint
- [ ] Documentar en README o Swagger

### Para refactorizar endpoint existente

- [ ] Extraer `handleError()` local → usar `ErrorHandler`
- [ ] Crear DTOs correspondientes
- [ ] Remover lógica duplicada
- [ ] Actualizar tipos implícitos
- [ ] Verificar tests siguen pasando
- [ ] Validar no hay cambios en respuesta HTTP

---

## 13. Referencias Internas

### Archivos Clave del Proyecto

- 📄 **src/domain/errors/index.ts** — Clases de error del dominio
- 📄 **src/interface/middleware/errorHandler.ts** — Manejo centralizado de errores
- 📄 **src/interface/middleware/requestLogger.ts** — Logging de requests/responses
- 📄 **src/interface/dtos/** — Tipos de transferencia
- 📄 **src/interface/schemas/** — Validación con Zod
- 📄 **src/server.ts** — Entry point + composición

### Relacionado

- 📘 **Skills asociados:** `error.skill`, `validation.skill`, `http.skill`
- 📖 **Documentación externa:** [Fastify Docs](https://www.fastify.io/), [Zod](https://zod.dev/), [Clean Architecture](https://blog.cleancoder.com/)

---

## Notas Finales

Este documento describe la arquitectura **ACTUAL** (post-refactorización Fase 1) y la **VISIÓN** para evolucionar.

**Tu proyecto está bien estructurado.** Los cambios implementados mejoran:
- 🎯 **Mantenibilidad:** Código centralizado, DRY principle
- 🛡️ **Seguridad:** CORS whitelist, sanitización
- 📊 **Observabilidad:** Logging completo
- 🧪 **Testabilidad:** Componentes desacoplados

**Próximos pasos:** Aplicar skills `error.skill`, `validation.skill`, `http.skill` a nuevas features.
