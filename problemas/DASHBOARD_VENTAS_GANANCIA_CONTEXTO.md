# Dashboard de ventas y ganancia (Chart.js): objetivo, datos disponibles y faltantes

> Documento de contexto para una IA que continúe este trabajo. Estado a 2026-10-24.
> El código y los archivos SQL ya están escritos (ver "Estado de la implementación"); las migraciones
> NO se ejecutaron en la base. No escribir en la base sin autorización expresa.
> Nunca mostrar claves del `.env`.

## 1. Objetivo

Agregar al panel admin (`/admin`) un dashboard con:
- Un **gráfico Chart.js** de **vendido vs ganancia** por día (también agrupable por semana o mes).
- **Tablas de resumen** por día y total.
- Ganancia **bruta**: no se descuentan comisiones de medios de pago ni gastos fijos del negocio.

Ideas posteriores ya mencionadas: top 5 productos del mes (por cantidad y por monto) y comparar mes actual vs mes anterior.

### Requisitos de datos

| # | Dato | Unidad | Obligatorio | Ejemplo | Nota |
|---|---|---|---|---|---|
| 1 | Fecha | día/mes/año | Sí | 05/10/2026 | Fecha en que se hizo la venta |
| 2 | Producto | texto | Sí | Remera | Mismo nombre siempre para el mismo producto |
| 3 | Cantidad | docenas | Sí | 2 | Número entero |
| 4 | Precio de venta por docena | $ por docena | Sí | $13.000 | Lo que se cobró realmente, con descuento si hubo |
| 5 | Costo por docena | USD por docena | Sí | USD 72,26 | Costo con prorrateo; se convierte a pesos con el dólar de cada venta |

**En esta app la "unidad" es la DOCENA**: se vende y se costea por docena (`cantidad_docenas`).

**El estado de la venta (pagada, cancelada, pendiente) NO es un requisito.** Decisión del dueño: toda fila de `ventas` es una venta pagada; si se elimina, desaparece de la base y el cuadro se recalcula sin ella. **No se agrega ninguna columna `estado`** y no hay nada que "excluir".

### Cálculos por cada venta
El costo se guarda en USD y el **dólar de cada venta** (`ventas.dolar_blue`, el del momento en que se registró) es el parámetro de conversión. NO se usa el dólar de "Precio Venta Sugerido" (`tanda_settings.cotizacion_dolar`).
```
Vendido (ARS)  = total_ars
Costo (ARS)    = cantidad_docenas × costo_docena_usd × dolar_blue
Ganancia (ARS) = Vendido − Costo
Índice         = Vendido ÷ Costo
Markup %       = Ganancia ÷ Costo × 100
Margen %       = Ganancia ÷ Vendido × 100
```
En USD: Vendido = total_ars ÷ dolar_blue; Costo = cantidad_docenas × costo_docena_usd. Los porcentajes dan igual en ambas monedas porque se usa el mismo dólar.

### Resumen por día y total
- Sumar Vendido, Costo y Ganancia de las ventas del grupo.
- Recalcular Índice, Markup y Margen **con esas sumas**. NUNCA promediar los porcentajes de cada venta.
- Incluir los días sin ventas con montos en 0, y con Índice/Markup/Margen en `null` (no 0).
- Incluir "Cantidad de ventas" = pedidos distintos (`venta_id`), no filas de productos.
- Redondeo solo al final: montos enteros, índice 3 decimales, markup y margen 1 decimal.
- Zona horaria: America/Argentina/Buenos_Aires. Agrupar por `ventas.fecha`, no por `created_at` (UTC).

### Formato de salida esperado (JSON único)
```json
{
  "periodo": { "desde": "AAAA-MM-DD", "hasta": "AAAA-MM-DD", "agrupacion": "dia" },
  "grafico": { "labels": [], "vendido": [], "ganancia": [] },
  "por_dia": [{ "fecha": "", "vendido": 0, "costo": 0, "ganancia": 0, "indice": null, "markup": null, "margen": null, "cantidad_ventas": 0 }],
  "ventas": [{ "id": 0, "fecha": "", "producto": "", "cantidad": 0, "precio_unitario": 0, "costo_unitario": 0, "vendido": 0, "costo": 0, "ganancia": 0, "indice": null, "markup": null, "margen": null }],
  "total": { "vendido": 0, "costo": 0, "ganancia": 0, "indice": null, "markup": null, "margen": null },
  "advertencias": []
}
```
Si una venta no tiene costo guardado: marcarla "sin costo", excluirla del cálculo de ganancia y contarla en `advertencias`. **No inventar un costo.**

