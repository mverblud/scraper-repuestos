/**
 * Errores de dominio.
 * No dependen de frameworks, solo extienden Error nativo.
 */

/** Error de autenticación contra el proveedor */
export class LoginError extends Error {
  constructor(message = 'Credenciales inválidas o fallo en autenticación del proveedor') {
    super(message);
    this.name = 'LoginError';
  }
}

/** Error cuando el proveedor no responde o devuelve algo inesperado */
export class ProviderError extends Error {
  constructor(message = 'Error al comunicarse con el proveedor') {
    super(message);
    this.name = 'ProviderError';
  }
}

/** Error cuando los parámetros de búsqueda son inválidos */
export class InvalidParamsError extends Error {
  constructor(message = 'Parámetros de búsqueda inválidos') {
    super(message);
    this.name = 'InvalidParamsError';
  }
}

/** Error cuando la estructura HTML/JSON del proveedor cambió */
export class ParsingError extends Error {
  constructor(message = 'Error al interpretar la respuesta del proveedor. La estructura pudo haber cambiado.') {
    super(message);
    this.name = 'ParsingError';
  }
}
