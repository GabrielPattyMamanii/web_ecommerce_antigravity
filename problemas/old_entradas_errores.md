# Errores encontrados — Integración `old_entradas`

Fecha del análisis: 2026-03-05

> Este archivo documenta los bugs críticos encontrados en la primera implementación luego de consultar la base de datos real.

---

## Bug 1 — Nombre de tanda incorrecto (case mismatch) 🔴 CRÍTICO

**Archivo:** `src/services/pricingService.js`

**Descripción:** La constante usada para identificar la tabla fuente era `'tandas viejas'` (todo minúsculas), pero el valor real almacenado en la columna `old_entradas.tanda_nombre` es `'Tandas viejas'` (T y V en mayúscula).

**Impacto:** `getTandaDetails()` nunca hubiera cargado datos desde `old_entradas`. El sistema intentaría buscar `'Tandas viejas'` en la tabla `entradas`, fallando silenciosamente.

**Solución aplicada:**
```diff
- const TANDAS_VIEJAS_NOMBRE = 'tandas viejas';
+ const TANDAS_VIEJAS_NOMBRE = 'Tandas viejas';
```

---

## Bug 2 — Columna `codigo_boleta` inexistente en `old_entradas` 🔴 CRÍTICO

**Archivo:** `src/pages/admin/PrecioVentaListado.jsx`

**Descripción:** El buscador filtraba `old_entradas` usando `.or('codigo.ilike.%term%,codigo_boleta.ilike.%term%')`, pero `old_entradas` **no tiene columna `codigo_boleta`**.

**Impacto:** Supabase respondería con error `42703 column does not exist`, haciendo que toda la búsqueda fallara.

**Solución aplicada:** Para `old_entradas` se usa exclusivamente `.ilike('codigo', '%term%')`.

---

## Bug 3 — `Invalid Date` en `TandaCard` 🟡 MODERADO

**Archivo:** `src/components/pricing/TandaCard.jsx`

**Descripción:** `old_entradas` no tiene columna `tanda_fecha`. El componente llamaba `new Date(undefined).toLocaleDateString(...)`, produciendo el string `"Invalid Date"` visible en el UI.

**Impacto:** Visual — la card mostraría "Invalid Date" en lugar de una fecha.

**Solución aplicada:**
```javascript
const formattedDate = tanda.tanda_fecha
    ? new Date(tanda.tanda_fecha).toLocaleDateString('es-AR', { ... })
    : 'Archivo histórico';
```

---

## Bug 4 — `getTandasSummary` consultaba `tanda_fecha` en `old_entradas` 🟡 MODERADO

**Archivo:** `src/services/pricingService.js`

**Descripción:** El `select` de `old_entradas` en `getTandasSummary()` incluía `tanda_fecha`, columna que no existe.

**Impacto:** El select de Supabase puede responder con `null` en esa columna o error dependiendo de la versión/configuración. No crítico porque el fallback `|| new Date().toISOString().split('T')[0]` existía, pero innecesariamente solicitaba una columna inexistente.

**Solución aplicada:** El select ahora solo pide columnas que existen: `tanda_nombre, marca, cantidad_docenas, producto_titulo`.

---

## Columnas reales de `old_entradas` (para referencia futura)

| Columna | Tipo | Presente en `entradas`? |
|---|---|---|
| `id` | UUID | ✅ |
| `tanda_nombre` | String (`'Tandas viejas'`) | ✅ |
| `codigo` | String | ✅ |
| `marca` | String | ✅ |
| `producto_titulo` | String | ✅ |
| `cantidad_docenas` | Number | ✅ |
| `precio_docena` | Number | ✅ |
| `gastos` | Number | ✅ |
| `precio_docena_pay_chile` | Number | ❌ Solo en old_entradas |
| `costo_docena_envio` | Number | ❌ Solo en old_entradas |
| `total_gasto` | Number | ❌ Solo en old_entradas |
| `precio total gastado` | Number (nombre con espacios) | ❌ Solo en old_entradas |
| `tanda_fecha` | — | ❌ AUSENTE en old_entradas |
| `codigo_boleta` | — | ❌ AUSENTE en old_entradas |
| `propietario` | — | ❌ AUSENTE en old_entradas |
| `fotos` | — | ❌ AUSENTE en old_entradas |
