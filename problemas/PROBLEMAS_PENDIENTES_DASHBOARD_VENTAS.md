# Riesgos y problemas del dashboard de ventas y ganancia

> Documento para que una IA (o una persona) lo lea y los vaya resolviendo uno por uno. Estado a 2026-10-26.
> Contexto completo y fórmulas: `problemas/DASHBOARD_VENTAS_GANANCIA_CONTEXTO.md`.
> Reglas de trabajo: no escribir en la base sin autorización expresa (las migraciones las ejecuta el dueño a mano en el
> SQL Editor de Supabase); no mostrar claves ni tokens; responder en español; no hacer commit sin que lo pidan.

## Contexto mínimo

- Dashboard `/admin/resumen-ventas` (solo admin): tarjetas, gráfico Chart.js (vendido y ganancia), tabla por período con
  desplegable de lo vendido (pedidos y productos, índice, markup, margen), botón Pesos / Dólares en el desplegable (cada venta
  con SU `dolar_blue`), filtro de días de la semana, banner de ventas sin costo con botón "Recalcular costos".
- El costo por docena se guarda en USD en `ventas.costo_docena_usd` al registrar la venta. Fórmulas en
  `src/utils/costoDocena.js` y su copia SQL `calc_costo_docena_usd` (`20261024_backfill_costo_docena_usd.sql`).
- **Regla vigente (decisión final del dueño):** se usa el prorrateo por valor SOLO si los bultos personalizados son distintos
  de cero Y la suma de `bultos` de las filas de la boleta (grupo tanda + marca + boleta) es cero. Si no, bultos por fila.
  Igual para el costo de la venta y para Precio Venta Sugerido.
- Migraciones en `supabase/migrations/`, todas ejecutadas por el dueño: `20261023_ventas_costo_docena_usd`,
  `20261023_get_bultos_personalizados_rpc`, `20261024_backfill_costo_docena_usd`, `20261024_get_dashboard_ventas_rpc`,
  `20261026_recalcular_costos_ventas_rpc`, `20261026_get_ventas_periodo_rpc`, `20261027_ventas_ocultar_costo_docena_usd`.
- El dueño probó a mano y confirmó que funcionan: historial de ventas, agregar producto a un pedido, registrar una venta y el
  resumen de ventas.
- Datos medidos el 2026-10-26 (solo lectura): 1.135 ventas ($ 200,9 M). 935 con costo (80,1 %), 169 sin vínculo a un
  producto (`entrada_id` NULL, $ 36,0 M, 17,9 %), 31 con vínculo y sin costo (2,0 %).

---

## Riesgos importantes

### 1. Los costos y la ganancia eran públicos — RESUELTO

`ventas` se podía leer con la clave pública del front (política `ventas_all USING (true)`), y al guardar el costo ahí quedaban
expuestos costos y márgenes. Se ocultó la columna `costo_docena_usd` para `anon` y `authenticated` (migración `20261027`);
solo la leen las RPC `SECURITY DEFINER` del dashboard. Verificado con la clave pública: pedir `costo_docena_usd` o `*` da
"permission denied", y `id,total_ars` sigue funcionando. `VentasHistorial.jsx` ya no usa `select('*')` (usa `VENTAS_COLUMNAS`).
Vuelta atrás: `GRANT SELECT ON public.ventas TO anon, authenticated;`.

Lo que NO resuelve (precios, totales, dólar y datos de pago siguen legibles y modificables con la clave pública) es la tarea
aparte "Otros pendientes, punto E".

### 2. Costo sin envío, en silencio (boletas "mixtas")

> **DESCARTADO por el dueño (2026-10-26):** no es un problema, porque en las boletas siempre existen bultos. No se cambia nada. Lo de abajo
> queda solo como registro.

- **Qué pasa:** si una boleta tiene bultos en algunas filas y 0 en otras, la suma da más que cero, así que se usan los bultos
  por fila. Las filas con 0 bultos de esa misma boleta quedan con costo SIN envío, sin aviso ni valor vacío. La protección
  (devolver NULL) solo salta cuando la suma completa de la boleta es 0. Puede inflar la ganancia de esos productos.
