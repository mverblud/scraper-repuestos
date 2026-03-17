import { promises as fs } from 'fs';
import path from 'path';

import { Marca, createMarca } from '../../domain/entities/Marca';
import { MarcaRepository } from '../../domain/ports/MarcaRepository';

const DATA_PATH = path.resolve(__dirname, '../../data/marcas/marcas.json');

export class JsonMarcaRepository implements MarcaRepository {
  private async read(): Promise<Marca[]> {
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(raw) as Marca[];
  }

  private async write(marcas: Marca[]): Promise<void> {
    await fs.writeFile(DATA_PATH, JSON.stringify(marcas, null, 2), 'utf-8');
  }

  async findAll(): Promise<Marca[]> {
    return this.read();
  }

  async findById(id: number): Promise<Marca | null> {
    const marcas = await this.read();
    return marcas.find((m) => m.marcaId === id) ?? null;
  }

  async create(data: Omit<Marca, 'marcaId'>): Promise<Marca> {
    const marcas = await this.read();
    const nextId = marcas.length > 0 ? Math.max(...marcas.map((m) => m.marcaId)) + 1 : 1;
    const newMarca = createMarca({ marcaId: nextId, ...data });
    await this.write([...marcas, newMarca]);
    return newMarca;
  }

  async update(id: number, data: Partial<Omit<Marca, 'marcaId'>>): Promise<Marca | null> {
    const marcas = await this.read();
    const index = marcas.findIndex((m) => m.marcaId === id);
    if (index === -1) return null;

    const updated = createMarca({ ...marcas[index], ...data });
    const updatedList = [...marcas];
    updatedList[index] = updated;
    await this.write(updatedList);
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    const marcas = await this.read();
    const filtered = marcas.filter((m) => m.marcaId !== id);
    if (filtered.length === marcas.length) return false;
    await this.write(filtered);
    return true;
  }
}
