# Guía de cálculo de stock: el problema y la solución usada

**Para qué sirve este archivo:** si aparece un problema de stock (números que no coinciden, productos con stock de más o de menos, ventas que "no se descuentan"), pasale este archivo al asistente. Resume el problema que ya se resolvió en Control de Mercancía y en Registrar Ventas, la solución aplicada y cómo repetirla en cualquier otra pantalla.

**Última actualización:** 2026-10-15
**Proyecto:** `ecommerce-web` (React + Vite + Supabase). Idioma de trabajo: español. La persona usuaria estudia bases de datos: explicar qué es cada cosa, no solo el cambio.
**Complementa a:** `PENDIENTES_STOCK_Y_VENTAS_CONTEXTO.md` (lista de pendientes, algunos puntos ahí quedaron desactualizados; este archivo describe el estado más reciente).

---

## 1. Resumen en 5 líneas

1. Cada producto es una fila de `entradas`. Cada venta es una fila de `ventas`.
2. **La forma correcta de saber cuánto se vendió de un producto es sumar las ventas que llevan su `entrada_id`.** Es un vínculo exacto.
3. La forma antigua unía por texto (`codigo + propietario`) y fallaba en muchos casos (sin dueño, dueño cambiado, códigos repetidos).
4. Había además un **doble descuento**: el stock guardado ya tenía las ventas restadas y la pantalla las restaba otra vez.
5. Solución: calcular por `entrada_id`, usar el texto solo como respaldo para ventas viejas sin vínculo, y no restar dos veces.

---

## 2. Modelo de datos (solo lo relevante)

### `entradas` (una fila = un producto de una tanda)
| Columna | Qué es |
|---|---|
| `id` (uuid) | Identificador único de **esa fila**. Nunca se repite, ni entre productos con el mismo código |
| `tanda_nombre` | Nombre de la tanda (texto; no hay FK a la tabla `tandas`) |
| `marca_id` | Agrupa los productos de una marca/boleta dentro de una tanda. **Se repite a propósito**, no distingue productos |
| `codigo` | Código del producto. **No es único**: puede repetirse (incluso en la misma tanda con dueños distintos) |
| `propietario` | Dueño de la marca/boleta (puede estar vacío) |
| `propietario_producto` | Dueño del producto (pisa a `propietario`; puede estar vacío) |
| `cantidad_docenas` | Stock **original** cargado en la boleta. Solo cambia si se edita la tanda. **Las ventas no lo modifican** |
| `cant_docenas_copy` | Stock **actual**. Lo baja el trigger de ventas, el escáner QR (ProductScan) y se pisa al editar la tanda |

### `ventas` (una fila = un ítem vendido)
`id` (propio de la venta, autoincremental), `venta_id`, `codigo`, `tanda_nombre`, `marca`, `producto_titulo`, `propietario` (copia del dueño **al vender**; `'Sin propietario'` si no había), `cantidad_docenas`, `precio_docena_ars`, `total_ars`, y **`entrada_id`** (uuid, FK a `entradas.id`, `ON DELETE SET NULL`, puede ser NULL).

> `ventas.id` es el número de la venta. `ventas.entrada_id` es el `id` del **producto**. No confundirlos.

### Triggers sobre `ventas` (migración `supabase/migrations/20260927_ventas_descuenta_cant_docenas_copy.sql`)
| Trigger | Cuándo | Efecto |
|---|---|---|
| `trg_ventas_descuenta_stock` | INSERT | `cant_docenas_copy -= cantidad` (solo si `entrada_id` no es NULL) |
| `trg_ventas_reajusta_stock` | UPDATE | Ajusta la diferencia. **Si `entrada_id` pasa de NULL a un valor, descuenta la cantidad** |
| `trg_ventas_devuelve_stock` | DELETE | `cant_docenas_copy += cantidad` |
| (otra migración) | UPDATE de `cant_docenas_copy` | Copia el valor a `catalog_products.stock` (tienda pública) |

Las ventas con `entrada_id` NULL son ignoradas por los triggers.

---

## 3. El problema

### 3.1 Cálculo por texto (clave frágil)
Las pantallas calculaban lo vendido sumando ventas con una clave de texto:

```
clave = codigo + "_" + propietario   (a veces + "_" + tanda_nombre)
```

Falla porque el texto debe ser **idéntico** en `entradas` y en `ventas`:

| Caso | Producto (`entradas`) | Venta (`ventas`) | Resultado |
|---|---|---|---|
| Sin propietario | vacío → `R-8_` | `'Sin propietario'` → `R-8_Sin propietario` | No coincide, `vendido = 0` |
| Espacio de más | `Juan` (con `trim`) | `'Juan '` | No coincide |
| Dueño cambiado después de vender | `María` | `Juan` | No coincide |
| Código repetido, mismo dueño | `R-8_Juan` ×2 | `R-8_Juan` | Cada producto suma **toda** la venta |