- **Medido el 2026-10-26:** solo 1 boleta de 61 cumple esa condición (con gastos > 0): PRIMERA TANDA OCTUBRE / MARCATEST / 0001,
  3 filas sin bultos, una marca de prueba. **0 ventas afectadas.** Riesgo bajo hoy, pero puede aparecer con tandas nuevas.
- **Dónde está la lógica:** `src/utils/costoDocena.js` (rama "Bultos por fila": solo corta si `gastos > 0 && sumaBultosFilas === 0`) y
  `calc_costo_docena_usd` (`IF v_gastos > 0 AND v_suma_bultos = 0 THEN RETURN NULL`).
- **Solución propuesta:** devolver NULL (con motivo) cuando la fila tiene `gastos > 0` y `bultos = 0` aunque otras filas de la
  boleta tengan bultos, en las dos implementaciones (JS y SQL), o al menos avisarlo.
- **Decisión del dueño:** NULL con aviso, o aceptar el costo sin envío en esos casos.

### 3. La regla nueva de bultos cambia precios sugeridos — RESUELTO (2026-10-26)

> El dueño corrió la consulta de abajo, vio las boletas con bultos personalizados Y bultos en las filas, y las **corrigió a mano** en Tandas.
> Nota: las ventas que ya tenían costo guardado en esas boletas conservan el costo calculado con los datos de antes de la corrección
> (ver problema b); "Recalcular costos" solo completa ventas sin costo y no las actualiza. Los precios sugeridos usan los datos nuevos.


- **Qué pasa:** si una boleta tiene bultos personalizados Y bultos en las filas, ahora usa las filas (antes usaba el prorrateo).
  Su Precio Venta Sugerido puede haber cambiado. No se midió cuántas boletas caen en ese caso, porque `tandas` no es legible
  con la clave pública (solo se puede medir desde el SQL Editor).
- **Dónde está la regla:** `BrandAccordion.jsx` (`useProportionalFormula`), `PrecioVentaListado.jsx` (`useProportional`) y
  `attachProrrateo` en `src/utils/pricingUtils.js`.
- **Cómo medirlo** (SQL Editor, solo lectura):

```sql
with pers as (
  select t.nombre as tanda, m.key as marca_key,
         case when (m.value->>'bultos_personalizados') ~ '^[0-9]+(\.[0-9]+)?$'
              then (m.value->>'bultos_personalizados')::numeric else 0 end as personalizados
  from tandas t, jsonb_each(coalesce(t.parametros->'marcasMetadata', '{}'::jsonb)) m
),
bol as (
  select tanda_nombre, marca, marca_id, codigo_boleta, sum(coalesce(bultos, 0)) as suma_bultos
  from entradas group by 1, 2, 3, 4
)
select b.tanda_nombre, b.marca, b.codigo_boleta, p.personalizados, b.suma_bultos
from bol b
join pers p on p.tanda = b.tanda_nombre and p.marca_key = coalesce(nullif(b.marca_id, ''), b.marca)
where p.personalizados > 0 and b.suma_bultos > 0
order by 1, 2, 3;
```

- **Decisión del dueño:** si devuelve filas, confirmar que el cambio de fórmula de esas boletas es lo esperado.

### 4. La app móvil no guarda costo — DESCARTADO

`ecommerce-mobile/stores/cartStore.ts` inserta ventas sin `costo_docena_usd`. El dueño indicó que la app ya no se usa, así que no
se tocó. Si se reactiva: guardar el costo al vender, y cambiar `hooks/useVentasHistorial.ts` (usa `select('*')`, que ahora falla
por la migración `20261027`) a una lista de columnas.

---

## Riesgos medios

### 5. Lógica duplicada (riesgo de desfase sin error visible) — RESUELTO (2026-10-26)

**Qué se hizo:**
- En JavaScript hay ahora UNA sola fuente: `src/utils/costoDocena.js`. La usan el costo guardado en la venta, la exportación de tandas
  y todos los precios sugeridos (`calcPrice`, `attachProrrateo`, `BrandAccordion.jsx`, `PrecioVentaListado.jsx`) mediante
  `calcularCostoParaPrecio` / `calcCostoSugerido`. Se eliminaron las fórmulas propias de cada pantalla.
