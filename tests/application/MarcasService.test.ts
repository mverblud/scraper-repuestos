import { MarcasService } from '../../src/application/MarcasService';
import { MarcaRepository } from '../../src/domain/ports/MarcaRepository';
import { Marca } from '../../src/domain/entities/Marca';
import { NotFoundError, ConflictError } from '../../src/domain/errors';

const mockMarcas: Marca[] = [
  { marcaId: 1, marcaName: 'TOYOTA', marcaHabilitado: true },
  { marcaId: 2, marcaName: 'FORD',   marcaHabilitado: false },
];

function buildRepo(overrides: Partial<MarcaRepository> = {}): MarcaRepository {
  return {
    findAll:  jest.fn().mockResolvedValue([...mockMarcas]),
    findById: jest.fn().mockImplementation((id: number) =>
      Promise.resolve(mockMarcas.find((m) => m.marcaId === id) ?? null),
    ),
    create:   jest.fn().mockImplementation((data) =>
      Promise.resolve({ marcaId: 99, ...data }),
    ),
    update:   jest.fn().mockImplementation((id: number, data) => {
      const found = mockMarcas.find((m) => m.marcaId === id);
      return Promise.resolve(found ? { ...found, ...data } : null);
    }),
    delete:   jest.fn().mockImplementation((id: number) =>
      Promise.resolve(mockMarcas.some((m) => m.marcaId === id)),
    ),
    ...overrides,
  };
}

describe('MarcasService', () => {
  describe('getAll', () => {
    it('returns all marcas', async () => {
      const service = new MarcasService(buildRepo());
      const result = await service.getAll();
      expect(result).toHaveLength(2);
    });
  });

  describe('getById', () => {
    it('returns marca when found', async () => {
      const service = new MarcasService(buildRepo());
      const result = await service.getById(1);
      expect(result.marcaName).toBe('TOYOTA');
    });

    it('throws NotFoundError when not found', async () => {
      const service = new MarcasService(buildRepo());
      await expect(service.getById(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('creates a new marca', async () => {
      const service = new MarcasService(buildRepo());
      const result = await service.create({ marcaName: 'HONDA' });
      expect(result.marcaName).toBe('HONDA');
      expect(result.marcaHabilitado).toBe(true);
    });

    it('throws ConflictError when name already exists', async () => {
      const service = new MarcasService(buildRepo());
      await expect(service.create({ marcaName: 'toyota' })).rejects.toThrow(ConflictError);
    });
  });

  describe('update', () => {
    it('updates an existing marca', async () => {
      const service = new MarcasService(buildRepo());
      const result = await service.update(1, { marcaName: 'TOYOTA UPDATED' });
      expect(result.marcaName).toBe('TOYOTA UPDATED');
    });

    it('throws NotFoundError when marca does not exist', async () => {
      const service = new MarcasService(buildRepo());
      await expect(service.update(999, { marcaName: 'X' })).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError when new name conflicts with another marca', async () => {
      const service = new MarcasService(buildRepo());
      await expect(service.update(1, { marcaName: 'ford' })).rejects.toThrow(ConflictError);
    });
  });

  describe('delete', () => {
    it('deletes an existing marca', async () => {
      const service = new MarcasService(buildRepo());
      await expect(service.delete(1)).resolves.toBeUndefined();
    });

    it('throws NotFoundError when marca does not exist', async () => {
      const service = new MarcasService(buildRepo());
      await expect(service.delete(999)).rejects.toThrow(NotFoundError);
    });
  });
});
