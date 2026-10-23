# Costo distinto en marcas con bultos personalizados

**Estado:** detectado, sin corregir (análisis en solo lectura).
**Fecha:** 2026-10-21

## Problema

En una marca con `bultos_personalizados > 0`, las pantallas de ventas muestran un costo por docena distinto al de **Precio Venta Sugerido**.

## Causa: dos calculadoras de costo distintas

| Pantalla | Código | Conoce bultos personalizados |
|---|---|---|
| Precio Venta Sugerido | `src/components/pricing/BrandAccordion.jsx` (líneas ~50-94) | Sí (fórmula 2) |
| VentasScanner, VentasHistorial, búsqueda global | `calcPrice` en `src/utils/pricingUtils.js` | No |

`calcPrice` solo tiene la fórmula normal y la de tandas viejas (`old_entradas`):

```
costo = (precio_docena × docenas + gastos × bultos) / docenas
```

## Por qué da distinto

En las marcas con bultos personalizados, `entradas.bultos` vale **0** en todas las filas. Los bultos reales están en `tandas.parametros.marcasMetadata[marca_id o marca].bultos_personalizados`.

Con la fórmula normal: `gastos × 0 = 0`, o sea `costo = precio_docena`. El flete no se suma.

Precio Venta Sugerido sí suma el flete con la fórmula 2:

```
K = suma(docenas × precio_docena) de la marca
L = gastos × bultos_personalizados
D = docenas × precio_docena
E = 100 × D / K
F = 0,01 × E × L
G = (precio_docena + F) / docenas
H = G + precio_docena      ← "PV Costo"
```

## Ejemplo: boleta 000491 (marca URUS, tanda PRIMERA TANDA OCTUBRE)

5 bultos personalizados, gastos 180 por bulto. En esa boleta `entradas.bultos` = 0 en todas las filas.

- GT0300 en Precio Venta Sugerido: **75,66** (USD por docena).
- GT0300 en VentasScanner / Historial: solo `precio_docena`, sin flete.

El valor exacto de `precio_docena` de GT0300 no está confirmado, pero es menor que 75,66.

## Consecuencias

- Precios de venta calculados con `calcPrice` quedan más bajos que los sugeridos.
- Si se guardara `ventas.costo_docena_ars` con `calcPrice`, la ganancia de estas marcas quedaría inflada (falta el flete).
- No afecta a tandas normales ni a tandas viejas.

## Problema relacionado: posible error en la fórmula 2

`H = G + precio_docena` suma `precio_docena` de más. En la boleta 000491 el costo total da 15.662 en vez de 14.368 + 900 = 15.268 (USD 394 de más, +2,6 %). **Falta confirmar con el dueño si es intencional.**

## Solución propuesta (pendiente de aprobación)

Una sola función de costo compartida que conozca los bultos personalizados, usada por Precio Venta Sugerido, las pantallas de ventas y el costo que se guarda en la venta. Método propuesto (prorrateo por valor):

```
bultos_boleta  = bultos_personalizados (si existe y > 0) o suma de `bultos` de la boleta
gastos_totales = gastos_por_bulto × bultos_boleta
compra_total   = suma(docenas × precio_docena) de la boleta (grupo marca + boleta)
costo_docena   = precio_docena × (1 + gastos_totales / compra_total)   [USD]
```

Para GT0300 daría 72,26 (con la fórmula actual del programa, 75,66).

## Bloqueante

`tandas` devuelve 0 filas con la clave pública por RLS, así que `bultos_personalizados` no se puede leer desde fuera del panel admin. Falta aplicar la migración `supabase/migrations/20261021_tandas_admin_rls.sql` o pegar resultados de un SELECT hecho por el dueño.
