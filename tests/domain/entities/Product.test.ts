import { describe, it, expect } from '@jest/globals';
import { createProduct, Product } from '../../../src/domain/entities/Product';

describe('Product Entity', () => {
  describe('createProduct', () => {
    it('should create a valid product with all fields', () => {
      const raw = {
        codigo: '  ABC123  ',
        marca: '  BOSCH  ',
        rubro: '  FILTROS  ',
        nombre: '  Filtro de Aceite  ',
        porcentajeIVA: 21,
        precio: 1000,
        foto: 'https://example.com/photo.jpg',
        descuento: 55,
        costo: 450,
        precioSugerido: 585,
      };

      const product = createProduct(raw);

      expect(product.codigo).toBe('ABC123');
      expect(product.marca).toBe('BOSCH');
      expect(product.rubro).toBe('FILTROS');
      expect(product.nombre).toBe('Filtro de Aceite');
      expect(product.porcentajeIVA).toBe(21);
      expect(product.precio).toBe(1000);
      expect(product.foto).toBe('https://example.com/photo.jpg');
      expect(product.descuento).toBe(55);
      expect(product.costo).toBe(450);
      expect(product.precioSugerido).toBe(585);
    });

    it('should trim whitespace from string fields', () => {
      const raw = {
        codigo: '   CODE   ',
        marca: '   BRAND   ',
        rubro: '   CATEGORY   ',
        nombre: '   NAME   ',
        porcentajeIVA: 21,
        precio: 100,
        descuento: 10,
        costo: 90,
        precioSugerido: 117,
      };

      const product = createProduct(raw);

      expect(product.codigo).toBe('CODE');
      expect(product.marca).toBe('BRAND');
      expect(product.rubro).toBe('CATEGORY');
      expect(product.nombre).toBe('NAME');
    });

    it('should handle null foto field', () => {
      const raw = {
        codigo: 'ABC123',
        marca: 'BOSCH',
        rubro: 'FILTROS',
        nombre: 'Filtro',
        porcentajeIVA: 21,
        precio: 1000,
        foto: null,
        descuento: 55,
        costo: 450,
        precioSugerido: 585,
      };

      const product = createProduct(raw);

      expect(product.foto).toBeNull();
    });

    it('should handle missing foto field', () => {
      const raw = {
        codigo: 'ABC123',
        marca: 'BOSCH',
        rubro: 'FILTROS',
        nombre: 'Filtro',
        porcentajeIVA: 21,
        precio: 1000,
        descuento: 55,
        costo: 450,
        precioSugerido: 585,
      };

      const product = createProduct(raw);

      expect(product.foto).toBeNull();
    });

    it('should create an immutable product object', () => {
      const raw = {
        codigo: 'ABC123',
        marca: 'BOSCH',
        rubro: 'FILTROS',
        nombre: 'Filtro',
        porcentajeIVA: 21,
        precio: 1000,
        descuento: 55,
        costo: 450,
        precioSugerido: 585,
      };

      const product = createProduct(raw);

      expect(Object.isFrozen(product)).toBe(true);
    });

    it('should handle zero values correctly', () => {
      const raw = {
        codigo: 'ABC123',
        marca: 'BOSCH',
        rubro: 'FILTROS',
        nombre: 'Filtro',
        porcentajeIVA: 0,
        precio: 0,
        descuento: 0,
        costo: 0,
        precioSugerido: 0,
      };

      const product = createProduct(raw);

      expect(product.porcentajeIVA).toBe(0);
      expect(product.precio).toBe(0);
      expect(product.descuento).toBe(0);
      expect(product.costo).toBe(0);
      expect(product.precioSugerido).toBe(0);
    });

    it('should handle negative values', () => {
      const raw = {
        codigo: 'ABC123',
        marca: 'BOSCH',
        rubro: 'FILTROS',
        nombre: 'Filtro',
        porcentajeIVA: -5,
        precio: -100,
        descuento: -10,
        costo: -50,
        precioSugerido: -80,
      };

      const product = createProduct(raw);

      expect(product.porcentajeIVA).toBe(-5);
      expect(product.precio).toBe(-100);
      expect(product.descuento).toBe(-10);
      expect(product.costo).toBe(-50);
      expect(product.precioSugerido).toBe(-80);
    });

    it('should handle empty strings', () => {
      const raw = {
        codigo: '',
        marca: '',
        rubro: '',
        nombre: '',
        porcentajeIVA: 21,
        precio: 1000,
        descuento: 55,
        costo: 450,
        precioSugerido: 585,
      };

      const product = createProduct(raw);

      expect(product.codigo).toBe('');
      expect(product.marca).toBe('');
      expect(product.rubro).toBe('');
      expect(product.nombre).toBe('');
    });
  });
});
