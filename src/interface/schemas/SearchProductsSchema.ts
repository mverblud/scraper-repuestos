import { z } from 'zod';

/**
 * Esquema Zod para validar el body de POST /scraper/productos
 */
export const SearchProductsSchema = z.object({
  codigoAuto: z
    .string()
    .max(200, 'codigoAuto debe tener como máximo 200 caracteres')
    .default(''),
  marcaId: z
    .string()
    .max(10, 'marcaId debe tener como máximo 10 caracteres')
    .default(''),
  rubroId: z
    .string()
    .max(10, 'rubroId debe tener como máximo 10 caracteres')
    .default(''),
  cantidadRenglones: z
    .number()
    .int('cantidadRenglones debe ser un entero')
    .min(1, 'cantidadRenglones debe ser al menos 1')
    .max(500, 'cantidadRenglones debe ser como máximo 500')
    .default(50),
});

export type SearchProductsInput = z.infer<typeof SearchProductsSchema>;
