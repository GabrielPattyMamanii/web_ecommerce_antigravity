# Problemas — Integración `old_entradas` en Precio de Venta Sugerido

Fecha: 2026-03-05

## 1. Tabla vacía / inaccessible vía REST API anon key

**Problema detectado:** Al consultar `old_entradas` directamente usando la REST API de Supabase con la anon key (`sb_publishable_...`), la respuesta fue un array vacío `[]`.

**Causas posibles:**
- La tabla tiene **Row Level Security (RLS)** habilitado con políticas que bloquean `SELECT` para users anónimos.
- La tabla simplemente **no tiene datos cargados** aún.

**Solución implementada:** El código trata errores y respuestas vacías de `old_entradas` de forma silenciosa (no lanza excepción), por lo que:
- Si la tabla tiene datos y RLS los permite: aparece la card "TANDAS VIEJAS" con sus métricas.
- Si la tabla está vacía: **no aparece ninguna card** (ya que no hay filas para agregar al resumen).
- Si hay un error de RLS: igual no aparece la card (se interpreta como vacío).

**Acción requerida si la tabla no aparece:**
1. Verificar en Supabase Dashboard → `Authentication > Policies` que `old_entradas` tiene una política de SELECT habilitada para anon o authenticated.
2. O bien desactivar RLS en `old_entradas` si no es necesario.

Ejemplo de política permisiva en Supabase SQL:
```sql
CREATE POLICY "Permitir lectura de old_entradas" ON old_entradas
FOR SELECT USING (true);
```

---

## 2. Columna `tanda_fecha` potencialmente ausente

**Problema detectado:** No se pudo confirmar si `old_entradas` tiene columna `tanda_fecha` (tabla vacía/inaccesible).

**Solución implementada:** Se usa fallback a la fecha actual cuando `tanda_fecha` es null:
```js
tanda_fecha: curr.tanda_fecha || new Date().toISOString().split('T')[0]
```

---

## 3. Columnas que se asumen compatibles

Se asume que `old_entradas` tiene las mismas columnas que `entradas`:

| Columna | Usado en |
|---|---|
| `tanda_nombre` | Agrupación (siempre `"tandas viejas"`) |
| `tanda_fecha` | Fecha en TandaCard |
| `marca` | Filtro y agrupación en detalle |
| `cantidad_docenas` | Métrica total docenas |
| `producto_titulo` | Nombre del producto |
| `codigo` | Match con catálogo |
| `codigo_boleta` | Filtro boleta |
| `precio_docena` | Cálculo precio venta |
| `gastos` | Gastos totales tanda |
| `propietario` | Filtro propietario |
| `observaciones` | Descripción en catálogo |

Si alguna columna falta, el cálculo de precios simplemente usará `0` como valor por defecto.
