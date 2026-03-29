import { Marca } from '../entities/Marca';

/**
 * Port (interfaz) que define las operaciones de persistencia para Marca.
 */
export interface MarcaRepository {
  findAll(): Promise<Marca[]>;
  findById(id: number): Promise<Marca | null>;
  create(data: Omit<Marca, 'marcaId'>): Promise<Marca>;
  update(id: number, data: Partial<Omit<Marca, 'marcaId'>>): Promise<Marca | null>;
  delete(id: number): Promise<boolean>;
}
