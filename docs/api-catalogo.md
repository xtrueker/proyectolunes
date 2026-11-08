
# Agro-Red Magdalena - API del catálogo

## Base URL

http://localhost:4000/api

## Categorías

### GET /categories
Consulta todas las categorías disponibles.

## Productos

### GET /products
Consulta los productos activos.

Parámetros opcionales:
- search: búsqueda por nombre o descripción.
- categoryId: identificador de categoría.
- location: ubicación del producto.
- minPrice: precio mínimo.
- maxPrice: precio máximo.

### GET /products/:id
Consulta los detalles de un producto por su identificador.

## Respuestas

Las respuestas exitosas utilizan:
- success: indica si la operación fue exitosa.
- data: contiene los registros o el producto.
- total: cantidad de productos encontrados.

## Estado actual

Implementadas las consultas de categorías y productos.
La creación, edición y eliminación de productos requiere
autenticación y validación de permisos.
