/**
 * Entidad de dominio que representa un producto del catálogo de un proveedor.
 * No depende de frameworks ni librerías externas.
 */
export interface Product {
  readonly codigo: string;
  readonly marca: string;
  readonly rubro: string;
  readonly nombre: string;
  readonly porcentajeIVA: number;
  readonly precio: number;
  readonly foto: string | null;
  
  // Campos de información adicional
  readonly descuento: number;
  readonly costo: number;
  readonly precioSugerido: number;
}

export function createProduct(raw: {
  codigo: string;
  marca: string;
  rubro: string;
  nombre: string;
  porcentajeIVA: number;
  precio: number;
  foto?: string | null;
  // Campos adicionales
  descuento: number;
  costo: number;
  precioSugerido: number;
}): Product {
  return Object.freeze({
    codigo: raw.codigo.trim(),
    marca: raw.marca.trim(),
    rubro: raw.rubro.trim(),
    nombre: raw.nombre.trim(),
    porcentajeIVA: raw.porcentajeIVA,
    precio: raw.precio,
    foto: raw.foto ?? null,
    
    // Campos adicionales
    descuento: raw.descuento,
    costo: raw.costo,
    precioSugerido: raw.precioSugerido,
  });
}
