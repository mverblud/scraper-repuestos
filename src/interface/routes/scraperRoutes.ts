import { FastifyInstance, FastifyRequest, FastifyReply, FastifyError } from 'fastify';

import { SearchProductsUseCase } from '../../application';
import { SearchProductsSchema } from '../schemas';
import {
  LoginError,
  ProviderError,
  InvalidParamsError,
  ParsingError,
} from '../../domain';

const productSchema = {
  type: 'object',
  properties: {
    codigo:         { type: 'string' },
    marca:          { type: 'string' },
    rubro:          { type: 'string' },
    nombre:         { type: 'string' },
    porcentajeIVA:  { type: 'number' },
    precio:         { type: 'number' },
    foto:           { type: 'string', nullable: true },
    descuento:      { type: 'number' },
    costo:          { type: 'number' },
    precioSugerido: { type: 'number' },
  },
};

const errorSchema = {
  type: 'object',
  properties: {
    error:   { type: 'string' },
    message: { type: 'string' },
  },
};

const searchProductsRouteSchema = {
  tags: ['scraper'],
  summary: 'Buscar productos en el catálogo del proveedor',
  body: {
    type: 'object',
    properties: {
      codigoAuto:        { type: 'string', maxLength: 200, default: '', description: 'Código del vehículo' },
      marcaId:           { type: 'string', maxLength: 10,  default: '', description: 'ID de la marca' },
      rubroId:           { type: 'string', maxLength: 10,  default: '', description: 'ID del rubro' },
      cantidadRenglones: { type: 'integer', minimum: 1, maximum: 500, default: 50, description: 'Cantidad máxima de resultados' },
    },
  },
  response: {
    200: {
      description: 'Búsqueda exitosa',
      type: 'object',
      properties: {
        params:          { type: 'object' },
        totalProductos:  { type: 'integer' },
        productos:       { type: 'array', items: productSchema },
      },
    },
    400: { description: 'Parámetros inválidos',           ...errorSchema },
    401: { description: 'Error de autenticación',         ...errorSchema },
    502: { description: 'Error del proveedor o parsing',  ...errorSchema },
    500: { description: 'Error interno del servidor',     ...errorSchema },
  },
};

/**
 * Registra las rutas de scraping de productos como plugin Fastify.
 */
export function scraperRoutes(useCase: SearchProductsUseCase) {
  return async function (fastify: FastifyInstance): Promise<void> {
    // Unifica el formato de errores de validación de schema con los de Zod
    fastify.setErrorHandler((error: FastifyError, request, reply) => {
      if (error.validation) {
        return reply.status(400).send({
          error: 'Parámetros inválidos',
          details: error.validation,
        });
      }
      return handleError(error, reply, request.log);
    });

    fastify.post(
      '/scraper/productos',
      { schema: searchProductsRouteSchema },
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
