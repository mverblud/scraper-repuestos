import Fastify from 'fastify';
import { marcasRoutes } from '../../../src/interface/routes/marcasRoutes';
import { MarcasService } from '../../../src/application/MarcasService';
import { NotFoundError, ConflictError } from '../../../src/domain/errors';

function buildMockService(overrides: Partial<MarcasService> = {}): MarcasService {
  return {
    getAll:   jest.fn().mockResolvedValue([
      { marcaId: 1, marcaName: 'TOYOTA', marcaHabilitado: true },
    ]),
    getById:  jest.fn().mockResolvedValue({ marcaId: 1, marcaName: 'TOYOTA', marcaHabilitado: true }),
    create:   jest.fn().mockResolvedValue({ marcaId: 99, marcaName: 'HONDA', marcaHabilitado: true }),
    update:   jest.fn().mockResolvedValue({ marcaId: 1, marcaName: 'TOYOTA UPDATED', marcaHabilitado: true }),
    delete:   jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as MarcasService;
}

async function buildApp(service: MarcasService) {
  const app = Fastify();
  app.register(marcasRoutes(service));
  await app.ready();
  return app;
}

describe('marcasRoutes', () => {
  describe('GET /marcas', () => {
    it('returns 200 with list', async () => {
      const app = await buildApp(buildMockService());
      const res = await app.inject({ method: 'GET', url: '/marcas' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveLength(1);
    });
  });

  describe('GET /marcas/:id', () => {
    it('returns 200 when found', async () => {
      const app = await buildApp(buildMockService());
      const res = await app.inject({ method: 'GET', url: '/marcas/1' });
      expect(res.statusCode).toBe(200);
      expect(res.json().marcaName).toBe('TOYOTA');
    });

    it('returns 404 when not found', async () => {
      const service = buildMockService({ getById: jest.fn().mockRejectedValue(new NotFoundError()) });
      const app = await buildApp(service);
      const res = await app.inject({ method: 'GET', url: '/marcas/999' });
      expect(res.statusCode).toBe(404);
    });

    it('returns 400 for non-numeric id', async () => {
      const app = await buildApp(buildMockService());
      const res = await app.inject({ method: 'GET', url: '/marcas/abc' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /marcas', () => {
    it('returns 201 on success', async () => {
      const app = await buildApp(buildMockService());
      const res = await app.inject({
        method: 'POST', url: '/marcas',
        payload: { marcaName: 'HONDA' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().marcaName).toBe('HONDA');
    });

    it('returns 400 when marcaName is missing', async () => {
      const app = await buildApp(buildMockService());
      const res = await app.inject({ method: 'POST', url: '/marcas', payload: {} });
      expect(res.statusCode).toBe(400);
    });

    it('returns 409 on conflict', async () => {
      const service = buildMockService({ create: jest.fn().mockRejectedValue(new ConflictError()) });
      const app = await buildApp(service);
      const res = await app.inject({
        method: 'POST', url: '/marcas',
        payload: { marcaName: 'TOYOTA' },
      });
      expect(res.statusCode).toBe(409);
    });
  });

  describe('PUT /marcas/:id', () => {
    it('returns 200 on success', async () => {
      const app = await buildApp(buildMockService());
      const res = await app.inject({
        method: 'PUT', url: '/marcas/1',
        payload: { marcaName: 'TOYOTA UPDATED' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().marcaName).toBe('TOYOTA UPDATED');
    });

    it('returns 404 when not found', async () => {
      const service = buildMockService({ update: jest.fn().mockRejectedValue(new NotFoundError()) });
      const app = await buildApp(service);
      const res = await app.inject({
        method: 'PUT', url: '/marcas/999',
        payload: { marcaName: 'X' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 409 on conflict', async () => {
      const service = buildMockService({ update: jest.fn().mockRejectedValue(new ConflictError()) });
      const app = await buildApp(service);
      const res = await app.inject({
        method: 'PUT', url: '/marcas/1',
        payload: { marcaName: 'FORD' },
      });
      expect(res.statusCode).toBe(409);
    });
  });

  describe('DELETE /marcas/:id', () => {
    it('returns 204 on success', async () => {
      const app = await buildApp(buildMockService());
      const res = await app.inject({ method: 'DELETE', url: '/marcas/1' });
      expect(res.statusCode).toBe(204);
    });

    it('returns 404 when not found', async () => {
      const service = buildMockService({ delete: jest.fn().mockRejectedValue(new NotFoundError()) });
      const app = await buildApp(service);
      const res = await app.inject({ method: 'DELETE', url: '/marcas/999' });
      expect(res.statusCode).toBe(404);
    });
  });
});
