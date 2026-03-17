import { Marca } from '../domain/entities/Marca';
import { MarcaRepository } from '../domain/ports/MarcaRepository';
import { NotFoundError, ConflictError } from '../domain/errors';

export class MarcasService {
  constructor(private readonly repo: MarcaRepository) {}

  async getAll(): Promise<Marca[]> {
    return this.repo.findAll();
  }

  async getById(id: number): Promise<Marca> {
    const marca = await this.repo.findById(id);
    if (!marca) throw new NotFoundError(`Marca con id ${id} no encontrada`);
    return marca;
  }

  async create(data: { marcaName: string; marcaHabilitado?: boolean }): Promise<Marca> {
    const all = await this.repo.findAll();
    const exists = all.some(
      (m) => m.marcaName.toLowerCase() === data.marcaName.toLowerCase(),
    );
    if (exists) throw new ConflictError(`Ya existe una marca con el nombre "${data.marcaName}"`);

    return this.repo.create({
      marcaName: data.marcaName,
      marcaHabilitado: data.marcaHabilitado ?? true,
    });
  }

  async update(
    id: number,
    data: { marcaName?: string; marcaHabilitado?: boolean },
  ): Promise<Marca> {
    if (data.marcaName) {
      const all = await this.repo.findAll();
      const conflict = all.some(
        (m) => m.marcaName.toLowerCase() === data.marcaName!.toLowerCase() && m.marcaId !== id,
      );
      if (conflict) throw new ConflictError(`Ya existe una marca con el nombre "${data.marcaName}"`);
    }

    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundError(`Marca con id ${id} no encontrada`);
    return updated;
  }

  async delete(id: number): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new NotFoundError(`Marca con id ${id} no encontrada`);
  }
}