Además, en Registrar Ventas la consulta de ventas **ni se ejecutaba** si el producto no tenía propietario: `vendido` quedaba fijo en 0.

### 3.2 Doble descuento
Desde que existe el trigger, `cant_docenas_copy` ya tiene las ventas restadas. Control de Mercancía calculaba `disponible = cant_docenas_copy − SUM(ventas)`, restando cada venta **dos veces**.

Ejemplo: cargado 10, se vende 3 → `copy = 7`, y la pantalla mostraba `7 − 3 = 4` (debía ser 7). Era un error solo visual: la base estaba bien (una fila en `ventas`, `copy` bajó una vez).

### 3.3 Ventas viejas sin `entrada_id`
`entrada_id` se agregó el 2026-09-27. Las ventas anteriores (junio a septiembre) no tenían dónde guardarlo, y esos descuentos nunca se restaron de `cant_docenas_copy`. Resultado: stock de más, avisos de descuadre, y riesgo de desajustes al borrar/editar esas ventas.

### 3.4 Cómo desarmaba el stock general
| Síntoma | Causa |
|---|---|
| La caja muestra "24 de 24 disponibles" aunque ya se vendieron 9 | Cálculo por texto fallando (`vendido = 0`) |
| La validación de "vender de más" no frena | Parte de un `vendido` falso |
| `cant_docenas_copy` queda negativo | Se vendió más de lo disponible, sin freno |
| Control muestra menos disponible del real | Doble descuento |
| El catálogo público muestra más stock del real | Ventas viejas sin descontar de `cant_docenas_copy` |
| Dos pantallas muestran distinto stock del mismo producto | Una usa `cant_docenas_copy`, otra `cantidad_docenas − ventas` |

---

### 3.5 El selector de tandas (el mismo código en varias tandas)

**Qué es:** la ventana **"Seleccioná la tanda"** de Registrar Ventas (`/admin/ventas`). Aparece cuando un código existe en **más de una tanda con el mismo dueño** (al escanear por código, al elegir un resultado agrupado de la búsqueda manual o después de elegir un dueño). Muestra una fila por tanda con su stock (`X / Y disp.`) y deshabilita la fila con "Sin stock" si el cálculo da 0.

**Problema:** el stock de cada fila se calculaba en `openTandaPicker` (`VentasScanner.jsx`) con **otra consulta por texto**, distinta a la del resto de la pantalla: ventas con `codigo = X` y `propietario = <dueño>` y la tanda dentro de las de la lista, sumadas por **`tanda_nombre`**.

- Para un producto **sin dueño**, el dueño buscado era `null`, que como texto no coincide con `'Sin propietario'` (lo que guardan las ventas). No encontraba ninguna venta: `vendido = 0` y la ventana mostraba **todo el stock disponible** en todas las tandas.
- Con dueño funcionaba, pero con las mismas fragilidades de la clave de texto (3.1) y agrupando por el nombre de la tanda en vez de por producto.
- Efecto: stock inflado en la ventana, y un "Sin stock" que podía bloquear (o dejar pasar) una tanda por un dato falso. Después de elegir la tanda la pantalla recalculaba bien (por `entrada_id`), pero la ventana de elección ya había mostrado el número equivocado.

**Ejemplo real: `R622`** (sin dueño, existe en dos tandas de julio):

| Tanda | Cargado | Ventas reales | La ventana mostraba (antes) | Debe mostrar |
|---|---|---|---|---|
| Primera tanda JULIO | 10 | 0 | 10 / 10 | 10 / 10 |
| SEGUNDA TANDA JULIO | 10 | 3 | **10 / 10** ✗ | **7 / 10** ✓ |

(Se reprodujo la consulta equivalente contra la base: encontraba 0 ventas para ese código con dueño `null`.)

### 3.6 Los otros listados mezclaban "valor de la boleta" con "stock actual"

**Qué pasaba:** tres pantallas llamaban **"Doc. Control"** a la suma de `cant_docenas_copy` (el **stock actual**, que baja con cada venta), mientras que el detalle de la tanda en Control de Mercancía (`ControlMercanciaTanda.jsx`, corregido en 4.3) mostraba la cantidad **cargada** según la boleta (`cantidad_docenas`, que no baja). **La misma tanda mostraba dos números distintos con el mismo nombre.**

| Pantalla | Archivo | Qué sumaba |
|---|---|---|
| Control de Mercancía, **listado** de tandas | `src/pages/admin/ControlMercancia.jsx` | `cant_docenas_copy` |
| Boletas cargadas, **listado** | `src/pages/admin/BoletasCargadas.jsx` | `cant_docenas_copy` |
| Boletas, **detalle** de la tanda (por marca, "Crear producto") | `src/pages/admin/BoletasTanda.jsx` | `cant_docenas_copy` para docenas y para el **Total** (`docenas × precio`) |

**Ejemplo real: PRIMERA TANDA OCTUBRE** (27 productos):

