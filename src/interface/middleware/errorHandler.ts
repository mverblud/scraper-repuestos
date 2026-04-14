import { FastifyReply, FastifyRequest } from 'fastify';

import {
  LoginError,
  ProviderError,
  InvalidParamsError,
  ParsingError,
  NotFoundError,
  ConflictError,
} from '../../domain/errors';

/**
 * Middleware centralizado para manejo de errores.
 *
 * Mapea errores de dominio a códigos HTTP apropiados.
 * Reemplazó handleError() local en scraperRoutes y marcasRoutes.
 */
export class ErrorHandler {
  /**
   * Maneja cualquier error y retorna una respuesta HTTP apropiada.
   */
  static handle(
    error: unknown,
    reply: FastifyReply,
    log: FastifyRequest['log'],
  ): FastifyReply {
    // Errores del dominio (scraper)
    if (error instanceof LoginError) {
      log.warn({ err: error }, 'Error de autenticación con proveedor');
      return reply.status(401).send({
        error: 'Error de autenticación',
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

    // Errores del dominio (marcas)
    if (error instanceof NotFoundError) {
      return reply.status(404).send({
        error: 'No encontrado',
        message: error.message,
      });
    }

    if (error instanceof ConflictError) {
      return reply.status(409).send({
        error: 'Conflicto',
        message: error.message,
      });
    }

    if (error instanceof InvalidParamsError) {
      return reply.status(400).send({
        error: 'Parámetros inválidos',
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
}