- `attachProrrateo` ahora adjunta `_filasBoleta` y `_bultosPersonalizados` (antes `_prorrateo`); `VentasScanner.jsx` los conserva en
  `prorrateoRef` para recalcular al cambiar el índice.
- La copia SQL (`calc_costo_docena_usd`) se vigila con `npm run test:paridad` (`scripts/test-paridad-costo.mjs`, usa PGlite, no toca
  ninguna base real): 9 casos / 17 comparaciones, comprobado que falla si se cambia la regla en un solo lado. Si cambia la regla,
  hay que cambiar JS y SQL y agregar el caso en ese script.
- **Aviso "Sin bultos":** cuando la boleta tiene gastos pero ningún bulto (ni por fila ni personalizado), el precio se sigue mostrando
  (sin envío, como antes) y aparece una etiqueta ámbar "Sin bultos" con tooltip en: Precio Venta Sugerido por tanda (`BrandAccordion`,
  escritorio y móvil), buscador de precios (`PrecioVentaListado`, dos vistas), buscadores globales (`GlobalPriceSearchBar` y
  `GlobalPriceSearchResults`), y un aviso en `ProductScan`, `VentasScanner` y `VentasHistorial` (toast). No se muestra si no se pudieron
  leer los bultos personalizados (RPC sin permiso o tanda ilegible), para no dar un aviso falso.
- Corregido de paso: en la vista de búsqueda de `PrecioVentaListado` la consulta de filas no traía `bultos` y solo se hacía para marcas
  con personalizados, así que la regla "personalizados solo si la suma de bultos es 0" no se aplicaba ahí.

**Diferencias que existían entre costo y precio y quedaron unificadas:** boleta sin bultos (antes el precio se calculaba sin avisar),
valor de compra 0 y gasto por bulto de la fila vs. de la primera fila.

**Pendiente de este tema:** ninguno en el código. Falta que el dueño compruebe en pantalla que los precios sugeridos no cambiaron
(salvo las boletas del problema 3) y vea el aviso en las boletas sin bultos (las 3 del punto A).

### 6. El recalcular y el backfill usan datos de hoy

- Si una tanda se corrigió después de vender, el costo de una venta vieja sale distinto del que habría dado ese día. Las 935
  ventas ya completadas se calcularon así (backfill con datos actuales de `entradas` y `tandas`).
- El dueño indicó que esos datos casi nunca cambian, salvo correcciones, así que el riesgo es bajo. Sin acción por ahora;
  tenerlo presente si aparecen diferencias.

### 7. Un UPDATE sobre `ventas` puede activar otros triggers — RESUELTO (2026-10-26)

> **Verificado:** `ventas` tiene exactamente 3 triggers, todos de stock (`trg_ventas_descuenta_stock` AFTER INSERT, `trg_ventas_devuelve_stock`
> AFTER DELETE, `trg_ventas_reajusta_stock` AFTER UPDATE). El dueño pasó el código real de `reajustar_stock_por_edicion_venta()` en su base y es
> idéntico al de la migración `20260927`: solo mueve stock si cambia `entrada_id` o `cantidad_docenas`. Un UPDATE que solo cambia
> `costo_docena_usd` (backfill y "Recalcular costos") NO mueve stock. No hay otros triggers (el de sincronizar el código no está en `ventas`).


- Se revisaron los triggers de stock (`trg_ventas_descuenta_stock`, `trg_ventas_reajusta_stock`, `trg_ventas_devuelve_stock`,
  migración `20260927`): un UPDATE que no cambie `cantidad_docenas` ni `entrada_id` no mueve stock. No se revisaron todos los
  triggers de la tabla (por ejemplo el de sincronizar el código, `20261016_sync_codigo_ventas.sql`). El backfill y el botón
  "Recalcular costos" hacen UPDATE de `costo_docena_usd`. El backfill ya corrió y parece haber salido bien, pero no se verificó
  contra el stock.