| | Docenas | Valor (docenas × precio) |
|---|---|---|
| **Cargado** (`cantidad_docenas`, lo que dice la boleta) | **810** | **36.440** |
| **Stock actual** (`cant_docenas_copy`) | **669** | **32.110** |
| Diferencia (vendido) | 141 | 4.330 |

- El detalle de Control de Mercancía mostraba **810**; los listados mostraban **669**, ambos como "Doc. Control".
- En una marca más chica, **HUIBANG**: 108 cargadas, 9 vendidas → el detalle mostraba 108 y el listado/boletas 99.
- El **Total** del detalle de la boleta (`docenas × precio`) **bajaba con cada venta** (32.110 en vez de 36.440), así que dejaba de coincidir con la boleta de papel del proveedor.

**Decisión de la persona usuaria:** "Doc. Control" y el Total deben ser el **valor de la boleta** (fijo), y el **stock actual** debe mostrarse como un **dato aparte**.

### 3.7 Cambiar el código de un producto: las ventas viejas conservan el código anterior

**Qué pasa:** cada venta guarda una **copia del código** del producto en `ventas.codigo`. Si se cambia el código de un producto desde la edición de tanda (por ejemplo `GT8008` → `GT80088`):

- **El stock y el vínculo no se rompen.** Desde que `AgregarTanda` empareja los productos por `entrada_id` (ver `GUIA_VALIDACION_STOCK_EDITAR_ITEM_CARRITO.md`, sección 8), el producto se actualiza **en la misma fila** (mismo `id`), y las ventas siguen vinculadas por `entrada_id`. El QR impreso tampoco se rompe (usa el `id`).
- **Pero las ventas viejas siguen diciendo `GT8008`.** Las pantallas que agrupan por código (por ejemplo **Entrega de dinero**, que agrupa por `ventas.codigo`) muestran el mismo producto en **dos líneas**: `GT8008` (ventas viejas) y `GT80088` (ventas nuevas). Es un problema de reportes, no de stock.

Dato real al implementar la solución: de 936 ventas vinculadas, **1** tenía un código distinto al de su producto (`123456` en la venta, `1234567` en el producto, PRIMERA TANDA OCTUBRE).

**Aclaración:** quitar un producto del formulario sí borra su fila y desvincula sus ventas (`ON DELETE SET NULL`); cambiar solo el código **no** lo hace. En la operación de la persona usuaria no se eliminan códigos: solo se cambian.

## 4. La solución

### 4.1 Principio
**El stock disponible de un producto se calcula sumando las ventas por `entrada_id` y restándolas de `cantidad_docenas`. `cantidad_docenas` nunca se modifica por ventas.**

```
vendido    = SUM(ventas.cantidad_docenas WHERE ventas.entrada_id = entradas.id)
disponible = max(0, entradas.cantidad_docenas − vendido)
```

Esto es solo una **lectura**: se calcula en pantalla y no escribe en la base. No depende del propietario, ni del código, ni de que el producto esté repetido.

### 4.2 Jerarquía de claves (de más a menos exacta)
| Orden | Clave | Cuándo se usa |
|---|---|---|
| 1 | **`entrada_id`** | Siempre que la venta lo tenga |
| 2 | `tanda + código + propietario` | Solo para ventas **sin** `entrada_id` y **solo si** ese trío identifica a un único producto |
| 3 | Ambigua → no se asigna | Si dos productos comparten el trío (ej. `T91780`, dos productos de Luis) |

En el respaldo, `'Sin propietario'` se trata como vacío (`normalizeOwner`) y el propietario del producto sale de `propietario_producto`, y si está vacío, de `propietario`.

El propietario sirve de desempate en el respaldo: por ejemplo `T7512` (tanda "TERCERA TANDA JULIO") tiene dos productos, Gabriel y Luis, y la venta dice quién fue.

### 4.3 Dónde está aplicado
| Pantalla | Archivo | Qué cambió |
|---|---|---|
| **Control de Mercancía** (detalle de tanda) | `src/pages/admin/ControlMercanciaTanda.jsx` | `calcStock(prod, soldMap)`; `soldMap = { byId, byText, keyCounts }`. Doc. Control = `cantidad_docenas`; `vend.` por `entrada_id` con respaldo; `disp. = cantidad_docenas − vend.` (≥ 0); etiqueta "Sobrevendido"; aviso "Ventas ambiguas"; **aviso "Descuadre"** si `cantidad_docenas − vend.` ≠ `cant_docenas_copy`. Los subtotales de esa pantalla usan `cantidad_docenas` |
| **Registrar Ventas** (búsqueda manual, producto elegido, escáner por código, carrito, **selector de tandas**) | `src/pages/admin/VentasScanner.jsx` | Usa el módulo compartido **`src/lib/stockVentas.js`** (`normalizeOwner`, `ownerKeyOf`, `calcSold(entrada, ventas, hermanos)`, `fetchSoldForEntrada(entrada)`, `fetchSoldForEntradas(entradas)`); `searchProducts`, `selectEntrada` y `openTandaPicker` las usan. El conteo del carrito filtra por `item.entrada_id === selectedEntrada.id` |
| **Historial de ventas** (editar / agregar una venta) | `src/pages/admin/VentasHistorial.jsx` | Usa el mismo módulo (`fetchEntradaStock`) para validar el stock antes de guardar (ver `GUIA_VALIDACION_STOCK_EDITAR_ITEM_CARRITO.md`, sección 9) |

