/**
 * DTOs para búsqueda de productos.
 *
 * DTO = Data Transfer Object
 * - Define la forma de datos que entra/sale de los endpoints
 * - Separado de entities del dominio
 * - Tipado y validado con Zod en schemas
 */

/**
 * Parámetros de entrada para búsqueda de productos.
 *
 * Corresponde al body de POST /scraper/productos
 */
export interface SearchProductsRequestDTO {
  codigoAuto: string;
  marcaId: string;
  rubroId: string;
  cantidadRenglones: number;
}

/**
 * Información básica de un producto encontrado.
 */
export interface ProductDTO {
  codigo: string;
  marca: string;
  rubro: string;
  nombre: string;
  porcentajeIVA: number;
  precio: number;
  foto?: string | null;
  descuento: number;
  costo: number;
  precioSugerido: number;
}

/**
 * Respuesta exitosa de búsqueda de productos.
 *
 * Estructura que retorna POST /scraper/productos
 */
export interface SearchProductsResponseDTO {
  params: SearchProductsRequestDTO;
  totalProductos: number;
  productos: ProductDTO[];
}
