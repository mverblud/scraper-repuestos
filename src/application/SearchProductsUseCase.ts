import { ProductSearcher, SearchParams, SearchResult } from '../domain';

/**
 * Caso de uso: Buscar productos en el catálogo de un proveedor.
 *
 * Orquesta la búsqueda delegando al port ProductSearcher.
 * No conoce detalles de infraestructura (HTTP, scraping, etc.).
 */
export class SearchProductsUseCase {
  constructor(private readonly searcher: ProductSearcher) {}

  async execute(params: SearchParams): Promise<SearchResult> {
    const result = await this.searcher.search(params);

    return {
      params: result.params,
      totalProductos: result.totalProductos,
      productos: result.productos,
    };
  }
}
