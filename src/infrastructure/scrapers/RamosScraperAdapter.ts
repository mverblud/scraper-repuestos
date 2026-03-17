import axios, { AxiosInstance, AxiosError } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';
import * as qs from 'querystring';

import {
  ProductSearcher,
  SearchParams,
  SearchResult,
  Product,
  createProduct,
  LoginError,
  ProviderError,
  ParsingError,
} from '../../domain';

/**
 * Configuración necesaria para el adapter de Ramos.
 */
export interface RamosConfig {
  loginUrl: string;
  catalogUrl: string;
  searchUrl: string;
  username: string;
  password: string;
  clientId?: string;
}

/**
 * Estructura de un artículo en la respuesta JSON del proveedor.
 * Solo incluye campos que realmente existen en la API del proveedor.
 */
interface RamosArticulo {
  id: string;
  codigo: string;
  marca: string;
  linea: string;
  nombre: string;
  nombre_2?: string;
  nombre_3?: string;
  porcentaje_IVA: string;
  precio: string; // Precio ya con descuentoCliente aplicado
  stock: number;
  foto?: string;
}

/**
 * Estructura de la respuesta JSON del endpoint de búsqueda.
 */
interface RamosSearchResponse {
  articulos: RamosArticulo[];
  paginas: number;
  pag_active: number;
}

/**
 * Adapter que implementa ProductSearcher para el proveedor "Autopartes Ramos".
 *
 * Flujo:
 * 1. Login via POST form-urlencoded → obtiene cookie PHPSESSID
 * 2. GET catálogo → extrae idCliente del HTML server-rendered
 * 3. POST AJAX obtener_articulos → recibe JSON con productos
 * 4. Itera páginas si hay más de una
 * 5. Mapea artículos JSON a entidades Product del dominio
 */
export class RamosScraperAdapter implements ProductSearcher {
  private readonly config: RamosConfig;
  private client: AxiosInstance;
  private cookieJar: CookieJar;
  private isAuthenticated = false;
  private clientId: string | null = null;
  private lastLoginTime: number = 0;
  
  // Variables globales extraídas del HTML para cálculos
  private descuentoCliente: number = 0;
  private descuentoUno: number = 0;
  private descuentoDos: number = 0;

  /** Tiempo máximo de sesión en ms (18 min para tener margen sobre los 20 del servidor) */
  private static readonly SESSION_TTL_MS = 18 * 60 * 1000;

  constructor(config: RamosConfig) {
    this.config = config;
    this.cookieJar = new CookieJar();
    this.client = this.createClient();
  }

  // ─── PUBLIC ────────────────────────────────────────────────────────────

  async search(params: SearchParams): Promise<SearchResult> {
    await this.ensureAuthenticated();

    const allProducts: Product[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const response = await this.fetchArticles(params, currentPage);
      totalPages = response.paginas;

      const products = response.articulos.map((art) => this.mapToProduct(art));
      allProducts.push(...products);

      currentPage++;
    } while (currentPage <= totalPages);

    return {
      params,
      totalProductos: allProducts.length,
      productos: allProducts,
    };
  }

  // ─── PRIVATE: HTTP CLIENT ─────────────────────────────────────────────