## 2. Qué se guarda y qué se calcula

**Se guardan en cada venta solo 6 datos:** fecha, producto, cantidad, total cobrado (`total_ars`), dólar de la venta (`dolar_blue`) y costo por docena en USD (**columna nueva**). Los cinco primeros ya existen.

**Se calcula todo lo demás** al abrir el dashboard: precio por docena (`total_ars ÷ cantidad`), vendido, costo total, ganancia, índice, markup, margen y los totales. No se guardan: si se corrigiera un dato, los valores guardados quedarían desactualizados.

Ejemplo hipotético (boleta 000491, con bultos personalizados), dólar de la venta 1.200:

| Dato | Valor |
|---|---|
| Producto / cantidad | GT0300 / 3 docenas |
| `total_ars` | $ 390.000 (130.000 por docena) |
| Costo por docena guardado | USD 72,26 (68 × (1 + 900 / 14.368)) |
| Costo total | USD 216,78 = $ 260.134 |
| Ganancia | USD 108,22 = $ 129.866 |
| Índice / Markup / Margen | 1,499 / 49,9 % / 33,3 % |

## 3. Stack y convenciones

- React 19 + Vite + Tailwind. **Chart.js NO está instalado** (instalar `chart.js` y `react-chartjs-2`).
- Base: PostgreSQL en Supabase, con `@supabase/supabase-js` directo desde el navegador (sin backend propio). Config en `src/lib/supabase.js`.
- Código nuevo siguiendo la estructura actual: servicio en `src/services/`, página en `src/pages/admin/`, ruta en `src/App.jsx`, permiso en `src/lib/adminSections.js`, `PATH_SECTION_MAP` y menú en `src/components/layout/AdminLayout.jsx`. `src/pages/admin/Dashboard.jsx` hoy es solo una imagen de fondo.
- Migraciones SQL en `supabase/migrations/` (el dueño las ejecuta a mano en el SQL Editor de Supabase).
- Supabase corta las consultas en 1000 filas por defecto: **no sumar ventas en el cliente**; usar RPCs o vistas con agregación en SQL.

## 4. Datos

### YA DISPONIBLES (tabla `ventas`, una fila por producto vendido)

| Requisito | Campo | Comentario |
|---|---|---|
| Fecha | `ventas.fecha` (date) | Armada con la hora local de Argentina al cargar la venta. |
| Producto | `ventas.producto_titulo`, `ventas.codigo` | Copia del producto al vender. |
| Cantidad | `ventas.cantidad_docenas` (numeric) | En docenas. |
| Precio por docena | `ventas.total_ars / cantidad_docenas` | **Usar `total_ars` (lo realmente cobrado; en pago mixto = efectivo + transferencia)**, no `precio_docena_ars` (precio de lista, puede diferir). |
| Vendido | `ventas.total_ars` | Ya incluye descuentos; no hay descuentos ni impuestos como campos aparte. |
| Dólar de la venta | `ventas.dolar_blue` | Medido el 2026-10-24: ninguna de las ventas actuales lo tiene en 0. |
| Agrupar pedido | `ventas.venta_id` (uuid) | Un pedido = varias filas. |
| Vínculo al producto | `ventas.entrada_id` (uuid, FK a `entradas`) | NULL en las ventas anteriores a la migración 20260927; ON DELETE SET NULL. |

Otras columnas de `ventas`: `id`, `precio_docena_ars`, `created_at` (UTC), `nombre_pedido`, `tanda_nombre`, `registrado_por`, `metodo_registro`. Existen también `marca`, `metodo_pago`, `monto_efectivo`, `monto_transferencia`, `cuenta_id`, `cuenta_nombre`, que el código usa pero **no están versionadas** en migraciones (creadas a mano en Supabase; tipos sin confirmar).

Datos de costo en `entradas`: `precio_docena` (USD), `cantidad_docenas`, `gastos` (USD por bulto, repetido en cada fila), `bultos`, `codigo_boleta`, `marca`, `marca_id`, `tanda_nombre`. Los bultos personalizados están en `tandas.parametros.marcasMetadata[marca_id o marca].bultos_personalizados` y se leen con la RPC `get_bultos_personalizados`.

