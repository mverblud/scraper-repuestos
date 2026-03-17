# Testing Documentation

Este proyecto incluye tests completos con Jest y TypeScript para garantizar una alta cobertura de código.

## Estructura de Tests

```
tests/
├── application/           # Tests de casos de uso
│   └── SearchProductsUseCase.test.ts
├── domain/
│   ├── entities/         # Tests de entidades de dominio
│   │   ├── Product.test.ts
│   │   └── ASMSearchParams.test.ts
│   └── errors/          # Tests de errores customizados
│       └── errors.test.ts
├── infrastructure/
│   └── scrapers/        # Tests de adapters
│       └── RamosScraperAdapter.test.ts
└── interface/
    ├── routes/          # Tests de rutas HTTP
    │   └── scraperRoutes.test.ts
    └── schemas/         # Tests de validación Zod
        ├── SearchProductsSchema.test.ts
        └── ASMSearchProductsSchema.test.ts
```

## Comandos Disponibles

### Ejecutar todos los tests
```bash
npm test
```

### Ejecutar tests con reporte de cobertura
```bash
npm run coverage
```

### Ejecutar tests en modo watch (desarrollo)
```bash
npm run test:watch
```

## Cobertura Actual

El proyecto mantiene los siguientes niveles de cobertura:

- **Statements**: ~86%
- **Branches**: ~75%
- **Functions**: ~80%
- **Lines**: ~85%

### Umbrales de Cobertura

Los umbrales mínimos configurados en `jest.config.js`:

```javascript
{
  branches: 75,
  functions: 80,
  lines: 85,
  statements: 85
}
```

## Tests por Módulo

### Domain Layer Tests

#### Product Entity (`Product.test.ts`)
- ✅ Creación de productos válidos
- ✅ Trimming de espacios en blanco
- ✅ Manejo de campos opcionales (foto)
- ✅ Inmutabilidad de objetos
- ✅ Manejo de valores cero y negativos
- ✅ Manejo de strings vacíos

#### ASMSearchParams (`ASMSearchParams.test.ts`)
- ✅ Validación de parámetros requeridos
- ✅ Trimming de espacios
- ✅ Inmutabilidad
- ✅ Errores de validación

#### Domain Errors (`errors.test.ts`)
- ✅ LoginError
- ✅ ProviderError
- ✅ InvalidParamsError
- ✅ ParsingError
- ✅ Stack traces
- ✅ Mensajes customizados

### Application Layer Tests

#### SearchProductsUseCase (`SearchProductsUseCase.test.ts`)
- ✅ Ejecución exitosa con productos
- ✅ Búsquedas sin resultados
- ✅ Propagación de errores
- ✅ Manejo de grandes volúmenes (500+ productos)
- ✅ Preservación de parámetros

### Infrastructure Layer Tests

#### RamosScraperAdapter (`RamosScraperAdapter.test.ts`)
- ✅ Autenticación exitosa
- ✅ Extracción de clientId
- ✅ Mapeo de productos
- ✅ Paginación múltiple
- ✅ Manejo de fotos (null/presente)
- ✅ Cálculos de precios
- ✅ Manejo de precios en cero
- ✅ Gestión de sesiones
- ✅ Errores de login (401)
- ✅ Errores de parsing
- ✅ Errores de red
- ✅ Errores del proveedor

### Interface Layer Tests

#### ScraperRoutes (`scraperRoutes.test.ts`)
- ✅ POST /scraper/productos exitoso
- ✅ Resultados vacíos
- ✅ Valores por defecto
- ✅ Validación de parámetros (cantidadRenglones, codigoAuto, etc.)
- ✅ Manejo de LoginError (401)
- ✅ Manejo de InvalidParamsError (400)
- ✅ Manejo de ProviderError (502)
- ✅ Manejo de ParsingError (502)
- ✅ Errores no controlados (500)
- ✅ Múltiples productos en respuesta

#### Validation Schemas
- ✅ SearchProductsSchema (`SearchProductsSchema.test.ts`)
  - Validación de tipos
  - Validación de rangos
  - Valores por defecto
  - Longitudes máximas
  
- ✅ ASMSearchProductsSchema (`ASMSearchProductsSchema.test.ts`)
  - Validación de parámetros opcionales
  - Requerimiento de al menos un campo
  - Validación de tipos

## Tecnologías Utilizadas

- **Jest**: Framework de testing
- **ts-jest**: Preset para TypeScript
- **@jest/globals**: Tipos globales de Jest
- **axios-mock-adapter**: Mock de peticiones HTTP
- **Fastify**: Testing de rutas HTTP con inject

## Buenas Prácticas Implementadas

1. **Isolation**: Cada test es independiente con `beforeEach` limpiando el estado
2. **Mocking**: Uso de mocks para dependencias externas (HTTP, adapters)
3. **Coverage**: Alto porcentaje de cobertura en lógica crítica
4. **Descriptive Names**: Nombres claros que documentan el comportamiento esperado
5. **Edge Cases**: Tests para casos límite (valores nulos, vacíos, cero, etc.)
6. **Error Handling**: Tests exhaustivos de manejo de errores
7. **Fast Execution**: Tests rápidos sin dependencias externas reales

## Debugging Tests

Para ejecutar un test específico:

```bash
npm test -- Product.test.ts
```

Para ejecutar con verbose output:

```bash
npm test -- --verbose
```

Para ver solo tests fallidos:

```bash
npm test -- --onlyFailures
```

## Reporte de Cobertura

El reporte de cobertura se genera en:
- `coverage/lcov-report/index.html` - Reporte visual HTML
- `coverage/coverage-final.json` - Reporte JSON
- Terminal - Tabla resumen

Para ver el reporte HTML:

```bash
open coverage/lcov-report/index.html
```

## Continuous Integration

Los tests se pueden integrar fácilmente en pipelines de CI/CD:

```yaml
# Ejemplo GitHub Actions
- name: Run tests
  run: npm test

- name: Check coverage
  run: npm run coverage
```

## Próximas Mejoras

- [ ] Tests de integración end-to-end
- [ ] Performance testing
- [ ] Snapshot testing para respuestas API
- [ ] Mutation testing con Stryker
