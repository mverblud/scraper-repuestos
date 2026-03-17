import { Product } from './Product';
import { SearchParams } from './SearchParams';

/**
 * Resultado de una búsqueda de productos.
 */
export interface SearchResult {
  readonly params: SearchParams;
  readonly totalProductos: number;
  readonly productos: Product[];
}