Patrón de `calcSold` (copiar tal cual en otras pantallas):

```js
const normalizeOwner = (name) => { const n = (name || '').trim(); return n === 'Sin propietario' ? '' : n; };
const ownerKeyOf = (e) => normalizeOwner(e.propietario_producto) || normalizeOwner(e.propietario);

// ventas: filas candidatas; hermanos: entradas de la misma tanda y código (detectan ambigüedad)
const calcSold = (entrada, ventas, hermanos) => {
    const key = ownerKeyOf(entrada);
    const rivales = hermanos.filter(s =>
        s.tanda_nombre === entrada.tanda_nombre && s.codigo === entrada.codigo && ownerKeyOf(s) === key
    ).length;
    let sold = 0;
    for (const v of ventas) {
        const cant = Number(v.cantidad_docenas) || 0;
        if (v.entrada_id) { if (v.entrada_id === entrada.id) sold += cant; }
        else if (rivales <= 1 && v.codigo === entrada.codigo
                 && (v.tanda_nombre || '') === (entrada.tanda_nombre || '')
                 && normalizeOwner(v.propietario) === key) sold += cant;
    }
    return sold;
};
```

Consultas necesarias (tres, con `Promise.all`): ventas con `entrada_id` igual al/los id de los productos; ventas con `entrada_id IS NULL` y el/los códigos; entradas con el mismo código (tanda). Evitar `.or()` con códigos (pueden tener caracteres especiales).

### 4.4 Solución del selector de tandas (`openTandaPicker`)

Se reemplazó la consulta por texto por **el mismo cálculo por `entrada_id`** del resto de la pantalla. Cada fila de la ventana es un producto distinto (una tanda distinta), así que su vendido se calcula con su propio `id`.

**Cambios:**
1. **`src/lib/stockVentas.js`:** función nueva `fetchSoldForEntradas(entradas)`. Para una lista de productos hace las tres consultas de siempre (ventas por `entrada_id`; ventas sin `entrada_id` por código; "hermanos" por código) y devuelve un mapa `{ [entrada.id]: vendido }` aplicando `calcSold`. Lanza error si no puede consultar.
2. **`VentasScanner.jsx`, `openTandaPicker(entries)`:** llama a `fetchSoldForEntradas(entries)` y guarda el resultado en `tandaSoldMap`. Si falla, muestra "No se pudo calcular el stock de cada tanda" y deja el mapa vacío.
3. **`VentasScanner.jsx`, ventana "Seleccioná la tanda":** `tandaSoldMap` ahora se indexa por **`entrada.id`** (antes por `tanda_nombre`): `const sold = tandaSoldMap[entrada.id] ?? 0`.

**Variables:**

| Antes | Ahora |
|---|---|
| `propietarioKey = getPropietario(entries[0]) ?? null` (dueño del primer producto; `null` si no hay) | Ya no se usa: el cálculo no depende del dueño |
| `soldByTanda[tanda_nombre]` (suma por nombre de tanda) | `tandaSoldMap[entrada.id]` (vendido por producto) |
| Consulta `ventas` con `.eq('codigo')`, `.eq('propietario', propietarioKey)`, `.in('tanda_nombre', …)` | `fetchSoldForEntradas(entries)` (por `entrada_id`, con respaldo para ventas sin vínculo) |
| `useCallback(..., [getPropietario])` | `useCallback(..., [])` |

**Resultado esperado** (datos reales de la base):

| Código | Primera tanda JULIO | SEGUNDA TANDA JULIO |
|---|---|---|
| `R622` | 10 / 10 disp. | **7 / 10 disp.** |
| `R626` | 20 / 20 disp. | **15 / 20 disp.** |
| `JXW-9672` | 36 / 36 disp. | **35 / 36 disp.** |

En los tres casos el número coincide con el stock guardado (`cant_docenas_copy`).

**Cómo probarlo:** en Registrar Ventas, buscar o escanear `R622` (o `R626`, `JXW-9672`): debe abrirse "Seleccioná la tanda" con esos números. Elegir una tanda y comprobar que el cartel de stock del producto muestra el mismo disponible que tenía la fila. Repetir con un código repetido **con dueño** para confirmar que sigue funcionando.

**Estado:** aplicado y compila. La lógica se comprobó contra la base con una réplica del cálculo. **No probado todavía en el navegador.**

### 4.5 Solución de los otros listados: "Doc. Control" = boleta, "Stock actual" aparte