### Cobertura de ventas (medida el 2026-10-24, solo lectura)

| | Ventas | % |
|---|---|---|
| Total | 1.131 | 100 % |
| Con `entrada_id` (se les puede calcular el costo) | 962 | 85,1 % |
| Sin `entrada_id` (quedan sin costo) | 169 | 14,9 % |

### RESUELTO (decisiones tomadas)
- **No hay columna de estado.** Todas las ventas son pagadas; borrar una venta la quita del cuadro.
- **Dólar:** se usa el `dolar_blue` guardado en cada venta, no el de "Precio Venta Sugerido".
- **El costo se guarda en USD por docena** (columna `ventas.costo_docena_usd`) y se convierte a pesos al calcular con el `dolar_blue` de cada venta.
- **Boletas con bultos por fila:** el envío se reparte por los bultos de cada fila (como hoy).
- **Boletas con bultos personalizados:** prorrateo por valor (sección 5). La fórmula anterior tenía un error y ya fue reemplazada en el código.
- **Regla que elige entre los dos casos (DECISIÓN FINAL, 2026-10-26):** se usa el prorrateo SOLO si los bultos personalizados son distintos de cero Y la suma de los bultos de las filas de la boleta es cero. En cualquier otro caso, bultos por fila. Aplica igual al costo guardado en la venta y a Precio Venta Sugerido.
- **Si no se puede calcular el costo con certeza:** la venta se guarda igual, SIN costo (`NULL`), con aviso en pantalla. No se bloquea la venta.
- **"Cantidad de ventas"** = pedidos distintos (`venta_id`), no filas de productos.
- **Quién ve el dashboard:** solo admin (admin de Supabase Auth). Guard en `AdminLayout.jsx` y en la RPC.
- **Alerta del dashboard:** banner parpadeante si hay ventas con `entrada_id` y sin costo; nota gris, sin parpadeo, para las históricas sin `entrada_id`.
- **Vínculo de las ventas:** el `entrada_id` solo se corta si el producto se quita de la tanda (o se borra la tanda). Cambiar el código de un producto lo conserva.
- **Nombres de variables:** `valorTotalCompra` y `gastosTotales` (antes `K` y `L`).

### PENDIENTE / FALTA
1. **Ejecutar las migraciones en Supabase, en este orden** (todas se pueden repetir sin problema):
   1. `20261023_ventas_costo_docena_usd.sql`: crea la columna.
   2. `20261023_get_bultos_personalizados_rpc.sql`: RPC de bultos personalizados (versión nueva: sin permiso devuelve NULL, ignora valores no numéricos).
   3. `20261024_backfill_costo_docena_usd.sql`: crea `calc_costo_docena_usd`. El UPDATE que completa las ventas viejas está **comentado** dentro del archivo: primero la vista previa, backup, y recién después el UPDATE.
   4. `20261024_get_dashboard_ventas_rpc.sql`: RPC del dashboard (solo admin).
