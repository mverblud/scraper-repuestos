/**
 * DTOs para gestión de marcas.
 *
 * Define la estructura de datos que entra/sale en los endpoints de marcas.
 */

/**
 * Marca completa con todos sus campos.
 *
 * Estructura que retorna GET /marcas, GET /marcas/:id
 */
export interface MarcaDTO {
  marcaId: number;
  marcaName: string;
  marcaHabilitado: boolean;
}

/**
 * Parámetros para crear una nueva marca.
 *
 * Corresponde al body de POST /marcas
 */
export interface CreateMarcaRequestDTO {
  marcaName: string;
  marcaHabilitado?: boolean;
}

/**
 * Parámetros para actualizar una marca.
 *
 * Corresponde al body de PUT /marcas/:id
 * Todos los campos son opcionales.
 */
export interface UpdateMarcaRequestDTO {
  marcaName?: string;
  marcaHabilitado?: boolean;
}

/**
 * Alias para respuestas que retornan una marca.
 */
export type MarcaResponseDTO = MarcaDTO;

/**
 * Alias para respuestas que retornan un array de marcas.
 */
export type MarcasListResponseDTO = MarcaDTO[];