**Regla:** en las pantallas de boletas y control, **"Doc. Control" y el Total salen de `cantidad_docenas`** (valor de la boleta, no baja con ventas), y el **"Stock actual" sale de `cant_docenas_copy`** y se muestra como **dato separado** (en verde, para distinguirlo).

**Cambios:**

| Archivo | Cambio |
|---|---|
| `ControlMercancia.jsx` (listado) | El `select` ahora trae `cantidad_docenas`. `groupTandas` suma dos totales por tanda. La tarjeta muestra "Doc. Control" (cargado) y una fila nueva **"Stock actual"** debajo |
| `BoletasCargadas.jsx` (listado) | Idéntico: `select` con `cantidad_docenas`, dos totales por tanda, fila nueva "Stock actual" |
| `BoletasTanda.jsx` (detalle) | `BrandSectionCatalog`: "doc. control" y **Total = `cantidad_docenas × precio`**; badge nuevo verde **"N en stock"** en el encabezado de cada marca; **columna nueva "Stock actual"** en la tabla de productos |

**Variables:**

| Antes | Ahora | Qué es |
|---|---|---|
| `totalDocenasCopy` (suma de `cant_docenas_copy`) en los 3 archivos | **`totalDocenas`** | Suma de `cantidad_docenas`: Doc. Control, valor de la boleta |
| — (no existía) | **`totalStockActual`** | Suma de `cant_docenas_copy` (si es `null`, se toma `cantidad_docenas`): stock actual |
| `docenasCopy` por producto (`BoletasTanda`) | **`docenas`** (= `cantidad_docenas`) y **`stockActual`** (= `cant_docenas_copy ?? cantidad_docenas`) | Valor de la boleta y stock actual de cada producto |
| `totalMoney` = `cant_docenas_copy × precio` | `totalMoney` = **`cantidad_docenas × precio`** | Total de la boleta, ya no baja con las ventas |

**Resultado esperado** (PRIMERA TANDA OCTUBRE):

| Pantalla | Doc. Control | Stock actual | Total (valor) |
|---|---|---|---|
| Control de Mercancía, listado | **810** | **669** | — |
| Boletas cargadas, listado | **810** | **669** | — |
| Boletas, detalle (suma de las marcas) | 810 | 669 | **36.440** (antes 32.110) |
| Boletas, detalle, marca HUIBANG | 108 doc. control | 99 en stock | según `cantidad_docenas × precio` |
| Control de Mercancía, detalle (ya corregido) | 810 | — (por producto: disponible) | 36.440 |

Ahora las cuatro pantallas coinciden en "Doc. Control" y el Total, y el stock actual se ve aparte.

**Cómo probarlo:**
1. Abrir el listado de Control de Mercancía y el de Boletas cargadas: la tarjeta de PRIMERA TANDA OCTUBRE debe decir Doc. Control **810** y Stock actual **669** (los números cambian con las ventas que se hagan después; lo que no debe cambiar al vender es Doc. Control).
2. Abrir el detalle de la boleta (Boletas, "Crear producto"): cada marca debe mostrar "N doc. control" y "N en stock", y la tabla la columna "Stock actual".
3. Registrar una venta de 1 docena de un producto de esa tanda y recargar: el **Stock actual** baja 1, **Doc. Control y Total no cambian**.

**Qué no cambia:** `CatalogProductForm.jsx` sigue usando `cant_docenas_copy` como stock al publicar un producto en el catálogo (es stock real, no valor de boleta).

**Estado:** aplicado y compila. **No probado todavía en el navegador.**

### 4.6 Solución al cambio de código: un trigger que sincroniza `ventas.codigo`

**Archivo:** `supabase/migrations/20261016_sync_codigo_ventas.sql` (se ejecuta **una sola vez** en el editor SQL de Supabase; después trabaja solo).

**Qué hace:**
1. **Función `sync_codigo_ventas()`** y **trigger `trg_entradas_sync_codigo_ventas`** (`AFTER UPDATE OF codigo ON entradas`, solo cuando el código cambió): actualiza `ventas.codigo` de **todas las ventas con `entrada_id` igual al `id` del producto**.
2. **Corrección única** de las ventas que ya tenían un código distinto al de su producto (cambiados antes de crear el trigger).

```sql
AFTER UPDATE OF codigo ON entradas
→ UPDATE ventas SET codigo = NEW.codigo WHERE entrada_id = NEW.id
```

**Por qué un trigger en la base y no código en la pantalla:**
- **Atómico**: el cambio del producto y el de sus ventas ocurren juntos, o ninguno.
- **Funciona desde cualquier lado**: `AgregarTanda`, el editor SQL, otros scripts.
- **Sin pasos extra**: al guardar la tanda con un código cambiado, las ventas se actualizan solas. Guardar sin cambiar códigos no dispara nada.