2. **Backfill de las ventas viejas** (paso 3 de arriba): las ~962 con `entrada_id` se completan con los datos de HOY; las ~169 sin `entrada_id` quedan en NULL. Hacerlo ANTES de abrir el dashboard, para que el banner no muestre cientos de ventas sin costo.
3. **Probar en la app** (nada se probó contra la base real ni en el navegador): registrar una venta, editar/agregar productos en el historial y abrir el dashboard con un admin.
4. **Alinear Precio Venta Sugerido con la regla final:** HECHO (2026-10-26) en `BrandAccordion.jsx`, `PrecioVentaListado.jsx` y `attachProrrateo`. Pueden cambiar precios sugeridos de boletas con personalizados > 0 y bultos en las filas.
5. **Botón "Recalcular costos"** (2ª etapa): HECHO el 2026-10-26, falta ejecutar la migración 5 (`20261026_recalcular_costos_ventas_rpc.sql`, después de la 3). Está en el banner de ventas sin costo del dashboard: vista previa, confirmación y guardado. RPC `recalcular_costos_ventas(p_aplicar)`, solo admin; solo ventas con `entrada_id` y costo NULL; nunca sobrescribe.
5c. **Dolarizar el detalle** (HECHO 2026-10-26): en el desplegable de cada período hay un botón Pesos / Dólares. En dólares, cada venta se convierte con SU `dolar_blue` (nunca con el de Precio Venta Sugerido): vendido = total_ars ÷ dolar_blue, costo = docenas × costo_docena_usd, ganancia = vendido − costo. También muestra índice y markup por línea. Requiere volver a ejecutar `20261026_get_ventas_periodo_rpc.sql`.
5b. **Desplegable por período** (HECHO 2026-10-26): cada fila de la tabla se abre y muestra lo vendido (pedidos y productos) con subtotal; también se abre con un clic en el gráfico. Usa la RPC `get_ventas_periodo` (`20261026_get_ventas_periodo_rpc.sql`, solo admin, máx. 35 días); falta ejecutarla. Reemplazó al detalle de las 500 ventas más recientes.
5f. **Dolarizar todo el resumen** (HECHO 2026-10-26): botón Pesos / Dólares que afecta tarjetas, gráfico, tabla por período y desplegables, con el `dolar_blue` de cada venta. Requiere re-ejecutar `20261024_get_dashboard_ventas_rpc.sql`.
5e. **Fórmula única** (HECHO 2026-10-26): ver problema 5 de `problemas/PROBLEMAS_PENDIENTES_DASHBOARD_VENTAS.md`. Una sola fuente en JavaScript (`costoDocena.js`), prueba de paridad JS / SQL con `npm run test:paridad`, y aviso "Sin bultos" en las pantallas de precios.
5d. **Costo oculto** (CÓDIGO HECHO 2026-10-27, falta ejecutar `20261027_ventas_ocultar_costo_docena_usd.sql`): `ventas.costo_docena_usd` deja de ser legible con la clave pública y con sesión; solo lo leen las RPC del dashboard (admin). Se puede escribir igual. `VentasHistorial.jsx` ya no usa `select('*')` (usa `VENTAS_COLUMNAS`). Una columna nueva de `ventas` necesita `GRANT SELECT (col)` para anon/authenticated. Vuelta atrás: `GRANT SELECT ON public.ventas TO anon, authenticated;`. La app móvil no se usa y no se tocó.
6. **Cierre del acceso público a `ventas`** (tarea aparte): ver `problemas/TAREA_CERRAR_ACCESO_PUBLICO_VENTAS.md`.
7. **Sin confirmar**: tipos de las columnas creadas a mano en `ventas`; si hay valores no numéricos en `bultos_personalizados` (la RPC ahora los ignora); si `VentasHistorial.jsx` permite editar `fecha`.

## 5. Costo: cómo se calcula

Costo de UNA docena en USD, por boleta (grupo tanda + marca + boleta). Código: `src/utils/costoDocena.js` (misma lógica en SQL: `calc_costo_docena_usd`; si se cambia una, hay que cambiar la otra).
```
Con bultos personalizados (solo si son distintos de cero Y la suma de bultos de las filas de la boleta es cero):
   gastosTotales     = gastos_por_bulto × bultos_personalizados
   valorTotalCompra  = suma(cantidad_docenas × precio_docena) de la boleta
   costo_docena_usd  = precio_docena × (1 + gastosTotales / valorTotalCompra)

Con bultos por fila (en cualquier otro caso):
   costo_docena_usd  = (precio_docena × docenas + gastos × bultos de la fila) / docenas

Sin costo (NULL) si: faltan precio o docenas, la boleta no tiene valor de compra, hay gastos pero
ningún bulto aplicable (saldría sin envío), o no se pudo consultar la RPC de bultos personalizados.
```
Probado con datos reales (tanda PRIMERA TANDA OCTUBRE): boleta 0080893 (bultos por fila): GIF-266506 = 57,50; total 10.596. Boleta 000491 (5 bultos personalizados): GT0300 = 72,26; total 15.268. Con la RPC fallando, 000491 queda sin costo en vez de USD 68.

La fórmula anterior de `BrandAccordion.jsx` (D, E, F, G, H) **sumaba `precio_docena / docenas` de más** (en la boleta 000491 daba USD 15.662 en vez de 15.268). Ya fue reemplazada por el prorrateo y quedó comentada.

Tandas viejas (`old_entradas`): costo = `precio_docena`, sin envío (no interviene en las ventas de `entradas`).

## 6. Estado de la implementación (a 2026-10-24)

Todo lo siguiente está **sin commitear**. Ninguna migración se ejecutó en la base.

