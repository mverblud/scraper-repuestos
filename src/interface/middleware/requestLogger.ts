import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Hook de logging para requests.
 *
 * Se ejecuta cuando llega un request (onRequest hook).
 */
export async function onRequestLogger(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const sanitizedBody = sanitizeBody(request.body);
  request.log.info(
    {
      method: request.method,
      url: request.url,
      query: request.query,
      body: sanitizedBody,
    },
    'Incoming request',
  );
}

/**
 * Hook de logging para responses.
 *
 * Se ejecuta después que la response se envía (onResponse hook).
 */
export async function onResponseLogger(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Nota: La duración se calcula desde el inicio de onRequest
  // Para duración exacta, usar startTime guardado en request.startTime
  const startTime = (request as any).startTime || Date.now();
  const duration = Date.now() - startTime;

  request.log.info(
    {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
    },
    'Request completed',
  );
}

/**
 * Sanitiza el body removiendo campos sensibles (passwords, tokens, etc).
 */
function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'credentials'];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      (sanitized as Record<string, unknown>)[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Registra los middlewares de logging en la aplicación Fastify.
 *
 * Registra dos hooks:
 * - onRequest: loguea entrada del request
 * - onResponse: loguea salida (con duración)
 *
 * Nota: startTime se guarda en request.startTime para calcular duración.
 *
 * Uso en server.ts:
 * registerRequestLogger(app);
 */
export function registerRequestLogger(app: FastifyInstance): void {
  // Pre-request hook: guardar timestamp inicial
  app.addHook('onRequest', async (request: FastifyRequest) => {
    (request as any).startTime = Date.now();
  });

  // Request hook: loguear entrada
  app.addHook('onRequest', onRequestLogger);

  // Response hook: loguear salida con duración
  app.addHook('onResponse', onResponseLogger);
}