**Qué no hace:**
- **No toca el stock**: el trigger `trg_ventas_reajusta_stock` solo actúa si cambia la cantidad o el `entrada_id` de la venta, no el código.
- **No alcanza a las ventas sin `entrada_id`** (las 169 viejas sin vincular): no hay forma segura de saber a qué producto pertenecen.
- **Solo sincroniza el código.** Título, marca y tanda de las ventas no cambian.
- Si el producto queda con código vacío, no se toca ninguna venta (`ventas.codigo` no admite vacío).

**Variables:**

| Elemento | Qué es |
|---|---|
| `OLD.codigo` / `NEW.codigo` | Código del producto antes y después del cambio |
| `NEW.id` | `id` del producto (el mismo que está en `ventas.entrada_id`) |
| `ventas.codigo` | Copia del código en cada venta: lo que se sincroniza |

**Resultado esperado** (cambiar `GT8008` → `GT80088` y guardar la tanda): las 3 ventas de ese producto pasan a decir `GT80088`; Entrega de dinero y el Historial muestran una sola línea; el stock no cambia.

**Cómo probarlo:**
1. Ejecutar la migración y la consulta de verificación del final del archivo (debe dar 0 filas).
2. Con un producto de prueba que tenga ventas, cambiar su código en "Editar tanda" y guardar.
3. En el Historial de ventas (o con `SELECT codigo FROM ventas WHERE entrada_id = '<id>'`), comprobar que las ventas muestran el código nuevo y que el stock del producto es el mismo.

**Para quitarlo:** `DROP TRIGGER trg_entradas_sync_codigo_ventas ON public.entradas;` y `DROP FUNCTION public.sync_codigo_ventas();`

**Estado:** **migración ejecutada y probada por la persona usuaria: funciona.** Verificado por lectura: **0 ventas vinculadas con un código distinto al de su producto** (la venta desfasada `123456` → `1234567` ya fue corregida).

### 4.7 Qué NO se cambió todavía
- La app `ecommerce-mobile` no manda `entrada_id`.
- `ecommerce-men` (`ControlInventarioTandas.jsx`) suma `cant_docenas_copy` con la lógica antigua. Es **otro proyecto con otra base de Supabase** y no usa `ventas`: no afecta los datos de `ecommerce-web`.

---

## 5. Migración de datos históricos (lo que se hizo en la base)

Se ejecutó a mano en el editor SQL de Supabase, **en dos pasos**, con respaldo:

**Paso 1: vincular ventas viejas** (trigger de ajuste apagado para no tocar el stock):

```sql
BEGIN;
CREATE TABLE backup_vinculo_ventas AS
  SELECT v.id AS venta_id, e.id AS entrada_id, v.cantidad_docenas
  FROM ventas v JOIN entradas e
    ON e.tanda_nombre = v.tanda_nombre AND e.codigo = v.codigo
  WHERE v.entrada_id IS NULL
    AND (SELECT COUNT(*) FROM entradas e2
         WHERE e2.tanda_nombre = e.tanda_nombre AND e2.codigo = e.codigo) = 1;
ALTER TABLE ventas DISABLE TRIGGER trg_ventas_reajusta_stock;
UPDATE ventas v SET entrada_id = b.entrada_id
  FROM backup_vinculo_ventas b WHERE v.id = b.venta_id;
ALTER TABLE ventas ENABLE TRIGGER trg_ventas_reajusta_stock;
COMMIT;
```

**Paso 2: corregir `cant_docenas_copy`** restando exactamente lo vinculado (con guarda para no correrlo dos veces):

```sql
BEGIN;
UPDATE entradas e
SET cant_docenas_copy = COALESCE(e.cant_docenas_copy, 0) - s.total
FROM (SELECT entrada_id, SUM(cantidad_docenas) AS total
      FROM backup_vinculo_ventas GROUP BY entrada_id) s
WHERE e.id = s.entrada_id
  AND e.cant_docenas_copy = e.cantidad_docenas - (
        SELECT COALESCE(SUM(v.cantidad_docenas), 0) FROM ventas v
        WHERE v.entrada_id = e.id AND v.id NOT IN (SELECT venta_id FROM backup_vinculo_ventas));
COMMIT;
```

**Resultado (verificado 2026-10-14):** 860 ventas vinculadas, 159 productos corregidos (980 docenas restadas). Los 173 productos con ventas coinciden con `cantidad_docenas − ventas`. Para deshacer el vínculo: `UPDATE ventas SET entrada_id = NULL WHERE id IN (SELECT venta_id FROM backup_vinculo_ventas);`.

**Quedan 169 ventas sin `entrada_id`** (fechas 06/06 a 12/09): 113 ambiguas (tanda + código con 2+ productos), 11 sin producto coincidente, 45 sin `tanda_nombre` (08/06 al 10/06). Ninguna venta posterior al 29/09 quedó sin vínculo. Las 113 ambiguas probablemente se resuelvan con el nivel tanda + código + propietario (no aplicado).

La tabla `backup_vinculo_ventas` sigue en la base: decidir si se borra o se protege con RLS (las tablas nuevas de `public` pueden quedar legibles con la clave pública).

---

## 6. Cómo diagnosticar un problema de stock

