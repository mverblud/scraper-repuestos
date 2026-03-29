import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { MarcasService } from '../../application';
import { CreateMarcaSchema, UpdateMarcaSchema } from '../schemas';
import { NotFoundError, ConflictError, InvalidParamsError } from '../../domain';

// ─── OpenAPI schemas ────────────────────────────────────────────────────

const marcaSchema = {
  type: 'object',
  properties: {
    marcaId:         { type: 'integer' },
    marcaName:       { type: 'string' },
    marcaHabilitado: { type: 'boolean' },
  },
};

const errorSchema = {
  type: 'object',
  properties: {
    error:   { type: 'string' },
    message: { type: 'string' },
  },
};

const commonErrors = {
  400: { description: 'Parámetros inválidos', ...errorSchema },
  500: { description: 'Error interno del servidor', ...errorSchema },
};

// ─── Plugin ─────────────────────────────────────────────────────────────

export function marcasRoutes(service: MarcasService) {
  return async function (fastify: FastifyInstance): Promise<void> {
    fastify.setErrorHandler((error, request, reply) => {
      if ((error as { validation?: unknown }).validation) {
        return reply.status(400).send({ error: 'Parámetros inválidos', details: (error as { validation: unknown }).validation });
      }
      return handleError(error, reply, request.log);
    });

    // GET /marcas
    fastify.get('/marcas', {
      schema: {
        tags: ['marcas'],
        summary: 'Listar todas las marcas',
        response: {
          200: { description: 'Lista de marcas', type: 'array', items: marcaSchema },
          ...commonErrors,
        },
      },
    }, async (_req, reply) => {
      const marcas = await service.getAll();
      return reply.status(200).send(marcas);
    });

    // GET /marcas/:id
    fastify.get<{ Params: { id: string } }>('/marcas/:id', {
      schema: {
        tags: ['marcas'],
        summary: 'Obtener una marca por ID',
        params: {
          type: 'object',
          properties: { id: { type: 'integer' } },
          required: ['id'],
        },
        response: {
          200: { description: 'Marca encontrada', ...marcaSchema },
          404: { description: 'Marca no encontrada', ...errorSchema },
          ...commonErrors,
        },
      },
    }, async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Parámetros inválidos', message: 'El id debe ser un número entero' });
      }
      const marca = await service.getById(id);
      return reply.status(200).send(marca);
    });

    // POST /marcas
    fastify.post('/marcas', {
      schema: {
        tags: ['marcas'],
        summary: 'Crear una nueva marca',
        body: {
          type: 'object',
          required: ['marcaName'],
          properties: {
            marcaName:       { type: 'string', maxLength: 100, description: 'Nombre de la marca' },
            marcaHabilitado: { type: 'boolean', default: true, description: 'Si la marca está habilitada' },
          },
        },
        response: {
          201: { description: 'Marca creada', ...marcaSchema },
          409: { description: 'Conflicto: ya existe una marca con ese nombre', ...errorSchema },
          ...commonErrors,
        },
      },
    }, async (request, reply) => {
      const parsed = CreateMarcaSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Parámetros inválidos',
          details: parsed.error.flatten().fieldErrors,
        });
      }
      const marca = await service.create(parsed.data);
      return reply.status(201).send(marca);
    });

    // PUT /marcas/:id
    fastify.put<{ Params: { id: string } }>('/marcas/:id', {
      schema: {
        tags: ['marcas'],
        summary: 'Actualizar una marca',
        params: {
          type: 'object',
          properties: { id: { type: 'integer' } },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            marcaName:       { type: 'string', maxLength: 100 },
            marcaHabilitado: { type: 'boolean' },
          },
        },
        response: {
          200: { description: 'Marca actualizada', ...marcaSchema },
          404: { description: 'Marca no encontrada', ...errorSchema },
          409: { description: 'Conflicto: nombre ya en uso', ...errorSchema },
          ...commonErrors,
        },
      },
    }, async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Parámetros inválidos', message: 'El id debe ser un número entero' });
      }
      const parsed = UpdateMarcaSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Parámetros inválidos',
          details: parsed.error.flatten().fieldErrors,
        });
      }
      const marca = await service.update(id, parsed.data);
      return reply.status(200).send(marca);
    });

    // DELETE /marcas/:id
    fastify.delete<{ Params: { id: string } }>('/marcas/:id', {
      schema: {
        tags: ['marcas'],
        summary: 'Eliminar una marca',
        params: {
          type: 'object',
          properties: { id: { type: 'integer' } },
          required: ['id'],
        },
        response: {
          204: { description: 'Marca eliminada', type: 'null' },
          404: { description: 'Marca no encontrada', ...errorSchema },
          ...commonErrors,
        },
      },
    }, async (request, reply) => {
      const id = parseInt(request.params.id, 10);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Parámetros inválidos', message: 'El id debe ser un número entero' });
      }
      await service.delete(id);
      return reply.status(204).send();
    });
  };
}

// ─── Error handler ───────────────────────────────────────────────────────

function handleError(
  error: unknown,
  reply: FastifyReply,
  log: FastifyRequest['log'],
): FastifyReply {
  if (error instanceof NotFoundError) {
    return reply.status(404).send({ error: 'No encontrado', message: error.message });
  }

  if (error instanceof ConflictError) {
    return reply.status(409).send({ error: 'Conflicto', message: error.message });
  }

  if (error instanceof InvalidParamsError) {
    return reply.status(400).send({ error: 'Parámetros inválidos', message: error.message });
  }

  log.error({ err: error }, 'Error interno no controlado');
  return reply.status(500).send({ error: 'Error interno del servidor', message: 'Ocurrió un error inesperado' });
}
