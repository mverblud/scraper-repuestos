import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { SearchProductsUseCase } from '../../application';
import { SearchProductsSchema } from '../schemas';
import {
  LoginError,
  ProviderError,
  InvalidParamsError,
  ParsingError,
} from '../../domain';

/**
 * Registra las rutas de scraping de productos como plugin Fastify.
 */
export function scraperRoutes(useCase: SearchProductsUseCase) {
  return async function (fastify: FastifyInstance): Promise<void> {
    fastify.post(
      '/scraper/productos',
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          // 1. Validar body
          const parsed = SearchProductsSchema.safeParse(request.body);

          if (!parsed.success) {
            return reply.status(400).send({
              error: 'Parámetros inválidos',
              details: parsed.error.flatten().fieldErrors,
            });
          }

          const params = parsed.data;

          // 2. Ejecutar caso de uso
          const result = await useCase.execute({
            codigoAuto: params.codigoAuto,
            marcaId: params.marcaId,
            rubroId: params.rubroId,
            cantidadRenglones: params.cantidadRenglones,
          });

          // 3. Retornar respuesta exitosa
          return reply.status(200).send(result);
        } catch (error) {
          return handleError(error, reply, request.log);
        }
      },
    );
  };
}

/**
 * Mapea errores de dominio a códigos HTTP apropiados.
 */
function handleError(
  error: unknown,
  reply: FastifyReply,
  log: FastifyRequest['log'],
): FastifyReply {
  if (error instanceof LoginError) {
    log.warn({ err: error }, 'Error de autenticación con proveedor');
    return reply.status(401).send({
      error: 'Error de autenticación',
      message: error.message,
    });
  }

  if (error instanceof InvalidParamsError) {
    return reply.status(400).send({
      error: 'Parámetros inválidos',
      message: error.message,
    });
  }

  if (error instanceof ProviderError) {
    log.error({ err: error }, 'Error del proveedor');
    return reply.status(502).send({
      error: 'Error del proveedor',
      message: error.message,
    });
  }

  if (error instanceof ParsingError) {
    log.error({ err: error }, 'Error de parsing');
    return reply.status(502).send({
      error: 'Error al interpretar respuesta del proveedor',
      message: error.message,
    });
  }

  // Error no controlado
  log.error({ err: error }, 'Error interno no controlado');
  return reply.status(500).send({
    error: 'Error interno del servidor',
    message: 'Ocurrió un error inesperado',
  });
}
