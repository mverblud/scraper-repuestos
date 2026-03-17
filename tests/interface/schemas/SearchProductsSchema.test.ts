import { describe, it, expect } from '@jest/globals';
import { SearchProductsSchema } from '../../../src/interface/schemas/SearchProductsSchema';

describe('SearchProductsSchema', () => {
  describe('Valid inputs', () => {
    it('should validate with all fields provided', () => {
      const input = {
        codigoAuto: 'FILTRO123',
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      const result = SearchProductsSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(input);
      }
    });

    it('should apply defaults for missing optional fields', () => {
      const input = {};

      const result = SearchProductsSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.codigoAuto).toBe('');
        expect(result.data.marcaId).toBe('');
        expect(result.data.rubroId).toBe('');
        expect(result.data.cantidadRenglones).toBe(50);
      }
    });

    it('should accept minimum cantidadRenglones value', () => {
      const input = {
        cantidadRenglones: 1,
      };

      const result = SearchProductsSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cantidadRenglones).toBe(1);
      }
    });

    it('should accept maximum cantidadRenglones value', () => {
      const input = {
        cantidadRenglones: 500,
      };

      const result = SearchProductsSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cantidadRenglones).toBe(500);
      }
    });

    it('should accept maximum length strings', () => {
      const input = {
        codigoAuto: 'A'.repeat(200),
        marcaId: '1'.repeat(10),
        rubroId: '2'.repeat(10),
        cantidadRenglones: 50,
      };

      const result = SearchProductsSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept empty strings', () => {
      const input = {
        codigoAuto: '',
        marcaId: '',
        rubroId: '',
        cantidadRenglones: 50,
      };

      const result = SearchProductsSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('Invalid inputs', () => {
    it('should reject codigoAuto longer than 200 characters', () => {
      const input = {
        codigoAuto: 'A'.repeat(201),
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      const result = SearchProductsSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('codigoAuto');
      }
    });

    it('should reject marcaId longer than 10 characters', () => {
      const input = {
        codigoAuto: 'ABC',
        marcaId: '12345678901',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      const result = SearchProductsSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('marcaId');
      }
    });

    it('should reject rubroId longer than 10 characters', () => {
      const input = {
        codigoAuto: 'ABC',
        marcaId: '1',
        rubroId: '12345678901',
        cantidadRenglones: 50,
      };

      const result = SearchProductsSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('rubroId');
      }
    });

    it('should reject cantidadRenglones below minimum', () => {
      const input = {
        cantidadRenglones: 0,
      };

      const result = SearchProductsSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('cantidadRenglones');
      }
    });

    it('should reject cantidadRenglones above maximum', () => {
      const input = {
        cantidadRenglones: 501,
      };

      const result = SearchProductsSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('cantidadRenglones');
      }
    });

    it('should reject non-integer cantidadRenglones', () => {
      const input = {
        cantidadRenglones: 50.5,
      };

      const result = SearchProductsSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('cantidadRenglones');
      }
    });

    it('should reject non-number cantidadRenglones', () => {
      const input = {
        cantidadRenglones: '50',
      };

      const result = SearchProductsSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject non-string codigoAuto', () => {
      const input = {
        codigoAuto: 123,
        marcaId: '1',
        rubroId: '2',
        cantidadRenglones: 50,
      };

      const result = SearchProductsSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject multiple invalid fields', () => {
      const input = {
        codigoAuto: 'A'.repeat(201),
        marcaId: '12345678901',
        rubroId: '12345678901',
        cantidadRenglones: 501,
      };

      const result = SearchProductsSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(4);
      }
    });
  });
});