### 6.1 Árbol de decisión
1. ¿Lo vendido da 0 aunque hay ventas? → mirar si el cálculo usa texto (`codigo + propietario`) o si depende del propietario.
2. ¿El disponible baja de más (doble)? → mirar si resta ventas a `cant_docenas_copy`.
3. ¿El stock del catálogo difiere del de Control? → `cant_docenas_copy` vs `cantidad_docenas − ventas`: probable venta sin `entrada_id` o uso del escáner QR.
4. ¿Una venta no baja el stock? → ¿tiene `entrada_id`? ¿Está habilitado el trigger?
5. ¿Un producto con código repetido mezcla ventas? → ¿se une por `entrada_id`?

### 6.2 Consultas útiles (solo lectura)

Ventas sin vínculo:
```sql
SELECT COUNT(*) FROM ventas WHERE entrada_id IS NULL;
```

Triggers habilitados (`tgenabled = 'O'` es habilitado, `'D'` apagado):
```sql
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgrelid = 'ventas'::regclass AND NOT tgisinternal;
```

Consistencia entre stock y ventas (debe dar 0 filas; no aplica a productos donde se usó el escáner QR):
```sql
SELECT e.id, e.tanda_nombre, e.codigo, e.cantidad_docenas, e.cant_docenas_copy,
       e.cantidad_docenas - SUM(v.cantidad_docenas) AS esperado
FROM entradas e JOIN ventas v ON v.entrada_id = e.id
GROUP BY e.id
HAVING e.cant_docenas_copy IS DISTINCT FROM e.cantidad_docenas - SUM(v.cantidad_docenas);
```

Productos con stock negativo:
```sql
SELECT tanda_nombre, codigo, cant_docenas_copy FROM entradas WHERE cant_docenas_copy < 0;
```
(Conocido: `T91782` de "Segunda tanda JUNIO" está en −1; se vendió 1 docena más de las 10 cargadas.)

Productos con el mismo código en la misma tanda:
```sql
SELECT tanda_nombre, codigo, COUNT(*) FROM entradas GROUP BY 1, 2 HAVING COUNT(*) > 1;
```
(12 casos en la base. Se distinguen por `id`, y casi siempre solo por el propietario.)

---

## 7. Receta para aplicar la solución a otra pantalla

1. **Traer el `id` del producto** (`entradas.id`) junto con `cantidad_docenas`, `codigo`, `tanda_nombre`, `propietario`, `propietario_producto`.
2. **Traer las ventas** (`entrada_id`, `codigo`, `tanda_nombre`, `propietario`, `cantidad_docenas`) con `entrada_id` en los ids de esos productos, y las que tienen `entrada_id IS NULL` para esos códigos.
3. **Traer los "hermanos"** (entradas con el mismo código) para detectar ambigüedad.
4. **Calcular con `calcSold`** (o `calcStock` en Control; para varios productos a la vez, `fetchSoldForEntradas`; para uno por su id, `fetchEntradaStock`; todas en `src/lib/stockVentas.js`) y mostrar `max(0, cantidad_docenas − vendido)`.
5. **No restar ventas a `cant_docenas_copy`** (ya las tiene restadas) y **no escribir `cantidad_docenas`** desde las ventas.
6. Si la pantalla muestra **valor de boleta** (dinero total de la mercancía), usar `cantidad_docenas`. Si muestra **stock operativo** (lo que se puede vender hoy), usar `disponible` calculado. No mezclar.
7. Al registrar ventas nuevas, **guardar siempre `entrada_id: selectedEntrada.id`** (la web ya lo hace).
8. Probar con un producto real: sin dueño, con dueño, y con código repetido (ej. `T7512`, `99012`, `T91776`).

### Casos de prueba reales (base al 2026-10-15)
| Producto | Cargado | Vendido | Disponible | Nota |
|---|---|---|---|---|
| `GT8008` (PRIMERA TANDA OCTUBRE, sin dueño) | 24 | 9 | **15** | Antes la caja mostraba 24 |
| `R-7` (HUIBANG, misma tanda, sin dueño) | 24 | 3 | **21** | |
| `GIF-261003` (Segunda tanda JUNIO, Rosa) | 20 | 8 | **12** | Con dueño; funciona |
| `0504` (PRIMERA TANDA SEPTIEMBRE) | 24 | 6 | **18** | 3 ventas viejas vinculadas en la migración |
| `99012` Gabriel / Luis (TERCERA TANDA JULIO) | 12 / 12 | 5 / 1 | **7 / 11** | Repetido; se desempata por dueño |
| `T7512` Gabriel / Luis (TERCERA TANDA JULIO) | 16 / 16 | 3 / 1 | **13 / 15** | Repetido; ventas sin `entrada_id` |
| `R622` (sin dueño; Primera tanda JULIO / SEGUNDA TANDA JULIO) | 10 / 10 | 0 / 3 | **10 / 7** | Para el selector de tandas (sección 3.5 y 4.4) |
| `R626` (sin dueño; mismas tandas) | 20 / 20 | 0 / 5 | **20 / 15** | Ídem |
| `JXW-9672` (sin dueño; mismas tandas) | 36 / 36 | 0 / 1 | **36 / 35** | Ídem |