**Código**
- `src/utils/costoDocena.js` (nuevo): cálculo puro del costo de una docena.
- `src/utils/pricingUtils.js`: `calcularCostosDocenaUsd(ids)` (lee `entradas`, llama a la RPC de bultos, calcula; devuelve `{ costo, motivo }` por producto), `esErrorColumnaCosto`, y el prorrateo para precios (`attachProrrateo`, `calcPrice`).
- `src/pages/admin/VentasScanner.jsx`: al confirmar la venta calcula y guarda `costo_docena_usd`; si no se puede, guarda la venta sin costo y avisa. Si la columna aún no existe, reintenta sin ese campo y avisa (la venta no se frena).
- `src/pages/admin/VentasHistorial.jsx`: al agregar un producto a un pedido guarda su costo; al cambiar el producto de una venta recalcula el costo (mismo manejo de errores).
- `src/pages/admin/VentasDashboard.jsx` (nuevo): filtros, tarjetas, gráfico Chart.js (vendido y ganancia), tabla por período con total, detalle de ventas y las alertas. `src/services/ventasDashboardService.js` (nuevo) llama a la RPC.
- `src/App.jsx` y `src/components/layout/AdminLayout.jsx`: ruta `/admin/resumen-ventas`, ítem de menú y guard "solo admin".
- `package.json`: `chart.js` y `react-chartjs-2`.
- Precios: `BrandAccordion.jsx`, `PrecioVentaListado.jsx`, `ProductScan.jsx`, `VentasHistorial.jsx` y los buscadores usan el prorrateo en marcas con bultos personalizados.

**SQL (en `supabase/migrations/`, ver orden en Pendiente 1)**
- `20261023_ventas_costo_docena_usd.sql`, `20261023_get_bultos_personalizados_rpc.sql`, `20261024_backfill_costo_docena_usd.sql`, `20261024_get_dashboard_ventas_rpc.sql`.
- Las funciones SQL se probaron en un Postgres en memoria (PGlite) con un esquema mínimo y los datos reales de las boletas 0080893 y 000491: costos, RPC de bultos (NULL sin permiso), backfill, y dashboard (solo admin; totales, índice, markup, margen, días sin ventas, alertas, agrupación día/semana/mes).

**Verificado:** `npm run build` compila. La lógica del costo se probó con datos reales. **No se probó** la app en el navegador ni contra la base real.

## 7. Seguridad (importante)

- Roles: admin de Supabase Auth (`profiles.role = 'admin'`, `profiles.permissions`) y `app_users` (login liviano, sin `auth.uid()`, permisos jsonb validados con `get_app_user_permissions`). El control de rutas actual es de interfaz (`ProtectedRoute` + `can(section)`).
- El dashboard es solo admin, y su RPC (`get_dashboard_ventas`) rechaza a cualquiera que no sea admin de Supabase Auth.
- **Confirmado el 2026-10-24:** la tabla `ventas` se puede leer con la clave pública del front (`using (true)`), incluyendo precios, dólar y quién registró cada venta. Cerrarlo puede romper VentasScanner y VentasHistorial cuando los usan `app_users`: ver `problemas/TAREA_CERRAR_ACCESO_PUBLICO_VENTAS.md`.
- `tandas` y `tanda_settings` devuelven 0 filas con la clave pública (RLS): por eso existe la RPC de bultos personalizados.
- Triggers existentes en `ventas` (`trg_ventas_*`) descuentan, reajustan y devuelven `entradas.cant_docenas_copy`. Un UPDATE que no cambie `cantidad_docenas` ni `entrada_id` no mueve stock. Hacer backup (`backup-db.ps1`) antes de cualquier backfill.

## 8. Orden de trabajo para terminar

1. Hacer backup y ejecutar las migraciones 1 y 2 de Pendiente 1.
2. Verificar la RPC de bultos desde la app (boleta 000491 debe dar 5 bultos).
3. Ejecutar la migración 3 (crea la función), correr la vista previa del backfill, revisar y ejecutar el UPDATE.
4. Ejecutar la migración 4 (RPC del dashboard).
5. Probar: registrar una venta, agregar/editar en el historial, abrir `/admin/resumen-ventas` como admin.
6. Decidir Pendiente 4 (alinear Precio Venta Sugerido) y, si hace falta, el botón de recalcular.
7. Tarea de seguridad aparte (cierre de acceso público a `ventas`).