- **Cómo verificarlo** (solo lectura, SQL Editor):

```sql
select tgname, pg_get_triggerdef(oid) from pg_trigger
where tgrelid = 'public.ventas'::regclass and not tgisinternal;
```

  Y comparar `entradas.cant_docenas_copy` antes y después de un "Recalcular costos" real.

---

## Riesgos menores

### a. Datos históricos: el 18 % del vendido nunca tendrá ganancia

> **NO TOCAR / DEJAR ASÍ:** el dueño indicó que se deja como está (2026-10-26). No vincular ni modificar nada.

169 ventas sin `entrada_id` ($ 36,0 M), todas de junio a septiembre (junio 115, julio 44, agosto 6, septiembre 4; ninguna de
octubre). Quedan como vendido pero fuera de costo, ganancia, índice, markup y margen, así que los totales de junio y julio son
parciales. No se pueden vincular por código de forma segura: de 27 códigos distintos solo 15 coinciden con una única entrada
(31 ventas); hay 49 códigos repetidos en `entradas`, incluso dentro de la misma boleta; y asignar `entrada_id` dispara los
triggers de stock (descontaría docenas otra vez). Opciones: dejarlas fuera del cálculo (lo que hace hoy, con nota gris),
vincular a mano solo las claras, o cargarles un costo manual. Decisión del dueño.

### b. Costos congelados

Una corrección posterior de una boleta no actualiza las ventas ya costeadas. Es así por diseño (el botón "Recalcular costos" solo
completa ventas con costo NULL y nunca sobrescribe).

### c. Trabajo sin commitear — lo hace el dueño

> El dueño hará el commit él mismo. No hacer commits.

Todo está sin guardar en git, mezclado con cambios de otros chats. Un error de disco o un `git checkout` lo pierde. Pedir al
dueño que autorice un commit antes de seguir acumulando cambios.

### d. Filtro de días — DESCARTADO (2026-10-26)

> El dueño aclaró que el filtro solo OCULTA ventas de la vista (no las elimina) y que puede vender cualquier día. No es un problema; no se cambia nada.

El botón "Solo lun, mié y sáb" (`elegirDias([1, 3, 6])` en `VentasDashboard.jsx`) oculta ~65 ventas históricas: 35 de un solo
domingo (2026-06-28, $ 4,75 M) y 30 de un solo jueves (2026-07-09, $ 4,2 M), ~4,4 % del vendido. Son datos de junio y julio, no
del período actual. Decisión del dueño: si fueron días excepcionales (no hace falta cambiar nada) o si el atajo debe ser configurable.

---

## Otros pendientes detectados (no estaban en la lista de riesgos)

A. **[CORREGIDO A MANO por el dueño, 2026-10-26]** — cargó los bultos de esas 3 boletas en Tandas. (No verificable con la clave pública: las filas de
   `entradas` siguen con 0 bultos, así que se cargaron como bultos personalizados de la marca; `tandas` solo se lee desde el SQL Editor.)
   Queda solo confirmar que apretó "Recalcular costos" y que el banner de ventas sin costo desapareció.
   Descripción original del problema: **31 ventas con vínculo sin costo (3 boletas sin bultos).** La boleta tiene `gastos` pero ningún bulto cargado (ni por fila
   ni personalizado), así que el cálculo devuelve NULL a propósito. Boletas: SEGUNDA TANDA JULIO / URUS / 000426 (11 ventas, gastos 177),
   TANDA VIEJA JULIO RETORNO / SSJ / 0026343 (19 ventas, gastos 175), PRIMERA TANDA AGOSTO / YOOMITO / 020539 (1 venta, gastos 178).
   Solución: el dueño carga los bultos de esas boletas en Tandas y aprieta "Recalcular costos" en el dashboard.

