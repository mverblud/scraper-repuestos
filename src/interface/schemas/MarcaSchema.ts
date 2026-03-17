import { z } from 'zod';

export const CreateMarcaSchema = z.object({
  marcaName: z
    .string({ required_error: 'marcaName es requerido' })
    .min(1, 'marcaName no puede estar vacío')
    .max(100, 'marcaName debe tener como máximo 100 caracteres'),
  marcaHabilitado: z.boolean().default(true),
});

export const UpdateMarcaSchema = z.object({
  marcaName: z
    .string()
    .min(1, 'marcaName no puede estar vacío')
    .max(100, 'marcaName debe tener como máximo 100 caracteres')
    .optional(),
  marcaHabilitado: z.boolean().optional(),
});

export type CreateMarcaInput = z.infer<typeof CreateMarcaSchema>;
export type UpdateMarcaInput = z.infer<typeof UpdateMarcaSchema>;
