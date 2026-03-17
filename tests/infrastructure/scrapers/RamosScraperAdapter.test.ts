import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { RamosScraperAdapter, RamosConfig } from '../../../src/infrastructure/scrapers/RamosScraperAdapter';
import { LoginError, ProviderError, ParsingError } from '../../../src/domain';

jest.mock('axios-cookiejar-support', () => ({
  wrapper: (client: any) => client,
}));

jest.mock('tough-cookie', () => ({
  CookieJar: jest.fn().mockImplementation(() => ({})),
}));

describe('RamosScraperAdapter', () => {
  let adapter: RamosScraperAdapter;
  let mockAxios: MockAdapter;
  let config: RamosConfig;

  beforeEach(() => {
    config = {
      loginUrl: 'https://example.com/login',
      catalogUrl: 'https://example.com/catalog',
      searchUrl: 'https://example.com/search',
      username: 'testuser',
      password: 'testpass',
      clientId: '308',
    };

    mockAxios = new MockAdapter(axios);
    adapter = new RamosScraperAdapter(config);
  });

  afterEach(() => {
    mockAxios.reset();
  });

  describe('Constructor', () => {
    it('should create adapter with config', () => {
      expect(adapter).toBeInstanceOf(RamosScraperAdapter);
    });
  });

  describe('search - Authentication', () => {
    it('should login before searching', async () => {
      const loginResponse = '<html><body>Success</body></html>';
      const catalogResponse = `
        <html>
          <script>
            var idCliente = "308";
            var descuentoCliente = "55.00";
            var descuentoUno = "0.00";
            var descuentoDos = "0.00";
          </script>
        </html>
      `;
      const searchResponse = {
        articulos: [],
        paginas: 1,
        pag_active: 1,
      };

      mockAxios.onPost(config.loginUrl).reply(200, loginResponse);
      mockAxios.onGet(config.catalogUrl).reply(200, catalogResponse);
      mockAxios.onPost(config.searchUrl).reply(200, searchResponse);

      const params = {
        codigoAuto: 'TEST',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      const result = await adapter.search(params);

      expect(result.totalProductos).toBe(0);
      expect(result.productos).toHaveLength(0);
    });

    it('should throw LoginError when login fails', async () => {
      const loginResponse = `
        <html>
          <form>
            <input name="input_usr" />
            <input name="input_pass" />
            <button class="btn-sumbit">Login</button>
          </form>
        </html>
      `;

      mockAxios.onPost(config.loginUrl).reply(200, loginResponse);

      const params = {
        codigoAuto: 'TEST',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      await expect(adapter.search(params)).rejects.toThrow(LoginError);
    });

    it('should throw LoginError on 401 status', async () => {
      mockAxios.onPost(config.loginUrl).reply(401);

      const params = {
        codigoAuto: 'TEST',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      await expect(adapter.search(params)).rejects.toThrow(LoginError);
    });
  });

  describe('search - Product Mapping', () => {
    beforeEach(() => {
      process.env.DESCUENTO_CLIENTE = '55';
    });

    it('should map products correctly', async () => {
      const loginResponse = '<html><body>Success</body></html>';
      const catalogResponse = `
        <html>
          <script>
            var idCliente = "308";
            var descuentoCliente = "55.00";
            var descuentoUno = "0.00";
            var descuentoDos = "0.00";
          </script>
        </html>
      `;
      const searchResponse = {
        articulos: [
          {
            id: '1',
            codigo: 'ABC123',
            marca: 'BOSCH',
            linea: 'FILTROS',
            nombre: 'Filtro de Aceite',
            porcentaje_IVA: '21',
            precio: '1000',
            stock: 5,
            foto: 'https://example.com/photo.jpg',
          },
        ],
        paginas: 1,
        pag_active: 1,
      };

      mockAxios.onPost(config.loginUrl).reply(200, loginResponse);
      mockAxios.onGet(config.catalogUrl).reply(200, catalogResponse);
      mockAxios.onPost(config.searchUrl).reply(200, searchResponse);

      const params = {
        codigoAuto: 'FILTRO',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      const result = await adapter.search(params);

      expect(result.totalProductos).toBe(1);
      expect(result.productos).toHaveLength(1);
      expect(result.productos[0].codigo).toBe('ABC123');
      expect(result.productos[0].marca).toBe('BOSCH');
      expect(result.productos[0].rubro).toBe('FILTROS');
      expect(result.productos[0].nombre).toBe('Filtro de Aceite');
      expect(result.productos[0].precio).toBe(1000);
      expect(result.productos[0].porcentajeIVA).toBe(21);
      expect(result.productos[0].foto).toBe('https://example.com/photo.jpg');
    });

    it('should handle multiple pages', async () => {
      const loginResponse = '<html><body>Success</body></html>';
      const catalogResponse = `
        <html>
          <script>
            var idCliente = "308";
            var descuentoCliente = "55.00";
          </script>
        </html>
      `;
      
      const page1Response = {
        articulos: [
          {
            id: '1',
            codigo: 'ABC123',
            marca: 'BOSCH',
            linea: 'FILTROS',
            nombre: 'Producto 1',
            porcentaje_IVA: '21',
            precio: '1000',
            stock: 5,
          },
        ],
        paginas: 2,
        pag_active: 1,
      };

      const page2Response = {
        articulos: [
          {
            id: '2',
            codigo: 'DEF456',
            marca: 'MANN',
            linea: 'FILTROS',
            nombre: 'Producto 2',
            porcentaje_IVA: '21',
            precio: '800',
            stock: 3,
          },
        ],
        paginas: 2,
        pag_active: 2,
      };

      mockAxios.onPost(config.loginUrl).reply(200, loginResponse);
      mockAxios.onGet(config.catalogUrl).reply(200, catalogResponse);
      mockAxios.onPost(config.searchUrl).replyOnce(200, page1Response).onPost(config.searchUrl).replyOnce(200, page2Response);

      const params = {
        codigoAuto: 'FILTRO',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 1,
      };

      const result = await adapter.search(params);

      expect(result.totalProductos).toBe(2);
      expect(result.productos).toHaveLength(2);
      expect(result.productos[0].codigo).toBe('ABC123');
      expect(result.productos[1].codigo).toBe('DEF456');
    });

    it('should handle null foto field', async () => {
      const loginResponse = '<html><body>Success</body></html>';
      const catalogResponse = `
        <html>
          <script>
            var idCliente = "308";
            var descuentoCliente = "55.00";
          </script>
        </html>
      `;
      const searchResponse = {
        articulos: [
          {
            id: '1',
            codigo: 'ABC123',
            marca: 'BOSCH',
            linea: 'FILTROS',
            nombre: 'Filtro',
            porcentaje_IVA: '21',
            precio: '1000',
            stock: 5,
            foto: null,
          },
        ],
        paginas: 1,
        pag_active: 1,
      };

      mockAxios.onPost(config.loginUrl).reply(200, loginResponse);
      mockAxios.onGet(config.catalogUrl).reply(200, catalogResponse);
      mockAxios.onPost(config.searchUrl).reply(200, searchResponse);

      const params = {
        codigoAuto: 'TEST',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      const result = await adapter.search(params);

      expect(result.productos[0].foto).toBeNull();
    });

    it('should handle missing foto field', async () => {
      const loginResponse = '<html><body>Success</body></html>';
      const catalogResponse = `
        <html>
          <script>
            var idCliente = "308";
            var descuentoCliente = "55.00";
          </script>
        </html>
      `;
      const searchResponse = {
        articulos: [
          {
            id: '1',
            codigo: 'ABC123',
            marca: 'BOSCH',
            linea: 'FILTROS',
            nombre: 'Filtro',
            porcentaje_IVA: '21',
            precio: '1000',
            stock: 5,
          },
        ],
        paginas: 1,
        pag_active: 1,
      };

      mockAxios.onPost(config.loginUrl).reply(200, loginResponse);
      mockAxios.onGet(config.catalogUrl).reply(200, catalogResponse);
      mockAxios.onPost(config.searchUrl).reply(200, searchResponse);

      const params = {
        codigoAuto: 'TEST',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      const result = await adapter.search(params);

      expect(result.productos[0].foto).toBeNull();
    });
  });

  describe('search - Error Handling', () => {
    it('should throw ParsingError when response structure is invalid', async () => {
      const loginResponse = '<html><body>Success</body></html>';
      const catalogResponse = `
        <html>
          <script>
            var idCliente = "308";
            var descuentoCliente = "55.00";
          </script>
        </html>
      `;
      const searchResponse = {
        invalid: 'structure',
      };

      mockAxios.onPost(config.loginUrl).reply(200, loginResponse);
      mockAxios.onGet(config.catalogUrl).reply(200, catalogResponse);
      mockAxios.onPost(config.searchUrl).reply(200, searchResponse);

      const params = {
        codigoAuto: 'TEST',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      await expect(adapter.search(params)).rejects.toThrow(ParsingError);
    });

    it('should throw ProviderError on network error', async () => {
      mockAxios.onPost(config.loginUrl).networkError();

      const params = {
        codigoAuto: 'TEST',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      await expect(adapter.search(params)).rejects.toThrow(ProviderError);
    });

    it('should throw ParsingError when clientId cannot be extracted', async () => {
      const configWithoutClientId: RamosConfig = {
        ...config,
        clientId: undefined,
      };
      
      const adapterWithoutClientId = new RamosScraperAdapter(configWithoutClientId);
      
      const loginResponse = '<html><body>Success</body></html>';
      const catalogResponse = '<html><body>No client id here</body></html>';

      mockAxios.onPost(config.loginUrl).reply(200, loginResponse);
      mockAxios.onGet(config.catalogUrl).reply(200, catalogResponse);

      const params = {
        codigoAuto: 'TEST',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      await expect(adapterWithoutClientId.search(params)).rejects.toThrow(ParsingError);
    });

    it('should throw ProviderError when catalog access fails', async () => {
      const loginResponse = '<html><body>Success</body></html>';

      mockAxios.onPost(config.loginUrl).reply(200, loginResponse);
      mockAxios.onGet(config.catalogUrl).networkError();

      const params = {
        codigoAuto: 'TEST',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      await expect(adapter.search(params)).rejects.toThrow(ProviderError);
    });

    it('should throw ProviderError on search network error', async () => {
      const loginResponse = '<html><body>Success</body></html>';
      const catalogResponse = `
        <html>
          <script>
            var idCliente = "308";
            var descuentoCliente = "55.00";
          </script>
        </html>
      `;

      mockAxios.onPost(config.loginUrl).reply(200, loginResponse);
      mockAxios.onGet(config.catalogUrl).reply(200, catalogResponse);
      mockAxios.onPost(config.searchUrl).networkError();

      const params = {
        codigoAuto: 'TEST',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      await expect(adapter.search(params)).rejects.toThrow(ProviderError);
    });
  });

  describe('search - Price Calculations', () => {
    beforeEach(() => {
      process.env.DESCUENTO_CLIENTE = '55';
    });

    it('should calculate prices with correct formulas', async () => {
      const loginResponse = '<html><body>Success</body></html>';
      const catalogResponse = `
        <html>
          <script>
            var idCliente = "308";
            var descuentoCliente = "55.00";
            var descuentoUno = "0.00";
            var descuentoDos = "0.00";
          </script>
        </html>
      `;
      const searchResponse = {
        articulos: [
          {
            id: '1',
            codigo: 'TEST001',
            marca: 'TEST',
            linea: 'TEST',
            nombre: 'Test Product',
            porcentaje_IVA: '21',
            precio: '100',
            stock: 5,
          },
        ],
        paginas: 1,
        pag_active: 1,
      };

      mockAxios.onPost(config.loginUrl).reply(200, loginResponse);
      mockAxios.onGet(config.catalogUrl).reply(200, catalogResponse);
      mockAxios.onPost(config.searchUrl).reply(200, searchResponse);

      const params = {
        codigoAuto: 'TEST',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      const result = await adapter.search(params);

      expect(result.productos[0].precio).toBe(100);
      expect(result.productos[0].descuento).toBe(55);
      expect(result.productos[0].costo).toBeGreaterThan(0);
      expect(result.productos[0].precioSugerido).toBeGreaterThan(0);
    });

    it('should handle zero prices', async () => {
      const loginResponse = '<html><body>Success</body></html>';
      const catalogResponse = `
        <html>
          <script>
            var idCliente = "308";
            var descuentoCliente = "55.00";
          </script>
        </html>
      `;
      const searchResponse = {
        articulos: [
          {
            id: '1',
            codigo: 'FREE',
            marca: 'FREE',
            linea: 'FREE',
            nombre: 'Free Product',
            porcentaje_IVA: '0',
            precio: '0',
            stock: 5,
          },
        ],
        paginas: 1,
        pag_active: 1,
      };

      mockAxios.onPost(config.loginUrl).reply(200, loginResponse);
      mockAxios.onGet(config.catalogUrl).reply(200, catalogResponse);
      mockAxios.onPost(config.searchUrl).reply(200, searchResponse);

      const params = {
        codigoAuto: 'FREE',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      const result = await adapter.search(params);

      expect(result.productos[0].precio).toBe(0);
      expect(result.productos[0].costo).toBe(0);
      expect(result.productos[0].precioSugerido).toBe(0);
    });

    it('should handle missing price fields', async () => {
      const loginResponse = '<html><body>Success</body></html>';
      const catalogResponse = `
        <html>
          <script>
            var idCliente = "308";
            var descuentoCliente = "55.00";
          </script>
        </html>
      `;
      const searchResponse = {
        articulos: [
          {
            id: '1',
            codigo: 'NOPRICE',
            marca: 'TEST',
            linea: 'TEST',
            nombre: 'No Price',
            porcentaje_IVA: '',
            precio: '',
            stock: 5,
          },
        ],
        paginas: 1,
        pag_active: 1,
      };

      mockAxios.onPost(config.loginUrl).reply(200, loginResponse);
      mockAxios.onGet(config.catalogUrl).reply(200, catalogResponse);
      mockAxios.onPost(config.searchUrl).reply(200, searchResponse);

      const params = {
        codigoAuto: 'TEST',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      const result = await adapter.search(params);

      expect(result.productos[0].precio).toBe(0);
      expect(result.productos[0].porcentajeIVA).toBe(0);
    });
  });

  describe('search - Session Management', () => {
    it('should reuse session when not expired', async () => {
      const loginResponse = '<html><body>Success</body></html>';
      const catalogResponse = `
        <html>
          <script>
            var idCliente = "308";
            var descuentoCliente = "55.00";
          </script>
        </html>
      `;
      const searchResponse = {
        articulos: [],
        paginas: 1,
        pag_active: 1,
      };

      mockAxios.onPost(config.loginUrl).reply(200, loginResponse);
      mockAxios.onGet(config.catalogUrl).reply(200, catalogResponse);
      mockAxios.onPost(config.searchUrl).reply(200, searchResponse);

      const params = {
        codigoAuto: 'TEST',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      // First call
      await adapter.search(params);

      // Reset mock to track second call
      mockAxios.reset();
      mockAxios.onPost(config.searchUrl).reply(200, searchResponse);

      // Second call - should not login again
      await adapter.search(params);

      // Verify login was not called again
      const loginCalls = mockAxios.history.post.filter(
        (call) => call.url === config.loginUrl
      );
      expect(loginCalls.length).toBe(0);
    });
  });
});
