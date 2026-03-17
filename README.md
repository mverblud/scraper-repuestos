# scraper-repuestos

API REST para scraping de catálogos de proveedores de repuestos automotor. Permite consultar productos del proveedor **Ramos** mediante autenticación y scraping de su sistema web.

## Tabla de contenidos

- [Tecnologías](#tecnologías)
- [Arquitectura](#arquitectura)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Variables de entorno](#variables-de-entorno)
- [Uso](#uso)
- [API](#api)
- [Tests](#tests)

---

## Tecnologías

- **Node.js** + **TypeScript**
- **Fastify** — framework HTTP
- **Axios** + **Cheerio** — scraping HTTP y parseo HTML
- **Zod** — validación de esquemas
- **Jest** + **ts-jest** — testing

## Arquitectura

El proyecto sigue **Clean Architecture** con separación en capas:

```
src/
├── domain/          # Entidades, puertos e interfaces del dominio
├── application/     # Casos de uso
├── infrastructure/  # Adaptadores (scrapers, HTTP)
└── interface/       # Rutas HTTP y esquemas de validación
```

## Requisitos

- Node.js >= 18
- npm >= 9

## Instalación

```bash
git clone https://github.com/mverblud/scraper-repuestos.git
cd scraper-repuestos
npm install
```

## Variables de entorno

Copiá el archivo de ejemplo y completá con tus credenciales:

```bash
cp .env.example .env
```

| Variable            | Descripción                                     | Requerida |
|---------------------|-------------------------------------------------|-----------|
| `LOGIN_URL`         | URL de login del proveedor Ramos                | ✅        |
| `CATALOG_URL`       | URL del catálogo de artículos                   | ✅        |
| `SEARCH_URL`        | URL de búsqueda de artículos                    | ✅        |
| `PROVIDER_USER`     | Usuario del proveedor                           | ✅        |
| `PROVIDER_PASSWORD` | Contraseña del proveedor                        | ✅        |
| `PROVIDER_CLIENT_ID`| ID de cliente (fallback si no se extrae)        | ❌        |
| `PORT`              | Puerto del servidor (default: `3000`)           | ❌        |
| `HOST`              | Host del servidor (default: `0.0.0.0`)          | ❌        |

## Uso

**Desarrollo:**
```bash
npm run dev
```

**Producción:**
```bash
npm run build
npm start
```

## API

### Health check

```
GET /health
```

**Respuesta:**
```json
{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

---

### Buscar productos

```
POST /scraper/productos
```

**Body:**

```json
{
  "codigoAuto": "string",
  "marcaId": "string",
  "rubroId": "string",
  "cantidadRenglones": 50
}
```

| Campo               | Tipo     | Descripción                          | Default |
|---------------------|----------|--------------------------------------|---------|
| `codigoAuto`        | `string` | Código del vehículo (max 200 chars)  | `""`    |
| `marcaId`           | `string` | ID de la marca (max 10 chars)        | `""`    |
| `rubroId`           | `string` | ID del rubro (max 10 chars)          | `""`    |
| `cantidadRenglones` | `number` | Cantidad de resultados (1-500)       | `50`    |

**Respuesta exitosa `200`:**
```json
[
  {
    "codigo": "string",
    "descripcion": "string",
    "precio": 1234.56,
    "precioConDescuento": 1000.00
  }
]
```

**Errores:**

| Código | Descripción                          |
|--------|--------------------------------------|
| `400`  | Parámetros inválidos                 |
| `401`  | Error de autenticación con proveedor |
| `502`  | Error del proveedor o de parsing     |
| `500`  | Error interno del servidor           |

## Tests

```bash
# Correr tests
npm test

# Modo watch
npm run test:watch

# Con cobertura
npm run coverage
```