  private createClient(): AxiosInstance {
    const jar = this.cookieJar;
    const instance = wrapper(
      axios.create({
        jar,
        withCredentials: true,
        maxRedirects: 10,
        timeout: 30_000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
        },
      }),
    );
    return instance;
  }

  // ─── PRIVATE: AUTENTICACIÓN ───────────────────────────────────────────

  private isSessionExpired(): boolean {
    if (!this.isAuthenticated) return true;
    return Date.now() - this.lastLoginTime > RamosScraperAdapter.SESSION_TTL_MS;
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.isSessionExpired()) return;

    // Crear jar y client frescos para evitar cookies viejas
    this.cookieJar = new CookieJar();
    this.client = this.createClient();
    this.isAuthenticated = false;

    await this.login();
    await this.extractClientId();
  }

  private async login(): Promise<void> {
    try {
      const payload = qs.stringify({
        username: this.config.username,
        password: this.config.password,
      });

      const response = await this.client.post(this.config.loginUrl, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        validateStatus: (status) => status >= 200 && status < 400,
      });

      // Verificar que el login fue exitoso.
      // Si la respuesta contiene el formulario de login, significa que falló.
      const html = typeof response.data === 'string' ? response.data : '';
      if (html.includes('input_usr') || html.includes('input_pass') || html.includes('btn-sumbit')) {
        throw new LoginError('Login fallido: la respuesta aún contiene el formulario de login');
      }

      this.isAuthenticated = true;
      this.lastLoginTime = Date.now();
    } catch (error) {
      if (error instanceof LoginError) throw error;

      const axiosErr = error as AxiosError;
      if (axiosErr.response?.status === 401) {
        throw new LoginError('Credenciales inválidas (HTTP 401)');
      }

      throw new ProviderError(
        `Error al autenticarse con el proveedor: ${axiosErr.message ?? 'desconocido'}`,
      );
    }
  }

  // ─── PRIVATE: EXTRACCIÓN DE idCliente ────────────────────────────────

  private async extractClientId(): Promise<void> {
    try {
      const response = await this.client.get(this.config.catalogUrl);
      const html = typeof response.data === 'string' ? response.data : '';

      // Siempre extraer variables globales para cálculos de precios
      this.extractGlobalVariables(html);
      
      // Si se proporcionó un clientId fijo en la configuración, usarlo
      if (this.config.clientId) {
        this.clientId = this.config.clientId;
        return;
      }

      // Buscar: var idCliente = "308";
      const match = html.match(/var\s+idCliente\s*=\s*["'](\d+)["']/);
      if (!match?.[1]) {
        throw new ParsingError('No se pudo extraer idCliente del HTML del catálogo');
      }

      this.clientId = match[1];
      
    } catch (error) {
      if (error instanceof ParsingError) throw error;
      throw new ProviderError(
        `Error al acceder al catálogo para extraer idCliente: ${(error as Error).message}`,
      );
    }
  }

  // ─── PRIVATE: EXTRACCIÓN DE VARIABLES GLOBALES ──────────────────────

  private extractGlobalVariables(html: string): void {
    try {
      // Extraer var descuentoCliente = "55.00";
      const descuentoMatch = html.match(/var\s+descuentoCliente\s*=\s*["'](\d+(?:\.\d+)?)["']/);
      if (descuentoMatch?.[1]) {
        this.descuentoCliente = parseFloat(descuentoMatch[1]);
      }
      
      // Extraer var descuentoUno = "0.00";
      const descuentoUnoMatch = html.match(/var\s+descuentoUno\s*=\s*["'](\d+(?:\.\d+)?)["']/);
      if (descuentoUnoMatch?.[1]) {
        this.descuentoUno = parseFloat(descuentoUnoMatch[1]);
      }
      
      // Extraer var descuentoDos = "0.00";
      const descuentoDosMatch = html.match(/var\s+descuentoDos\s*=\s*["'](\d+(?:\.\d+)?)["']/);
      if (descuentoDosMatch?.[1]) {
        this.descuentoDos = parseFloat(descuentoDosMatch[1]);
      }
      
    } catch {
      // Si no se pueden extraer las variables, usar valores por defecto
    }
  }

  // ─── PRIVATE: CÁLCULOS DE PRECIOS ───────────────────────────────────

  private calculatePrecioLista(precio: number): number {
    // El precio mostrado ya tiene el descuento del cliente aplicado
    // Para obtener el precio de lista original, necesitamos revertir el descuento
    if (this.descuentoCliente > 0) {
      return precio / (1 - this.descuentoCliente / 100);
    }
    return precio;
  }

  private calculateCosto(precioLista: number): number {
    // El costo es el precio de lista menos el mayor descuento disponible
    const maxDescuento = Math.max(this.descuentoCliente, this.descuentoUno, this.descuentoDos);
    
    if (maxDescuento > 0) {
      return precioLista * (1 - maxDescuento / 100);
    }
    
    return precioLista;
  }

  private calculatePrecioSugerido(precioLista: number): number {
    // El precio sugerido es el precio de lista más un margen de ganancia (21%)
    return precioLista * 1.21;
  }

  private determineStock(stock: number): boolean {
    // Determinar si hay stock basado en el número
    return stock > 0;
  }

  // ─── PRIVATE: BÚSQUEDA DE ARTÍCULOS ──────────────────────────────────

  private async fetchArticles(
    params: SearchParams,
    page: number,
  ): Promise<RamosSearchResponse> {
    try {
      const payload = qs.stringify({
        tamano_pagina: params.cantidadRenglones,
        numero_pagina: page,
        'filtros[codigo]': '',
        'filtros[nombre]': params.codigoAuto,
        'filtros[es_activo]': '',
        'filtros[linea]': params.rubroId,
        'filtros[marca]': params.marcaId,
        criterio_orden: 'codigo',
        tipo_orden: 'DESC',
        id_cliente: this.clientId ?? this.config.clientId ?? '',
      });

      const response = await this.client.post(this.config.searchUrl, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      const data = response.data as RamosSearchResponse;

      // Validar estructura de respuesta
      if (!data || !Array.isArray(data.articulos)) {
        throw new ParsingError(
          'La respuesta del proveedor no tiene la estructura esperada (falta "articulos")',
        );
      }

      return {
        articulos: data.articulos,
        paginas: typeof data.paginas === 'number' ? data.paginas : 1,
        pag_active: typeof data.pag_active === 'number' ? data.pag_active : page,
      };
    } catch (error) {
      if (error instanceof ParsingError) throw error;

      const axiosErr = error as AxiosError;

      // Si recibimos un redirect al login, la sesión expiró
      const responseUrl = axiosErr.response?.request?.res?.responseUrl as string | undefined;
      if (responseUrl && responseUrl.includes('login')) {
        this.isAuthenticated = false;
        throw new LoginError('La sesión expiró. Se requiere re-autenticación.');
      }

      throw new ProviderError(
        `Error al buscar artículos en el proveedor: ${axiosErr.message ?? 'desconocido'}`,
      );
    }
  }

  // ─── PRIVATE: MAPEO ──────────────────────────────────────────────────

  private mapToProduct(articulo: RamosArticulo): Product {
    // Obtener valores básicos del proveedor
    const precioObtenido = parseFloat(articulo.precio) || 0;
    const porcentajeIVA = parseFloat(articulo.porcentaje_IVA) || 0;
    
    // Obtener descuento desde variable de entorno
    const descuento = parseFloat(process.env.DESCUENTO_CLIENTE || '55');
    
    // Aplicar fórmulas correctas
    // 1. Calcular precioIva (precioObtenido * 1.21)
    const precioIva = precioObtenido * 1.21;
    
    // 2. Calcular precioCosto (precioIva - 55%)
    const precioCosto = precioIva * 0.45; // 100% - 55% = 45%
    
    // 3. Calcular precioSugerido (precioCosto + 30%)
    const precioSugeridoCalc = precioCosto * 1.30;
    
    // Formatear todos los precios a 2 decimales
    const costo = parseFloat(precioCosto.toFixed(2));
    const precioSugerido = parseFloat(precioSugeridoCalc.toFixed(2));

    return createProduct({
      codigo: articulo.codigo ?? articulo.id ?? '',
      marca: articulo.marca ?? '',
      rubro: articulo.linea ?? '',
      nombre: articulo.nombre ?? '',
      porcentajeIVA: porcentajeIVA,
      precio: precioObtenido,
      foto: articulo.foto || null,
      
      // Campos calculados
      descuento: descuento,
      costo: costo,
      precioSugerido: precioSugerido,
    });
  }
}