B. **[HECHO 2026-10-26]** El detalle del banner ahora agrupa las ventas sin costo por boleta (tanda · marca · boleta) y dice el motivo y qué hacer
   (sin bultos, valor de compra 0, faltan datos, producto borrado, o "se puede calcular ahora"), con los productos de cada una. El motivo sale de
   `calc_costo_docena_usd_detalle` (SQL; una sola implementación, `calc_costo_docena_usd` la usa) y `npm run test:paridad` compara también el código
   del motivo entre JS y SQL. Requiere re-ejecutar, EN ESTE ORDEN: `20261024_backfill_costo_docena_usd.sql` y luego `20261024_get_dashboard_ventas_rpc.sql`.
   Descripción original: **El banner de "ventas sin costo" daba una causa inexacta.** Dice "suele pasar si falló la consulta de bultos personalizados", pero
   la causa real hoy es A. La lista (`alertas.lista_sin_costo_con_vinculo` en `get_dashboard_ventas`) no muestra tanda, marca, boleta
   ni motivo. Propuesta: incluirlos (con la lógica de `calc_costo_docena_usd`), agrupar por boleta y corregir el texto
   (`20261024_get_dashboard_ventas_rpc.sql` y `VentasDashboard.jsx`).

C. **[HECHO 2026-10-26]** Botón "Mostrar montos en: Pesos / Dólares" que dolariza tarjetas, gráfico, tabla por período y desplegables; cada venta se
   convierte con SU `dolar_blue` (RPC `get_dashboard_ventas` devuelve `vendido_usd`, `costo_usd`, `ganancia_usd`; hay que re-ejecutar
   `20261024_get_dashboard_ventas_rpc.sql`). Las ventas sin dolar válido no suman en USD y se avisan (`total.ventas_sin_dolar`).
   Descripción original: **Tarjetas, gráfico y tabla por período seguían en pesos.** Solo el desplegable tiene botón de dólares. Para dolarizarlos hay que
   sumar en SQL venta por venta con su `dolar_blue` (como hace `get_ventas_periodo`: `vendido_usd`, `costo_usd`, `ganancia_usd`).

D. **[HECHO 2026-10-26]** Se quitó la clave `ventas` (500 filas) de `get_dashboard_ventas` (la pantalla no la usaba; el detalle sale de `get_ventas_periodo`). **[CONFIRMADO por el dueño]** el doble scroll se eliminó y el desplegable quedó alineado. Recordatorio: una columna NUEVA de `ventas` necesita `GRANT SELECT (col)` para anon/authenticated
   (y agregarla a `VENTAS_COLUMNAS`). Lint preexistente ajeno a este trabajo. Descripción original: **Limpieza menor.** `get_dashboard_ventas` sigue devolviendo la clave `ventas` (500 filas) que la pantalla ya no usa. Una columna
   NUEVA de `ventas` no es legible desde la web hasta ejecutar `GRANT SELECT (columna) ON public.ventas TO anon, authenticated;`
   (y agregarla a `VENTAS_COLUMNAS` en `VentasHistorial.jsx` si esa pantalla la necesita). No confirmado por el dueño: el arreglo del
   doble scroll (`relative` en el contenedor del dashboard) y la alineación del desplegable. Errores de lint preexistentes ajenos
   a este trabajo (`Icon` y `getCuentaProp` en `VentasHistorial.jsx`, `useRef` en `AdminLayout.jsx`, entre otros).

E. **Cierre total de la tabla `ventas` (tarea grande, aparte).** Con la clave pública, `ventas` todavía se puede leer y también
   modificar o borrar en todas las columnas menos el costo (precios, totales, dólar, método de pago, cuenta, quién registró).
   Cerrarlo rompe ventas para los usuarios de login liviano (`app_users`, sin `auth.uid()`). Plan, inventario y vuelta atrás:
   `problemas/TAREA_CERRAR_ACCESO_PUBLICO_VENTAS.md`.

## Orden sugerido para resolver (actualizado)

1. Confirmar que "Recalcular costos" se apretó (A) y, tras re-ejecutar las dos migraciones, revisar el detalle del banner (B).
2. E (cierre total de `ventas`) como proyecto aparte, cuando el dueño decida el enfoque.

Cerrados: 1, 2 (descartado), 3, 4 (descartado), 5, 7, A (a mano), B, C, D. Descartados por el dueño: d. Sin acción: 6, a (dejar así), b. Commit (c): lo hace el dueño.
