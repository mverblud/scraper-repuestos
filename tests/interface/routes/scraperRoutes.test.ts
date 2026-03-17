import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
import { scraperRoutes } from '../../../src/interface/routes/scraperRoutes';
import { SearchProductsUseCase } from '../../../src/application/SearchProductsUseCase';
import {
  LoginError,
  ProviderError,
  InvalidParamsError,
  ParsingError,
  SearchResult,
  SearchParams,
} from '../../../src/domain';

describe('scraperRoutes', () => {
  let app: FastifyInstance;
  let mockUseCase: jest.Mocked<SearchProductsUseCase>;

  beforeEach(async () => {
    mockUseCase = {
      execute: jest.fn<SearchProductsUseCase['execute']>(),
    } as any;

    app = Fastify();
    await app.register(scraperRoutes(mockUseCase));
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /scraper/productos', () => {
    it('should return 200 with valid request', async () => {
      const requestBody = {
        codigoAuto: 'FILTRO',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      const mockResult: SearchResult = {
        params: requestBody,
        totalProductos: 1,
        productos: [
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
        ],
      };

      mockUseCase.execute.mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'POST',
        url: '/scraper/productos',
        payload: requestBody,
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.totalProductos).toBe(1);
      expect(json.productos).toHaveLength(1);
      expect(json.productos[0].codigo).toBe('ABC123');
      expect(mockUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return 200 with empty results', async () => {
      const requestBody = {
        codigoAuto: 'NOEXISTE',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      const mockResult: SearchResult = {
        params: requestBody,
        totalProductos: 0,
        productos: [],
      };

      mockUseCase.execute.mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'POST',
        url: '/scraper/productos',
        payload: requestBody,
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.totalProductos).toBe(0);
      expect(json.productos).toHaveLength(0);
    });

    it('should return 200 with default values', async () => {
      const mockResult: SearchResult = {
        params: {
          codigoAuto: '',
          marcaId: '',
          rubroId: '',
          cantidadRenglones: 50,
        },
        totalProductos: 0,
        productos: [],
      };

      mockUseCase.execute.mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'POST',
        url: '/scraper/productos',
        payload: {},
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 for invalid cantidadRenglones (too high)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/scraper/productos',
        payload: {
          cantidadRenglones: 501,
        },
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.error).toBe('Parámetros inválidos');
    });

    it('should return 400 for invalid cantidadRenglones (too low)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/scraper/productos',
        payload: {
          cantidadRenglones: 0,
        },
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.error).toBe('Parámetros inválidos');
    });

    it('should return 400 for invalid cantidadRenglones (not integer)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/scraper/productos',
        payload: {
          cantidadRenglones: 50.5,
        },
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.error).toBe('Parámetros inválidos');
    });

    it('should return 400 for codigoAuto too long', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/scraper/productos',
        payload: {
          codigoAuto: 'A'.repeat(201),
        },
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.error).toBe('Parámetros inválidos');
    });

    it('should return 400 for marcaId too long', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/scraper/productos',
        payload: {
          marcaId: '12345678901',
        },
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.error).toBe('Parámetros inválidos');
    });

    it('should return 400 for rubroId too long', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/scraper/productos',
        payload: {
          rubroId: '12345678901',
        },
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.error).toBe('Parámetros inválidos');
    });

    it('should return 401 for LoginError', async () => {
      mockUseCase.execute.mockRejectedValue(new LoginError('Invalid credentials'));

      const response = await app.inject({
        method: 'POST',
        url: '/scraper/productos',
        payload: {
          codigoAuto: 'TEST',
        },
      });

      expect(response.statusCode).toBe(401);
      const json = response.json();
      expect(json.error).toBe('Error de autenticación');
      expect(json.message).toBe('Invalid credentials');
    });

    it('should return 400 for InvalidParamsError', async () => {
      mockUseCase.execute.mockRejectedValue(new InvalidParamsError('Missing field'));

      const response = await app.inject({
        method: 'POST',
        url: '/scraper/productos',
        payload: {
          codigoAuto: 'TEST',
        },
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.error).toBe('Parámetros inválidos');
      expect(json.message).toBe('Missing field');
    });

    it('should return 502 for ProviderError', async () => {
      mockUseCase.execute.mockRejectedValue(new ProviderError('Connection timeout'));

      const response = await app.inject({
        method: 'POST',
        url: '/scraper/productos',
        payload: {
          codigoAuto: 'TEST',
        },
      });

      expect(response.statusCode).toBe(502);
      const json = response.json();
      expect(json.error).toBe('Error del proveedor');
      expect(json.message).toBe('Connection timeout');
    });

    it('should return 502 for ParsingError', async () => {
      mockUseCase.execute.mockRejectedValue(new ParsingError('HTML changed'));

      const response = await app.inject({
        method: 'POST',
        url: '/scraper/productos',
        payload: {
          codigoAuto: 'TEST',
        },
      });

      expect(response.statusCode).toBe(502);
      const json = response.json();
      expect(json.error).toBe('Error al interpretar respuesta del proveedor');
      expect(json.message).toBe('HTML changed');
    });

    it('should return 500 for unhandled errors', async () => {
      mockUseCase.execute.mockRejectedValue(new Error('Unexpected error'));

      const response = await app.inject({
        method: 'POST',
        url: '/scraper/productos',
        payload: {
          codigoAuto: 'TEST',
        },
      });

      expect(response.statusCode).toBe(500);
      const json = response.json();
      expect(json.error).toBe('Error interno del servidor');
    });

    it('should handle TypeError', async () => {
      mockUseCase.execute.mockRejectedValue(new TypeError('Type error'));

      const response = await app.inject({
        method: 'POST',
        url: '/scraper/productos',
        payload: {
          codigoAuto: 'TEST',
        },
      });

      expect(response.statusCode).toBe(500);
      const json = response.json();
      expect(json.error).toBe('Error interno del servidor');
    });

    it('should handle null error', async () => {
      mockUseCase.execute.mockRejectedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/scraper/productos',
        payload: {
          codigoAuto: 'TEST',
        },
      });

      expect(response.statusCode).toBe(500);
    });

    it('should handle string error', async () => {
      mockUseCase.execute.mockRejectedValue('String error');

      const response = await app.inject({
        method: 'POST',
        url: '/scraper/productos',
        payload: {
          codigoAuto: 'TEST',
        },
      });

      expect(response.statusCode).toBe(500);
    });

    it('should handle multiple products in response', async () => {
      const requestBody = {
        codigoAuto: 'FILTRO',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      const mockResult: SearchResult = {
        params: requestBody,
        totalProductos: 3,
        productos: [
          {
            codigo: 'ABC123',
            marca: 'BOSCH',
            rubro: 'FILTROS',
            nombre: 'Filtro 1',
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
            nombre: 'Filtro 2',
            porcentajeIVA: 21,
            precio: 800,
            foto: null,
            descuento: 55,
            costo: 360,
            precioSugerido: 468,
          },
          {
            codigo: 'GHI789',
            marca: 'FRAM',
            rubro: 'FILTROS',
            nombre: 'Filtro 3',
            porcentajeIVA: 21,
            precio: 1200,
            foto: 'https://example.com/photo.jpg',
            descuento: 55,
            costo: 540,
            precioSugerido: 702,
          },
        ],
      };

      mockUseCase.execute.mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'POST',
        url: '/scraper/productos',
        payload: requestBody,
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.totalProductos).toBe(3);
      expect(json.productos).toHaveLength(3);
    });
  });
});
