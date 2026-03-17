import { describe, it, expect } from '@jest/globals';
import {
  LoginError,
  ProviderError,
  InvalidParamsError,
  ParsingError,
} from '../../../src/domain/errors';

describe('Domain Errors', () => {
  describe('LoginError', () => {
    it('should create error with default message', () => {
      const error = new LoginError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(LoginError);
      expect(error.name).toBe('LoginError');
      expect(error.message).toBe('Credenciales inválidas o fallo en autenticación del proveedor');
    });

    it('should create error with custom message', () => {
      const customMessage = 'Custom login error';
      const error = new LoginError(customMessage);

      expect(error.name).toBe('LoginError');
      expect(error.message).toBe(customMessage);
    });

    it('should have stack trace', () => {
      const error = new LoginError();

      expect(error.stack).toBeDefined();
    });
  });

  describe('ProviderError', () => {
    it('should create error with default message', () => {
      const error = new ProviderError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ProviderError);
      expect(error.name).toBe('ProviderError');
      expect(error.message).toBe('Error al comunicarse con el proveedor');
    });

    it('should create error with custom message', () => {
      const customMessage = 'Provider timeout';
      const error = new ProviderError(customMessage);

      expect(error.name).toBe('ProviderError');
      expect(error.message).toBe(customMessage);
    });
  });

  describe('InvalidParamsError', () => {
    it('should create error with default message', () => {
      const error = new InvalidParamsError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(InvalidParamsError);
      expect(error.name).toBe('InvalidParamsError');
      expect(error.message).toBe('Parámetros de búsqueda inválidos');
    });

    it('should create error with custom message', () => {
      const customMessage = 'Missing required field';
      const error = new InvalidParamsError(customMessage);

      expect(error.name).toBe('InvalidParamsError');
      expect(error.message).toBe(customMessage);
    });
  });

  describe('ParsingError', () => {
    it('should create error with default message', () => {
      const error = new ParsingError();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ParsingError);
      expect(error.name).toBe('ParsingError');
      expect(error.message).toBe('Error al interpretar la respuesta del proveedor. La estructura pudo haber cambiado.');
    });

    it('should create error with custom message', () => {
      const customMessage = 'HTML structure changed';
      const error = new ParsingError(customMessage);

      expect(error.name).toBe('ParsingError');
      expect(error.message).toBe(customMessage);
    });
  });

  describe('Error instanceof checks', () => {
    it('should be distinguishable from each other', () => {
      const loginError = new LoginError();
      const providerError = new ProviderError();
      const paramsError = new InvalidParamsError();
      const parsingError = new ParsingError();

      expect(loginError instanceof LoginError).toBe(true);
      expect(loginError instanceof ProviderError).toBe(false);
      expect(loginError instanceof InvalidParamsError).toBe(false);
      expect(loginError instanceof ParsingError).toBe(false);

      expect(providerError instanceof ProviderError).toBe(true);
      expect(providerError instanceof LoginError).toBe(false);

      expect(paramsError instanceof InvalidParamsError).toBe(true);
      expect(paramsError instanceof LoginError).toBe(false);

      expect(parsingError instanceof ParsingError).toBe(true);
      expect(parsingError instanceof LoginError).toBe(false);
    });

    it('should all be instances of Error', () => {
      const errors = [
        new LoginError(),
        new ProviderError(),
        new InvalidParamsError(),
        new ParsingError(),
      ];

      errors.forEach(error => {
        expect(error instanceof Error).toBe(true);
      });
    });
  });
});
