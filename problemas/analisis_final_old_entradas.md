# Análisis Definitivo — Estado Final de la Integración `old_entradas`

Fecha: 2026-03-05

## Esquema real confirmado (live DB query)

**190 filas** en `old_entradas`. Columnas confirmadas:

| Columna | Tipo | Valor de ejemplo |
|---|---|---|
| `id` | UUID | `f8a5dc5d-...` |
| `tanda_nombre` | String | `"tandas viejas"` (**todo minúsculas**) |
| `tanda_fecha` | Date | `"2026-03-05"` ✅ Existe |
| `codigo_boleta` | String | `"00000"` ✅ Existe |
| `codigo` | String | `"157"` |
| `marca` | String | `"grande aguila"` |
| `producto_titulo` | String | `"palazo"` |
| `cantidad_docenas` | Number | `26` |
| `precio_docena` | Number | `43.38` (calculado: pay_chile + envio) |
| `gastos` | Number | `140` |
| `precio_docena_pay_chile` | Number | `38` |
| `costo_docena_envio` | Number | `5.38` |
| `total_gasto` | Number | `1128` |
| `precio total gastado` | Number | `988` (nombre con espacios) |

**Columnas ausentes vs `entradas`:** `observaciones`, `fotos`, `bultos`, `propietario`, `marca_id`, `cant_docenas_copy`, `created_at`

---

## Historial de errores cometidos

### Iteración 1 — Error original
- `TANDAS_VIEJAS_NOMBRE = 'tandas viejas'` ✅ Correcto originalmente

### Iteración 2 — Análisis incorrecto de BD
- El browser subagent reportó incorrectamente que `tanda_fecha` y `codigo_boleta` no existían
- Se "corrigió" el constant a `'Tandas viejas'` → INCORRECTO
- Se eliminó `tanda_fecha` y `codigo_boleta` del select → INCORRECTO

### Iteración 3 — Nuevo query live confirmó la verdad
- `tanda_nombre` real = `'tandas viejas'` (minúsculas)
- `tanda_fecha` y `codigo_boleta` SÍ existen
- Se revirtieron los cambios incorrectos

---

## Estado final del código (2026-03-05)

### `pricingService.js`
```javascript
const TANDAS_VIEJAS_NOMBRE = 'tandas viejas'; // ✅ Correcto
// getTandasSummary: selecciona tanda_fecha ✅
// getTandaDetails: usa old_entradas cuando tanda === TANDAS_VIEJAS_NOMBRE ✅
```

### `PrecioVentaListado.jsx`
```javascript
// Search usa codigo_boleta en old_entradas ✅ (columna existe)
.or(`codigo.ilike.%${term}%,codigo_boleta.ilike.%${term}%`)
```

### `TandaCard.jsx`
```javascript
// tanda_fecha existe → muestra fecha real
// Fallback 'Archivo histórico' por si acaso ✅
```

---

## Comportamiento esperado

| Acción | Resultado |
|---|---|
| Abrir `/admin/precio-venta-sugerido` | Card "tandas viejas" con ícono archivo ámbar |
| Fecha en la card | Muestra `5 mar. 2026` (tanda_fecha = 2026-03-05) |
| Clic "Ver Precios" | Carga 190 productos de old_entradas |
| Buscar código | Encuentra productos en old_entradas |
| `BrandAccordion` | Agrupa por marca + codigo_boleta='00000', calcula precios con precio_docena |

---

## Nota sobre `precio_docena` en old_entradas

El campo `precio_docena` ya incluye el costo de envío sumado (`precio_docena_pay_chile + costo_docena_envio`). El cálculo en `BrandAccordion` usa este valor directamente, lo cual es correcto.
