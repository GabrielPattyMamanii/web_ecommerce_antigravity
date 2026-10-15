# Problemas detectados: Control de Mercancía / Registrar Ventas

Archivo de seguimiento. Cada problema tiene: descripción, estado actual del código,
solución propuesta y **qué otras cosas afecta** para evaluar el riesgo antes de aplicarla.

---

## Problema 1 — Al registrar una venta no se descuenta `cant_docenas_copy`

**Fecha:** 2026-10-07
**Pantallas involucradas:** `VentasScanner.jsx` (Registrar Ventas), `ControlMercanciaTanda.jsx`,
`ProductScan.jsx`, `AgregarTanda.jsx`, app móvil (`ecommerce-mobile`)

### Síntoma

Se vende producto1 (10 docenas de stock) desde "Registrar Ventas". En Control de Mercancía,
**Doc. Control** sigue mostrando 10 y el subtotal no cambia. Solo cambia la columna
"vend./disp." porque se calcula aparte, sumando filas de `ventas`.

### Estado actual del código (importante)

Ya existe una migración que resuelve la mitad del problema:
`supabase/migrations/20260927_ventas_descuenta_cant_docenas_copy.sql`.

- Agrega `ventas.entrada_id` (FK a `entradas.id`, `ON DELETE SET NULL`).
- Triggers de INSERT / UPDATE / DELETE sobre `ventas` que restan, reajustan o devuelven
  `entradas.cant_docenas_copy`.
- El trigger de `cant_docenas_copy` ya propaga a `catalog_products.stock`
  (`20260927_sync_catalog_product_stock.sql`).
- El front web ya manda `entrada_id` en el carrito (`VentasScanner.jsx:631`).

**Hay que verificar si esa migración está aplicada en Supabase.** Si lo está, el descuento ya
funciona para ventas hechas desde la web, y los problemas reales son los de abajo.
Para verificarlo: vender 1 docena de un producto y revisar `entradas.cant_docenas_copy`.

### Lo que falta / lo que se rompe

**A) Doble descuento en Control de Mercancía (el más importante).**
`ControlMercanciaTanda.jsx:622-657` calcula `disp. = cant_docenas_copy − SUM(ventas)`.
Con el trigger activo, `cant_docenas_copy` ya viene descontado, así que la venta se resta
**dos veces**. Ejemplo: 10 docenas, vendo 3 → copy = 7, y la pantalla muestra
"3 vend. / 4 disp." en vez de 7.

**B) La app móvil no manda `entrada_id`.**
`ecommerce-mobile/stores/cartStore.ts:70-78` y `hooks/useVentasHistorial.ts:138` insertan en
`ventas` sin `entrada_id`. Los triggers ignoran esas filas (`IF entrada_id IS NOT NULL`), así que
las ventas hechas desde el celular **no descuentan nada**.

**C) Ventas históricas sin `entrada_id`.** Las ventas anteriores a la migración quedan en NULL
y no se reflejan en `cant_docenas_copy`. Hay un desfase entre el stock nuevo y el histórico.

**D) Se puede vender más que el stock.** No hay validación ni `CHECK`, y `cant_docenas_copy`
puede quedar negativo.

**E) Doble fuente de descuento con `ProductScan.jsx`.** El escáner QR resta con la RPC
`restar_cant_docenas_copy`. Si el mismo producto se descuenta ahí **y** se registra la venta,
se resta dos veces.

**F) `AgregarTanda.jsx:461-467` pisa el descuento.** Al editar una tanda, si cambia
`cantidad_docenas` se hace `cant_docenas_copy = cantidad_docenas` y se pierden todas las
ventas ya descontadas (las filas de `ventas` siguen existiendo).

### Solución propuesta

1. **Confirmar/aplicar la migración** `20260927_ventas_descuenta_cant_docenas_copy.sql` en
   Supabase. Es la base de todo: el descuento lo hace la base de datos, no el front, así que
   no depende de que cada pantalla se acuerde de restar.
2. **Corregir el doble descuento (A)** en `ControlMercanciaTanda.jsx`. Opciones:
   - **2a (recomendada):** que "disp." sea directamente `cant_docenas_copy` y que "vend." siga
     siendo `SUM(ventas)` solo informativo. La barra de progreso pasa a
     `vendido / (copy + vendido)`.
   - **2b:** cambiar "Doc. Control" para que muestre el original (`cantidad_docenas`) y dejar
     `disp. = original − vendido`. No requiere tocar el trigger, pero entonces `cant_docenas_copy`
     deja de ser lo que muestra la pantalla.
3. **Mandar `entrada_id` desde la app móvil (B).** Incluir `entrada_id` en los items del carrito
   de `cartStore.ts` (y en `useVentasHistorial.ts`). Sin esto la app móvil queda fuera.
4. **Backfill de ventas históricas (C), opcional.** Asociar `entrada_id` por
   `codigo + tanda_nombre + propietario` solo donde el match sea único, y **no** recalcular
   `cant_docenas_copy` automáticamente: revisar a mano porque el match por texto es frágil.
5. **Validar stock (D).** Opcional: rechazar el INSERT si `cant_docenas_copy < cantidad`
   (en el trigger con `RAISE EXCEPTION`) o solo avisar en el front.
6. **Definir qué hace ProductScan (E).** Decidir si el escáner sigue restando de forma manual
   (control físico) o si queda solo de consulta. Ambos no pueden restar el mismo stock.
7. **Ajustar AgregarTanda (F).** Al cambiar `cantidad_docenas`, en vez de pisar el valor hacer
   `copy = copy + (cantidad_nueva − cantidad_vieja)`.

### Qué afecta (evaluar riesgo)

| Cambio | Afecta | Riesgo |
|---|---|---|
| Aplicar migración | `catalog_products.stock` se actualiza en cadena (la tienda pública ve menos stock al vender). `ventas` gana una columna. | Bajo. No modifica datos existentes. |
| Corregir Control Mercancía (2a/2b) | Solo esa pantalla. Revisar también `BoletasTanda.jsx` y `ControlMercancia.jsx`, que suman `cant_docenas_copy` para totales y valor facturado: bajarán al vender. | Medio. Cambia qué significa "Doc. Control" y "Total Facturado". |
| `entrada_id` en móvil | Solo ventas nuevas del celular. Requiere nueva build de la app. | Bajo. |
| Backfill | `entradas.cant_docenas_copy` y `catalog_products.stock`. | Alto si se automatiza. Hacer backup antes. |
| Validar stock | Bloquea ventas que hoy se permiten (ventas de más, ajustes). | Medio. Puede frenar la caja si el stock cargado está mal. |
| Ajuste en AgregarTanda | Edición de tandas. | Bajo/medio. |

### Decisión pendiente

- ¿"Doc. Control" debe ser el stock **actual** (baja al vender) o el **original** de la boleta?
  Hoy el nombre sugiere lo segundo, pero lo pedido implica lo primero. De esto depende 2a vs 2b.
