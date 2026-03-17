import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SearchProductsUseCase } from '../../src/application/SearchProductsUseCase';
import { ProductSearcher, SearchParams, SearchResult, Product } from '../../src/domain';

describe('SearchProductsUseCase', () => {
  let mockSearcher: jest.Mocked<ProductSearcher>;
  let useCase: SearchProductsUseCase;

  beforeEach(() => {
    mockSearcher = {
      search: jest.fn<ProductSearcher['search']>(),
    } as jest.Mocked<ProductSearcher>;

    useCase = new SearchProductsUseCase(mockSearcher);
  });

  describe('execute', () => {
    it('should call searcher.search with correct params', async () => {
      const params: SearchParams = {
        codigoAuto: '123',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      const mockResult: SearchResult = {
        params,
        totalProductos: 0,
        productos: [],
      };

      mockSearcher.search.mockResolvedValue(mockResult);

      await useCase.execute(params);

      expect(mockSearcher.search).toHaveBeenCalledTimes(1);
      expect(mockSearcher.search).toHaveBeenCalledWith(params);
    });

    it('should return search result with empty products', async () => {
      const params: SearchParams = {
        codigoAuto: '123',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      const mockResult: SearchResult = {
        params,
        totalProductos: 0,
        productos: [],
      };

      mockSearcher.search.mockResolvedValue(mockResult);

      const result = await useCase.execute(params);

      expect(result).toEqual(mockResult);
      expect(result.totalProductos).toBe(0);
      expect(result.productos).toHaveLength(0);
    });

    it('should return search result with products', async () => {
      const params: SearchParams = {
        codigoAuto: 'FILTRO',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      const mockProducts: Product[] = [
        {
          codigo: 'ABC123',
          marca: 'BOSCH',
          rubro: 'FILTROS',
          nombre: 'Filtro de Aceite',
          porcentajeIVA: 21,
          precio: 1000,
          foto: null,
          descuento: 55,
          costo: 450,
          precioSugerido: 585,
        },
        {
          codigo: 'DEF456',
          marca: 'MANN',
          rubro: 'FILTROS',
          nombre: 'Filtro de Aire',
          porcentajeIVA: 21,
          precio: 800,
          foto: 'https://example.com/photo.jpg',
          descuento: 55,
          costo: 360,
          precioSugerido: 468,
        },
      ];

      const mockResult: SearchResult = {
        params,
        totalProductos: 2,
        productos: mockProducts,
      };

      mockSearcher.search.mockResolvedValue(mockResult);

      const result = await useCase.execute(params);

      expect(result).toEqual(mockResult);
      expect(result.totalProductos).toBe(2);
      expect(result.productos).toHaveLength(2);
      expect(result.productos[0].codigo).toBe('ABC123');
      expect(result.productos[1].codigo).toBe('DEF456');
    });

    it('should propagate errors from searcher', async () => {
      const params: SearchParams = {
        codigoAuto: '123',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      const error = new Error('Network error');
      mockSearcher.search.mockRejectedValue(error);

      await expect(useCase.execute(params)).rejects.toThrow('Network error');
      expect(mockSearcher.search).toHaveBeenCalledTimes(1);
    });

    it('should handle large number of products', async () => {
      const params: SearchParams = {
        codigoAuto: 'TEST',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 500,
      };

      const mockProducts: Product[] = Array.from({ length: 500 }, (_, i) => ({
        codigo: `CODE${i}`,
        marca: 'BOSCH',
        rubro: 'VARIOS',
        nombre: `Producto ${i}`,
        porcentajeIVA: 21,
        precio: 100 + i,
        foto: null,
        descuento: 55,
        costo: 45 + i,
        precioSugerido: 58.5 + i,
      }));

      const mockResult: SearchResult = {
        params,
        totalProductos: 500,
        productos: mockProducts,
      };

      mockSearcher.search.mockResolvedValue(mockResult);

      const result = await useCase.execute(params);

      expect(result.totalProductos).toBe(500);
      expect(result.productos).toHaveLength(500);
    });

    it('should preserve params in result', async () => {
      const params: SearchParams = {
        codigoAuto: 'ABC',
        marcaId: '99',
        rubroId: '88',
        cantidadRenglones: 25,
      };

      const mockResult: SearchResult = {
        params,
        totalProductos: 0,
        productos: [],
      };

      mockSearcher.search.mockResolvedValue(mockResult);

      const result = await useCase.execute(params);

      expect(result.params).toEqual(params);
      expect(result.params.codigoAuto).toBe('ABC');
      expect(result.params.marcaId).toBe('99');
      expect(result.params.rubroId).toBe('88');
      expect(result.params.cantidadRenglones).toBe(25);
    });
  });
});
