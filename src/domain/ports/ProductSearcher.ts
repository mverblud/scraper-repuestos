import { SearchParams, SearchResult } from '../entities';

/**
 * Port (interfaz) que define cómo buscar productos en un proveedor.
 * Cada proveedor implementa este contrato con su propio adapter.
 *
 * El dominio NO conoce detalles de implementación (HTTP, scraping, etc.).
 */
export interface ProductSearcher {
  /**
   * Busca productos según los parámetros dados.
   * Debe manejar internamente la autenticación y sesión del proveedor.
   */
  search(params: SearchParams): Promise<SearchResult>;
}
