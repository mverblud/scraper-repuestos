/**
 * Entidad de dominio que representa una marca de repuestos.
 */
export interface Marca {
  readonly marcaId: number;
  readonly marcaName: string;
  readonly marcaHabilitado: boolean;
}

export function createMarca(raw: {
  marcaId: number;
  marcaName: string;
  marcaHabilitado: boolean;
}): Marca {
  return Object.freeze({
    marcaId: raw.marcaId,
    marcaName: raw.marcaName.trim(),
    marcaHabilitado: raw.marcaHabilitado,
  });
}
