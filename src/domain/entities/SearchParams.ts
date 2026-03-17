/**
 * Parámetros de búsqueda de productos en el catálogo de un proveedor.
 */
export interface SearchParams {
  readonly codigoAuto?: string;
  readonly marcaId?: string;
  readonly rubroId?: string;
  readonly cantidadRenglones?: number;
}

/**
 * Factory para crear parámetros de búsqueda de Ramos.
 */
export function createRamosSearchParams(raw: {
  codigoAuto: string;
  marcaId: string;
  rubroId: string;
  cantidadRenglones: number;
}): SearchParams {
  return Object.freeze({
    codigoAuto: raw.codigoAuto,
    marcaId: raw.marcaId,
    rubroId: raw.rubroId,
    cantidadRenglones: raw.cantidadRenglones,
  });
}