---

## 8. Reglas para que el problema no vuelva

1. **Toda venta nueva debe llevar `entrada_id`** (web: sí; app móvil: no todavía).
2. **No borrar productos que tengan ventas.** Por `ON DELETE SET NULL` la venta pierde el vínculo. `AgregarTanda` borra los productos que se quitan de una tanda. Mejor bloquearlo o usar borrado lógico.
3. **Renombrar una tanda no actualiza `ventas.tanda_nombre`**: rompe el respaldo por texto de las ventas sin `entrada_id`.
4. **Cambiar el propietario de un producto no actualiza `ventas.propietario`.** Las ventas conservan el dueño con el que se vendieron. Eso desordena Entrega de dinero, Historial y Cuentas bancarias, que agrupan por `ventas.propietario`. El stock no se rompe.
5. **Editar la cantidad de una tanda (`AgregarTanda`)** antes hacía `cant_docenas_copy = cantidad nueva` y perdía lo descontado por ventas. **Ya está corregido**: ahora aplica solo la diferencia (ver `GUIA_VALIDACION_STOCK_EDITAR_ITEM_CARRITO.md`, sección 8).
6. **Si se vinculan ventas viejas:** apagar `trg_ventas_reajusta_stock` mientras se vinculan, porque el cambio de `entrada_id` NULL → valor descuenta stock. Corregir el stock de forma deliberada (paso 2 de la sección 5), con backup.
7. **El stock negativo ya está controlado** (ver `GUIA_VALIDACION_STOCK_EDITAR_ITEM_CARRITO.md`): hay validación en pantalla al agregar al carrito, editar el ítem, confirmar y editar ventas en el historial, y la base rechaza el negativo con la restricción `chk_stock_no_negativo`. **Toda función nueva que cree o modifique ventas debe validar el stock.**
8. **Todo cálculo de stock por texto es un riesgo.** Si una pantalla nueva (o una existente) calcula lo vendido con `codigo + propietario` o por `tanda_nombre`, usar `calcSold`/`fetchSoldForEntradas` de `src/lib/stockVentas.js` en su lugar.
9. **Las ventas guardan copias de datos del producto** (`codigo`, `producto_titulo`, `marca`, `tanda_nombre`, `propietario`). Cuando uno de esos datos cambia en `entradas`, la copia en las ventas queda vieja salvo que haya un mecanismo que la sincronice: para el **código** existe el trigger `trg_entradas_sync_codigo_ventas` (sección 4.6); para el **propietario**, la pantalla "Asignar propietario" (`GUIA_ASIGNAR_PROPIETARIO_PROBLEMA_Y_SOLUCION.md`). Título, marca y tanda no se sincronizan.

---

## 9. Mapa de qué usa cada pantalla (referencia rápida)

| Pantalla | Fuente de stock | Estado |
|---|---|---|
| Control de Mercancía (detalle) | `cantidad_docenas − ventas` por `entrada_id` | **Corregido** |
| Registrar Ventas (búsqueda manual, producto elegido, escáner) | `cantidad_docenas − ventas` por `entrada_id` | **Corregido** |
| Registrar Ventas (selector de tandas) | `cantidad_docenas − ventas` por `entrada_id` (`fetchSoldForEntradas`) | **Corregido** (falta probarlo en el navegador) |
| Historial de ventas (editar / agregar) | Valida con `fetchEntradaStock` (por `entrada_id`) | **Corregido y probado** |
| Control de Mercancía (listado), Boletas cargadas, Boletas (detalle) | "Doc. Control" y Total = `cantidad_docenas` (valor de la boleta); "Stock actual" = `cant_docenas_copy` aparte | **Corregido** (falta probarlo en el navegador) |
| Catálogo público (`catalog_products.stock`) | `cant_docenas_copy` (por trigger) | Sin cambios |
| Escáner QR (`ProductScan.jsx`) | Resta `cant_docenas_copy` por RPC | Pendiente (decisión operativa) |
| App móvil | No manda `entrada_id` | Pausado |

---

## 10. Notas de trabajo

- La persona usuaria prefiere que **no se implemente nada sin su confirmación**: analizar, explicar y proponer primero.
- Para verificar datos se hicieron consultas de solo lectura con la clave pública del `.env` (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`). Hallazgo de seguridad pendiente: `ventas` y `entradas` son **legibles sin iniciar sesión** con esa clave. Conviene revisar las políticas RLS.
- Los cambios de datos (SQL) los ejecuta la persona usuaria a mano en el editor SQL de Supabase. Siempre con backup y en transacción.
- Los errores de lint de `VentasScanner.jsx` (`indicePreset`, `handleIndiceChange`, `Icon`) existían antes de los cambios.
