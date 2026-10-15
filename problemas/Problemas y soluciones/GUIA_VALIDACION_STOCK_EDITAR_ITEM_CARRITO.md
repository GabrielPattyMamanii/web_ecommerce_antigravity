# Guía: validación de stock al vender (editar ítem del carrito, confirmar venta y restricción en la base)

**Para qué sirve este archivo:** documenta los problemas de Registrar Ventas por los que se podía **vender más de lo que había en stock** y cómo se resolvieron, en cuatro frentes: (1) editar un ítem del carrito (`saveEdit`), (2) confirmar la venta (`confirmSale`, **capa 1**), (3) una restricción en la base de datos (**capa 2**) y (4) corregir la cantidad cargada de un producto en la edición de tanda sin perder el stock ya descontado (`AgregarTanda`, sección 8). Sirve de referencia si aparece otro caso de "se vendió más de lo que había" por una vía que no valida stock.

**Última actualización:** 2026-10-15
**Archivo afectado:** `src/pages/admin/VentasScanner.jsx` (ruta `/admin/ventas`, "Registrar Venta") y la tabla `entradas` (restricción SQL)
**Complementa a:** `GUIA_CALCULO_DE_STOCK_PROBLEMA_Y_SOLUCION.md` (cómo se calcula el stock disponible por `entrada_id`). Esta guía asume ese cálculo.

**Estado por parte:**
| Parte | Estado |
|---|---|
| Validación en `saveEdit` | Aplicada y **probada en el navegador por la persona usuaria: funciona** (2026-10-15) |
| **Capa 1**: releer stock en `confirmSale` | Aplicada en el código. **Probada por la persona usuaria en el navegador: funciona** |
| **Capa 2**: restricción `chk_stock_no_negativo` en `entradas` | **Ejecutada en Supabase y probada por la persona usuaria: funciona.** El código asociado (mensaje de error en `confirmSale`) también está aplicado |
| **Corrección de cantidades en `AgregarTanda`** (sección 8) | Aplicada en `AgregarTanda.jsx` y `FormularioMarca.jsx`. **Probada por la persona usuaria en el navegador: funciona** |
| **Editar ventas ya guardadas (Historial de ventas)** (sección 9) | Aplicada en `VentasHistorial.jsx` con un módulo compartido `src/lib/stockVentas.js`. **Probada por la persona usuaria en el navegador: funciona** |

---

## 1. El problema

En Registrar Ventas, el control de stock existía solo en un punto del recorrido. Se podía agregar 1 docena (pasaba la validación) y después editar ese ítem del carrito a 50 docenas sin que nada lo frenara.

### 1.1 Recorrido de una venta y dónde se validaba

| Paso | Qué hace la persona | Función | ¿Validaba stock? |
|---|---|---|---|
| 1 | Escanea o busca un producto | `selectEntrada` | Calcula el stock y lo muestra (no bloquea) |
| 2 | Elige cantidad y precio, toca **Agregar al carrito** | `addToCart` | **Sí** |
| 3 | El ítem queda en el carrito | | |
| 4 | Toca el **lápiz** de un ítem para cambiar cantidad, precio o forma de pago | `openEdit` abre la ventana; **`saveEdit`** guarda | **No (el hueco)** |
| 5 | Toca **Confirmar venta** | `confirmSale` | **No** (solo guarda) |

`saveEdit` **no se usa al agregar** productos: solo cuando se edita un ítem que ya está en el carrito.

### 1.2 Por qué no bastaba con reutilizar `stockInfo`
`stockInfo` guarda el stock **del producto seleccionado en el formulario**. El ítem que se edita puede ser de otro producto del carrito, así que no sirve para validar la edición.

### 1.3 Consecuencia
Se podía vender más del stock disponible. El trigger de ventas igualmente restaba de `cant_docenas_copy`, que quedaba **negativo** (se propagaba a `catalog_products.stock`). No hay restricción en la base que lo impida.

---

## 2. La solución aplicada

### 2.1 Idea
Reutilizar el mismo cálculo de stock que usa `addToCart` (por `entrada_id`, ver la guía de cálculo de stock) y aplicarlo también al guardar la edición, **descontando solo las otras líneas del carrito del mismo producto** para no contar dos veces la línea que se edita.

```
disponible = cantidad_docenas − vendido − (docenas de OTROS ítems del carrito con el mismo entrada_id)
si nueva_cantidad > disponible  →  no se guarda y se avisa
```

### 2.2 Qué se cambió en `VentasScanner.jsx`

1. **Referencia con el stock por producto:** `stockPorEntradaRef = useRef({})`, junto a `metodoRegistroRef`.
2. **Se llena al seleccionar el producto:** en `selectEntrada`, justo antes de `setStockInfo`:
   ```js
   stockPorEntradaRef.current[entrada.id] = { total: totalDocenas, sold };
   ```
   Todo ítem del carrito pasó antes por `selectEntrada` (única forma de llegar a `addToCart`), así que el dato siempre existe.
3. **Validación en `saveEdit`**, después de comprobar cantidad y precio:
   ```js
   const editedItem = cart[editingIndex];
   if (editedItem && qty > editedItem.cantidad_docenas) {
       const stock = stockPorEntradaRef.current[editedItem.entrada_id];
       if (!stock) {
           toast.error('No se pudo verificar el stock de este producto. Quitalo y volvé a agregarlo.');
           return;
       }
       const enOtrosItems = cart
           .filter((item, i) => i !== editingIndex && item.entrada_id === editedItem.entrada_id)
           .reduce((sum, item) => sum + item.cantidad_docenas, 0);
       const available = stock.total - stock.sold - enOtrosItems;
       if (qty > available) {
           avisarStockInsuficiente({ available, total: stock.total,
               propietario: editedItem.propietario,
               codigo: editedItem.codigo || editedItem.producto_titulo });
           return;
       }
   }
   ```
4. **Aviso compartido:** función de módulo `avisarStockInsuficiente({ available, total, propietario, codigo })`. La usan `addToCart` y `saveEdit` (los textos no cambiaron).
5. **Conteo del carrito por `entrada_id`:** en `addToCart` y en `cartDocenasForSelected` se filtra por `item.entrada_id === selectedEntrada.id` en lugar de código + propietario (cambio hecho antes, ver guía de cálculo).

### 2.3 Comportamiento

Ejemplo con `GT8008` (PRIMERA TANDA OCTUBRE): cargado 24, vendido 9, disponible 15.

| Acción sobre un ítem del carrito | Resultado |
|---|---|
| Subir la cantidad por encima de lo disponible (ej. 20) | **Bloqueado**: "⚠️ Solo quedan 15 docenas disponibles para Sin propietario (código GT8008)" |
| Subir la cantidad dentro de lo disponible (ej. 15) | Se guarda |
| Bajar la cantidad | Se guarda, sin chequear stock |
| Cambiar solo precio o forma de pago | Se guarda, sin chequear stock |

Si el mismo producto aparece en dos líneas del carrito (3 + 4), editar una se compara contra el disponible menos la otra.

### 2.4 Decisiones de diseño y por qué
| Decisión | Motivo |
|---|---|
| Validar **solo cuando la cantidad sube** | No bloquear ediciones de precio o método de pago si el producto ya estaba al límite o sobrevendido |
| Guardar el stock **al seleccionar** (opción A) en vez de consultar al editar | Sin consultas extra, respuesta instantánea. Alternativa descartada por ahora: volver a consultar la base en cada edición (siempre actual, pero una consulta por edición y hay que decidir qué hacer si falla la red) |
| Si falta el dato del stock, **bloquear con aviso** | Es el lado seguro; casi no debería ocurrir porque todo ítem pasó por `selectEntrada` |
| No exponer `stockPorEntradaRef` en el carrito | `confirmSale` hace `...item` y manda todo al `insert` en `ventas`: cualquier campo extra en el ítem rompería el guardado por columna inexistente |

---

## 3. Cómo probarlo

**Resultado:** la persona usuaria lo probó en pantalla y la validación funciona: al subir la cantidad de un ítem del carrito por encima de lo disponible, el guardado se bloquea y muestra el aviso.

Pasos para repetir la prueba:

1. Recargar la página sin caché (`Ctrl + Shift + R`) en `/admin/ventas`.
2. Buscar `GT8008` (quedan 15) y agregar 1 docena al carrito.
3. Tocar el lápiz del ítem, poner 20 y guardar → debe avisar que quedan 15.
4. Poner 15 → debe guardarse.
5. Poner 1 de nuevo, o cambiar solo el precio → debe guardarse sin avisos.
6. Probar con dos líneas del mismo producto para comprobar que se descuenta la otra línea.

---

## 4. El problema de `confirmSale`: el stock cambia entre que agregás y que confirmás

`confirmSale` es el botón **"Confirmar venta"** de **Registrar Ventas del admin** (`/admin/ventas`). No es el carrito de un cliente en la tienda (ese es otro flujo: `src/context/cartStore.js` y `CartDrawer.jsx`). La app móvil tiene su propio `confirmSale` (`ecommerce-mobile/stores/cartStore.ts`), en pausa.

### 4.1 Qué hacía
1. Verificaba que el carrito no estuviera vacío.
2. Averiguaba quién registra la venta.
3. Armaba una fila de `ventas` por ítem del carrito.
4. Hacía **un solo `insert`** con todas las filas (entra todo o no entra nada).
5. Ante cualquier error mostraba "Error al guardar las ventas".

**No comprobaba el stock.** Usaba el número calculado cuando se **eligió** el producto, que puede estar viejo cuando se **confirma**. Y la base tampoco tenía ninguna regla que impidiera un stock negativo.

### 4.2 Ejemplo: dos vendedores a la vez (GT8008, quedan 15 docenas)

| Momento | Vendedor A | Vendedor B | Stock real |
|---|---|---|---|
| 1 | Elige GT8008: ve 15 | Elige GT8008: ve 15 | 15 |
| 2 | Agrega 10 al carrito (válido: 10 ≤ 15) | Agrega 10 al carrito (válido: 10 ≤ 15) | 15 |
| 3 | **Confirma** | | 5 |
| 4 | | **Confirma**: nadie lo frena | **−5** |

Cada vendedor pasó todas las validaciones de pantalla (`addToCart` y `saveEdit` comparan contra el stock del momento en que eligieron el producto) y, aun así, se vendieron 20 docenas con 15 disponibles. El trigger restó sin preguntar y `cant_docenas_copy` quedó en −5, que se copia al catálogo público.

Otras formas de llegar a lo mismo: dejar el carrito abierto mucho tiempo mientras el producto se vende por otro lado; borrar o editar una venta en otra pantalla; corregir la cantidad de la tanda mientras hay un carrito abierto.

---

## 5. La solución: dos capas (en palabras simples)

Pensalo como un depósito con dos controles:

- **Capa 1 (pantalla): el vendedor mira el estante** justo antes de entregar. "Hay 15, puedo vender 10".
- **Capa 2 (base de datos): el encargado del depósito** comprueba, en el momento exacto de sacar la mercadería, que no se esté sacando más de lo que hay. Si falta, no entrega, diga lo que diga el vendedor.

### 5.1 Capa 1: releer el stock al confirmar (`verificarStockCarrito`)

**Qué hace:** justo antes de guardar, `confirmSale` vuelve a leer de la base el stock **actual** de cada producto del carrito y lo compara con lo que se quiere vender. Si algún producto no alcanza, **no guarda nada** y avisa cuál.

**Cómo lo hace** (función de módulo `verificarStockCarrito(cart)` en `VentasScanner.jsx`):
1. Suma por producto todas sus líneas del carrito (`entrada_id` → docenas pedidas en total).
2. Lee de `entradas` esos productos (`cantidad_docenas`, dueño, tanda, código).
3. Lee las ventas actuales (por `entrada_id`; las sin vínculo por código) y los "hermanos" (entradas con el mismo código).
4. Calcula el vendido con `calcSold` (el mismo cálculo por `entrada_id` de la guía de cálculo de stock) y `disponible = cantidad_docenas − vendido`.
5. Devuelve los productos donde `pedido > disponible`. Si no puede consultar la base, lanza error.

**En `confirmSale`:** se ejecuta al principio, dentro del `try`.
- Si hay faltantes: aviso (con saltos de línea, `whiteSpace: 'pre-line'`, 9 segundos) y no guarda:
  ```
  ⚠️ No se guardó la venta: el stock cambió.
  • GT8008: quedan 5, intentás vender 10
  Ajustá el carrito y confirmá de nuevo.
  ```
- Si no puede verificar: "No se pudo verificar el stock. Intentá de nuevo." y no guarda (falla del lado seguro).
- Si el producto ya no existe: "el producto ya no existe".

**Ejemplo (misma historia del 4.2):** cuando el Vendedor B confirma, `confirmSale` relee GT8008: ahora quedan 5 y B pide 10 → **se rechaza la venta de B** con el aviso. El carrito de B queda intacto para que lo ajuste.

**Límite de la capa 1:** reduce la ventana de riesgo a milisegundos, pero **no la elimina**. Si A y B confirman en el mismo instante, los dos leen "quedan 15", los dos pasan la verificación y los dos guardan. Eso solo lo cierra la capa 2.

### 5.2 Capa 2: restricción en la base de datos (`chk_stock_no_negativo`)

**Estado: ejecutada en Supabase y funcionando** (confirmado por la persona usuaria). Ya no se puede guardar una venta que deje `cant_docenas_copy` negativo.

**Qué es:** una regla de la tabla `entradas`: ninguna fila puede tener `cant_docenas_copy` menor que 0. Se comprueba cada vez que se intenta cambiar esa columna, venga de donde venga.

```sql
ALTER TABLE entradas
  ADD CONSTRAINT chk_stock_no_negativo CHECK (cant_docenas_copy >= 0);
```

Se creó **sin `NOT VALID`** porque, al momento de aplicarla, no había filas negativas ni vacías (verificado el 2026-10-15: 344 productos, 0 negativos, 0 `NULL`). Así Postgres comprueba toda la tabla y deja la garantía completa. Si apareciera un negativo antes de ejecutarla, el comando falla con un mensaje claro y no cambia nada.

**Cómo actúa con el trigger de ventas:** al insertar una venta, el trigger `trg_ventas_descuenta_stock` hace `cant_docenas_copy = cant_docenas_copy − cantidad`. Si el resultado fuera negativo, la restricción se rompe, el trigger falla y **el `insert` completo de la venta se cancela** (todas las líneas del carrito). Postgres procesa las confirmaciones una por una, y por eso sí cierra el caso de los dos vendedores simultáneos.

**Ejemplo (misma historia, con los dos vendedores confirmando en el mismo instante):**
1. A guarda 10: el trigger resta, 15 → 5. La regla se cumple (5 ≥ 0). Se guarda.
2. B guarda 10: el trigger intentaría restar, 5 → −5. La regla se rompe. **La base rechaza la venta de B**.

**En pantalla (código ya aplicado):** el `catch` de `confirmSale` reconoce el error (`err.code === '23514'` o el mensaje contiene `chk_stock_no_negativo`) y muestra, durante 9 segundos:
> ⚠️ No se guardó la venta: el stock de algún producto ya no alcanza (otra venta se registró antes). Actualizá la página y revisá el carrito.

Cualquier otro error sigue mostrando "Error al guardar las ventas".

**Qué más protege (aparte de Registrar Ventas):** editar la cantidad de una venta ya guardada en el Historial (subirla por encima del stock), el escáner QR (`ProductScan.jsx`, RPC `restar_cant_docenas_copy`) y cualquier SQL directo.

**Cómo deshacerla:** `ALTER TABLE entradas DROP CONSTRAINT chk_stock_no_negativo;`

### 5.3 Preparación previa: `T91782` (−1)
Antes de la capa 2 había un producto en −1: `T91782` de "Segunda tanda JUNIO" (id `3bc1725a-406c-42e5-9446-0ab7310e7289`, cargado 10, vendido 11). Postgres vuelve a comprobar la regla al **actualizar** esa fila, así que mientras siguiera negativa, editar esa tanda en `AgregarTanda` habría fallado. La persona usuaria lo corrigió a mano antes: la venta `581` (la que pasaba de las 10 docenas) ya no aparece y el stock quedó en 0. Verificado el 2026-10-15: 9 ventas vinculadas al producto, `cant_docenas_copy = 0`.

---

## 6. Resultado esperado de cada capa

### 6.1 Por capa

| | Qué cambia | Resultado esperado |
|---|---|---|
| **Capa 1** (pantalla) | `confirmSale` relee el stock antes de guardar | Si el stock cambió desde que se agregó el ítem y ya no alcanza: **no se guarda nada**, se muestra qué producto y cuánto queda, y el carrito queda intacto. Si todo alcanza: se guarda como siempre. Si no se puede consultar la base: no se guarda y se pide reintentar |
| **Capa 2** (base) | La base rechaza stock negativo | En una confirmación simultánea que dejaría stock negativo: la segunda venta se **rechaza completa** con el aviso de stock. **`cant_docenas_copy` ya no puede quedar negativo** por ninguna vía |

### 6.2 Por escenario

| Escenario | Sin capas | Solo capa 1 | Capa 1 + capa 2 |
|---|---|---|---|
| Alguien vendió el producto mientras tenías el carrito abierto | Se guarda, stock negativo | **Se rechaza con aviso claro** | Se rechaza con aviso claro (lo frena la capa 1) |
| Dos personas confirman en el mismo instante | Se guardan las dos, stock negativo | Pueden pasar las dos (la ventana de milisegundos) | **La segunda se rechaza** (lo frena la capa 2) |
| Subir la cantidad de una venta ya guardada (Historial) | Se permite, stock negativo | Se permite (la capa 1 no está ahí) | **Se rechaza** |
| Escáner QR restando más de lo que hay | Se permite | Se permite | **Se rechaza** |
| Una venta desde la app móvil | No descuenta stock | No descuenta stock | No descuenta stock (sin `entrada_id`, el trigger no actúa) |
| Falla la red al verificar el stock | No aplica | No se guarda y se avisa | No se guarda y se avisa |

### 6.3 Efecto lateral a tener en cuenta (capa 2)
Si el stock cargado de un producto está mal (por ejemplo dice 5 y hay 10 físicas), **esa venta se bloquea**. La salida es corregir la cantidad cargada. Antes, hacerlo desde `AgregarTanda` pisaba `cant_docenas_copy` con el valor nuevo y perdía lo descontado por ventas; **ya está corregido** (sección 8: ahora se aplica solo la diferencia). También se bloquea editar una tanda si alguno de sus productos quedara con stock negativo.

---

## 7. Cómo probar las capas

### 7.1 Capa 1 (dos pestañas)
Usar un producto de prueba (por ejemplo MARCATEST, código `12345`, 100 docenas); genera ventas reales que se pueden borrar del Historial después.
1. Abrir `/admin/ventas` en dos pestañas y elegir el mismo producto en las dos.
2. En la pestaña A, agregar y confirmar una venta grande (95 de las 100).
3. En la pestaña B (que aún tiene el stock viejo), agregar 10 y confirmar.
4. Debe rechazarla indicando que quedan 5, sin guardar nada.

### 7.2 Capa 2 (SQL)

**Resultado:** la restricción se ejecutó en Supabase y la persona usuaria confirmó que **funciona** (la base rechaza el stock negativo).
Comprobar que la restricción existe:
```sql
SELECT conname, convalidated FROM pg_constraint
WHERE conrelid = 'entradas'::regclass AND conname = 'chk_stock_no_negativo';
```
(`convalidated = true` si se creó sin `NOT VALID`.)

Probar que rechaza, sin dejar cambios:
```sql
BEGIN;
UPDATE entradas SET cant_docenas_copy = -1
WHERE id = '3bc1725a-406c-42e5-9446-0ab7310e7289';
ROLLBACK;
```
El `UPDATE` debe fallar mencionando `chk_stock_no_negativo`.

---

## 8. Corregir la cantidad de un producto en la edición de tanda sin perder lo descontado (`AgregarTanda`)

### 8.1 El problema

Cada producto (fila de `entradas`) tiene dos contadores:

| Contador | Columna | Qué es |
|---|---|---|
| **Cargado** | `cantidad_docenas` | Lo que llegó según la boleta. Las ventas no lo tocan |
| **Stock actual** | `cant_docenas_copy` | Lo que queda para vender. Baja con cada venta (trigger) y con el escáner QR |

Es como una **caja de ahorros**: "cargado" es lo que depositaste al principio y "stock actual" es el saldo después de los retiros (las ventas).

Si la cantidad cargada estaba mal (por ejemplo, la boleta decía 30 y se cargó 24), hay que corregirla desde la edición de tanda (`/admin/mercancia`, `AgregarTanda.jsx`). **Antes, el guardado reemplazaba el stock actual por la cantidad nueva**, olvidando lo ya vendido. Código anterior (`AgregarTanda.jsx`, al guardar):

```js
const cantidadCambio = parseFloat(entry.cantidad_docenas) !== parseFloat(match.cantidad_docenas);
const updateFields = cantidadCambio
    ? { ...fieldsWithoutCopy, cant_docenas_copy: entry.cantidad_docenas }   // ← pisaba el stock actual
    : fieldsWithoutCopy;
```

### 8.2 Ejemplo (GT8008, PRIMERA TANDA OCTUBRE)

Cargado 24, vendidas 9, stock actual 15. Se descubre que en realidad llegaron **30** y se corrige 24 → 30.

| | Antes (pisaba) | Debería ser | Ahora (diferencia) |
|---|---|---|---|
| `cantidad_docenas` | 30 | 30 | 30 |
| `cant_docenas_copy` | **30** ✗ | 21 | **21** ✓ |

Con el defecto, el stock actual quedaba en 30 aunque ya se habían vendido 9: el catálogo público mostraba de más, Control de Mercancía marcaba "Descuadre" (30 − 9 = 21 contra 30) y la restricción de la base (capa 2) dejaba de proteger ese producto.

La lógica nueva le suma al stock actual **solo lo que se corrigió**: se agregaron 6 docenas a la boleta (de 24 a 30), entonces el stock actual sube 6: de 15 a 21.

### 8.3 Un segundo problema: emparejar filas por código

Al guardar, `AgregarTanda` tiene que decidir qué producto del formulario corresponde a qué fila de la base. Antes lo hacía por **código, en el orden en que venían**. Con códigos repetidos en la misma tanda (por ejemplo `T7512`, un producto de Gabriel y otro de Luis; ver la guía de cálculo de stock), el emparejamiento podía cruzarse: los cambios (incluida la diferencia de stock) se aplicaban a la fila del otro dueño. El formulario **no guardaba el `id`** de cada fila al abrir la edición.

### 8.4 Variables

**Las que ya existían** (columnas de `entradas` y variables de `AgregarTanda.jsx` al guardar):

| Variable | Qué es |
|---|---|
| `cantidad_docenas` (columna) | Cargado, original de la boleta |
| `cant_docenas_copy` (columna) | Stock actual |
| `entry.cantidad_docenas` | Cantidad que el formulario quiere guardar |
| `match.cantidad_docenas` | Cantidad que hay hoy en la base para esa fila |
| `cantidadCambio` | `true` si la cantidad del formulario difiere de la de la base |
| `fieldsWithoutCopy`, `updateFields` | Campos a actualizar (sin / con `cant_docenas_copy`) |
| `existingByCode` | `Map` código → filas de la base `{ id, cantidad_docenas }` (solo se emparejaba por código) |
| `matchedIds` | `Set` de filas ya emparejadas |

**Las nuevas:**

| Variable | Dónde | Qué es |
|---|---|---|
| `entrada_id` | En cada producto del formulario (al cargar la tanda) | `id` de la fila de `entradas`. **Solo del formulario**: nunca se envía a la base |
| `stock_original` | Ídem | `cantidad_docenas` tal como estaba en la base al abrir |
| `stock_actual` | Ídem | `cant_docenas_copy` tal como estaba en la base al abrir |
| `entradaIds` | `AgregarTanda.jsx`, `handleConfirmSave` | Arreglo paralelo a `entriesToInsert` con el `id` de cada producto (`null` si es nuevo). Se usa un arreglo aparte para no mandar `entrada_id` a la base |
| `existingById` | Ídem | `Map` `id` → fila de la base |
| `matchByEntry` | Ídem | Fila de la base emparejada con cada producto del formulario |
| `cantNueva`, `cantVieja` | Ídem | Cantidad del formulario y de la base |
| `copyActual` | Ídem | Stock actual de la base (si es `null`, se toma `cantVieja`) |
| `copyNueva` | Ídem | `copyActual + (cantNueva − cantVieja)`, redondeado a 2 decimales |
| `stockErrors` | Ídem | Productos cuya cantidad quedaría por debajo de lo ya descontado |
| `getDescontadas(prod)` | `FormularioMarca.jsx` | `stock_original − stock_actual` (0 si el producto es nuevo) |
| `prevProd`, `editingProd` | `FormularioMarca.jsx` | Producto que se está editando, con sus datos de la base |

### 8.5 La solución

**Fórmula:**
```
cant_docenas_copy nuevo = cant_docenas_copy actual + (cantidad_nueva − cantidad_vieja)
```

**Cambios:**

1. **`AgregarTanda.jsx`, al cargar la tanda:** cada producto del formulario guarda `entrada_id`, `stock_original` y `stock_actual`.
2. **`AgregarTanda.jsx`, al guardar:**
   - El `select` de las filas existentes ahora trae también `cant_docenas_copy`.
   - Emparejamiento en dos pasos: **(1)** por `entrada_id` (exacto); **(2)** el resto por código, como antes (productos nuevos sin id o cuya fila ya no existe).
   - Si la cantidad cambió: `cant_docenas_copy = copyActual + (cantNueva − cantVieja)`. Si el resultado sería negativo (se intenta cargar menos de lo ya descontado), **no se guarda nada**: se lanza un error antes de tocar la base con el mensaje `CODIGO: ya se descontaron N docenas por ventas, no podés cargar menos que eso`.
   - Si la cantidad no cambió, el stock actual no se toca (como antes).
3. **`FormularioMarca.jsx`, ventana "Editando producto":**
   - Muestra debajo de "Docenas": `Descontadas: X · Stock actual: Y`.
   - No deja guardar una cantidad menor a las descontadas (error en el campo).
   - Al editar, el producto conserva `entrada_id`, `stock_original` y `stock_actual` (`{ ...prevProd, ...campos nuevos }`). Sin esto, editar un producto perdía el `id`.

**Lo que NO se hizo:** no se agregaron botones +/−, porque el problema no era cómo se ingresa el número sino qué hacía el guardado. Sumar solo en `cantidad_docenas` dejaría desincronizado el stock actual (catálogo y base); sumar solo en `cant_docenas_copy` dejaría un descuadre permanente con la boleta.

### 8.6 Comportamiento esperado

Ejemplo GT8008 (cargado 24, vendidas 9, stock actual 15):

| Acción en la edición de tanda | Resultado |
|---|---|
| Cambiar la cantidad a **30** | Stock actual = 15 + 6 = **21** |
| Cambiar la cantidad a **10** | Stock actual = 15 − 14 = **1** |
| Cambiar la cantidad a **8** (menos de las 9 descontadas) | **Se bloquea**: "ya se descontaron 9 docenas…" (en la ventana y también al guardar) |
| Cambiar solo el precio o el título | El stock actual no cambia |
| Dos productos con el mismo código (Gabriel / Luis) | Cada cambio va a su propia fila (emparejamiento por `entrada_id`) |
| Agregar un producto nuevo | Se inserta con stock actual = cantidad (como siempre) |

### 8.7 Cómo probarlo
1. Abrir la edición de una tanda con un producto con ventas (ej. GT8008 en PRIMERA TANDA OCTUBRE) y entrar a editarlo: debe verse `Descontadas: 9 · Stock actual: 15`.
2. Poner 30 y guardar la tanda. En la base: `cantidad_docenas = 30`, `cant_docenas_copy = 21`. Volver a 24 y guardar: `cant_docenas_copy = 15`.
3. Poner 8 y probar guardar: debe bloquear.
4. En una tanda con códigos repetidos (T7512, TERCERA TANDA JULIO), cambiar solo la cantidad de uno y comprobar que el otro no cambia.

Consulta de verificación (stock actual esperado de un producto con ventas vinculadas): `SELECT e.cantidad_docenas - COALESCE(SUM(v.cantidad_docenas), 0) FROM entradas e LEFT JOIN ventas v ON v.entrada_id = e.id WHERE e.id = '<id>' GROUP BY e.id;`

### 8.8 Límites y cuidados
- **"Descontadas" se calcula como `cargado − stock actual`** de la base al abrir. Incluye lo restado por el escáner QR, no solo ventas. Para productos con ventas viejas sin vincular (sin `entrada_id`), el stock actual no las descontó, así que la protección es algo más permisiva en ellos.
- **Dato "viejo" si otra persona vende mientras editás la tanda:** el formulario usa lo leído al abrir. La base (capa 2) sigue protegiendo contra el stock negativo.
- **Cambiar el código** de un producto existente **ya no borra su fila**: desde que el formulario emparejaba por `entrada_id` (paso 1 del emparejamiento), el producto se actualiza con su mismo `id` aunque cambie el código. Lo que **sigue borrando la fila** es **quitar el producto del formulario** (o borrar la marca entera): sus ventas pierden el vínculo (`ON DELETE SET NULL`). Sigue pendiente proteger el borrado de productos con ventas.
- **`ecommerce-men`** (`src/lib/inventarioUtils.js`, ~líneas 127-132) tiene la misma lógica antigua y no se modificó, pero es **otro proyecto con otra base de Supabase** (la URL es distinta a la de `ecommerce-web`) y **no usa `ventas` ni `entrada_id`**. No afecta los datos de esta base; solo, en su propio sistema, cambiar una cantidad pisa el stock de control.
- **Probado por la persona usuaria en el navegador: funciona.** El lint de ambos archivos solo marca errores que ya existían (`allCodesInTanda`, `findError`, `filteredIdx` y el `cant_docenas_copy` desestructurado sin uso).

---

## 9. Editar ventas ya guardadas (Historial de ventas): la misma solución del `saveEdit`

> ### ⚠️ REGLA: SI EN LA APP WEB EXISTE UNA FUNCIÓN PARA EDITAR VENTAS YA HECHAS, DEBE APLICARSE ESTA RESTRICCIÓN (O ESTAS REGLAS) PARA EVITAR EL DESFASE DE STOCK.
> Toda vía que **suba la cantidad** de una venta, **agregue** un producto a una venta o **cambie el producto** de una venta debe validar el stock **antes de guardar** y mostrar un aviso claro si falla. Es exactamente el mismo problema y la misma solución que en `saveEdit` (sección 2): cualquier camino que cambie lo vendido puede dejar el stock negativo si no valida.

### 9.1 El problema
En el Historial de ventas (`src/pages/admin/VentasHistorial.jsx`, ruta de ventas del admin) se puede **editar una venta ya guardada** (cantidad, precio, producto, forma de pago) y **agregar un producto a un pedido**. Esas funciones:

- **No validaban stock**: `handleSave` solo comprueba que la cantidad sea mayor a 0.
- **Fallaban en silencio si la base rechazaba el cambio**: `handleEditSave` y `handleAdd` usaban `try/finally` sin `catch`, y `editVenta`/`addVenta` hacían `throw error` sin mostrar nada. Con la restricción `chk_stock_no_negativo` activa, el cambio se rechazaba pero la persona no veía ningún mensaje.

### 9.2 Cómo se desfasa el stock (el trigger ya hace su parte)
Al editar una venta con `entrada_id`, el trigger `trg_ventas_reajusta_stock` ajusta `cant_docenas_copy` por la **diferencia**:

| Acción en el historial | Efecto del trigger | Riesgo |
|---|---|---|
| Subir la cantidad de 1 a 20 | `cant_docenas_copy −= 19` | Puede dejarlo negativo |
| Bajar la cantidad de 5 a 2 | `cant_docenas_copy += 3` | Ninguno |
| Cambiar de producto (otro `entrada_id`) | Devuelve al producto viejo y resta al nuevo | Puede dejar negativo el nuevo |
| Agregar un producto a un pedido | `cant_docenas_copy −= cantidad` | Puede dejarlo negativo |
| Venta sin `entrada_id` (las 169 viejas) | **El trigger no actúa** | Sin efecto en el stock: no hace falta validar |

### 9.3 La solución (misma idea que `saveEdit`)
**Validar solo cuando aumenta lo que se descuenta de un producto, comparando contra el stock disponible, y descontando lo que la propia venta ya tenía.**

```
mismo producto:   aumento = cantidad_nueva − cantidad_anterior      → debe ser ≤ disponible
producto nuevo:   aumento = cantidad_nueva                           → debe ser ≤ disponible
disponible = cantidad_docenas − vendido   (cálculo por entrada_id de la guía de cálculo de stock)
```

El `vendido` ya incluye la cantidad anterior de esta misma venta, por eso solo se compara el **aumento**, no la cantidad completa (si no, se contaría dos veces, como pasaba con las líneas del carrito).

Las dos capas del resto de la guía se aplican igual:
- **Capa de pantalla (nueva):** validación antes de guardar, con el aviso `Stock insuficiente en <código>: como máximo podés poner N docenas en esta venta (quedan M disponibles)`.
- **Capa de base (ya existente):** la restricción `chk_stock_no_negativo` sigue siendo la protección que no se puede saltear (ventas simultáneas, otras pantallas).
- **Mensaje cuando la base rechaza:** si el error es de stock (código `23514` o menciona `chk_stock_no_negativo`) se muestra el aviso de stock; cualquier otro error muestra "Error al guardar la venta". **Ya no falla en silencio.**
- Cuando falla, el formulario de edición **queda abierto** para que se corrija la cantidad.

### 9.4 Qué se cambió en el código
| Archivo | Cambio |
|---|---|
| `src/lib/stockVentas.js` (**nuevo**) | Módulo compartido con el cálculo de stock: `normalizeOwner`, `ownerKeyOf`, `calcSold`, `VENTAS_STOCK_FIELDS`, `fetchSoldForEntrada`, `fetchEntradaStock`, `avisarStockInsuficiente`, `avisarLimiteVenta`, `esErrorStockNegativo`. Antes estas funciones vivían solo dentro de `VentasScanner.jsx` |
| `src/pages/admin/VentasScanner.jsx` | Pasa a **importar** esas funciones del módulo (sin cambio de comportamiento) |
| `src/pages/admin/VentasHistorial.jsx` | Funciones nuevas `validarStockVenta` (valida el aumento contra el stock) y `avisarErrorGuardado` (aviso cuando la base rechaza). `editVenta` y `addVenta` las usan antes/después de guardar; `handleEditSave` y `handleAdd` (en `PedidoModal`) capturan el error para que el formulario siga abierto |

### 9.5 Variables
| Variable | Dónde | Qué es |
|---|---|---|
| `actual` | `editVenta` | La venta antes de editar (se busca en el estado `ventas` por `id`) |
| `entradaId` | `editVenta` / `addVenta` | Producto afectado: `data.entrada_id` si se eligió uno nuevo en el buscador, o `actual.entrada_id` |
| `cantNueva` | Ídem | Cantidad que se quiere guardar |
| `cantAnterior` | `editVenta` | Cantidad actual de la venta **solo si sigue siendo el mismo producto**; 0 si cambió de producto o si es una venta nueva |
| `stock` | Ídem | Resultado de `fetchEntradaStock(entradaId)`: `{ total, sold, disponible }` |
| `maximo` | Ídem | Lo máximo que se puede poner en esta venta: `cantAnterior + disponible` |

### 9.6 Resultado esperado
Ejemplo con la venta **1229** de `GT8008` (PRIMERA TANDA OCTUBRE): cargado 24, vendidas 9 en total (incluye esta, de 1 docena), disponible **15**.

| Acción en el historial | Resultado |
|---|---|
| Subir la cantidad de 1 a **20** | **Bloqueado**: el aumento (19) supera lo disponible (15). Aviso con máximo 16 |
| Subir de 1 a **16** | Se guarda (aumento 15 = disponible; el stock queda en 0) |
| Subir de 1 a **17** | **Bloqueado** (aumento 16 > 15) |
| Bajar de 1 a **0,5** o cambiar solo el precio o la forma de pago | Se guarda sin chequear stock |
| Cambiar el producto por otro con 3 disponibles y poner 5 | **Bloqueado** (5 > 3) |
| Agregar un producto al pedido por más de lo disponible | **Bloqueado** |
| Editar una venta vieja sin `entrada_id` | Se guarda: el stock no se mueve |
| La base rechaza el cambio (otra persona vendió justo antes) | Aviso de stock (ya no silencioso); el formulario sigue abierto |

### 9.7 Cómo probarlo (con un producto de prueba, para no tocar stock real)

**Resultado:** la persona usuaria lo probó en el navegador y **funciona**: al subir la cantidad de una venta del Historial por encima de lo disponible, el guardado se bloquea con el aviso y el formulario queda abierto.
Usar un producto de prueba, por ejemplo **MARCATEST** (`12345`, 100 docenas), y borrar después las ventas de prueba del historial (el trigger devuelve el stock).

1. En **Registrar Venta** (`/admin/ventas`), vender 1 docena de MARCATEST `12345`.
2. En el **Historial de ventas**, abrir ese pedido y editar esa venta.
3. Poner una cantidad **mayor al stock** (por ejemplo 200) y guardar → debe **bloquear** con el aviso de stock y dejar el formulario abierto.
4. Poner una cantidad **válida** (por ejemplo 5) y guardar → debe guardarse. Comprobar que `cant_docenas_copy` de ese producto bajó 4 (de 99 a 95).
5. Bajar la cantidad a 2 → se guarda; el stock vuelve a subir 3.
6. Agregar al pedido el mismo producto por una cantidad enorme → debe bloquear.
7. Verificación en SQL del producto de prueba:
   ```sql
   SELECT e.cantidad_docenas, e.cant_docenas_copy,
          e.cantidad_docenas - COALESCE(SUM(v.cantidad_docenas), 0) AS esperado
   FROM entradas e LEFT JOIN ventas v ON v.entrada_id = e.id
   WHERE e.codigo = '12345' GROUP BY e.id;
   ```
   `cant_docenas_copy` debe coincidir con `esperado` y nunca ser negativo.

---

## 10. Lo que sigue abierto (misma familia de problemas)

| Hueco | Por qué importa | Estado |
|---|---|---|
| **Confirmar en el navegador la capa 1** | Releer el stock al confirmar la venta | **Resuelto**: probada por la persona usuaria |
| **Ejecución de la capa 2** | La base debía rechazar el stock negativo | **Resuelto**: ejecutada y probada por la persona usuaria |
| **Editar la cantidad de una venta ya guardada** (Historial de ventas, `VentasHistorial.jsx`) | Antes no validaba y fallaba en silencio | **Resuelto y probado por la persona usuaria** (sección 9) |
| **Otras funciones que cambien ventas ya hechas** | Por la regla de la sección 9, cualquier función nueva o existente que edite/agregue/cambie de producto una venta debe validar el stock | Revisar si existen otras (no se encontraron más en `src/pages/admin` al hacer este cambio, salvo la app móvil, en pausa) |
| **App móvil** (`ecommerce-mobile`) | No manda `entrada_id`, no descuenta stock ni valida | Pausado a pedido |
| **Selector de tandas** de Registrar Ventas | Sigue calculando el stock por texto | Pendiente |
| **Editar una tanda pisa lo descontado** (`AgregarTanda.jsx`) | Al corregir cantidades perdía el descuento de las ventas | **Resuelto y probado por la persona usuaria** (sección 8). `ecommerce-men` (otro proyecto, con otra base y sin ventas) conserva la lógica antigua |
| **Quitar un producto en la edición de tanda (o borrar una marca) borra su fila** | Sus ventas pierden el vínculo (`ON DELETE SET NULL`). Cambiar solo el código ya no lo borra | Pendiente |

---

## 11. Lección general

**Toda vía que cambie una cantidad vendida tiene que validar el stock, no solo la que agrega.** Para detectar huecos parecidos, listar todas las funciones o pantallas que crean o modifican filas de `ventas` y comprobar en cada una:

1. ¿Calcula el stock por `entrada_id` (no por texto)?
2. ¿Descuenta lo que ya está en el carrito, o en otras líneas?
3. ¿Valida antes de guardar, o solo al agregar?
4. ¿Hay una protección en la base si falla la de pantalla?

Si hay que repetir la validación en otra pantalla, el patrón es el de la sección 2.2: guardar `{ total, sold }` del producto cuando se lo selecciona y comparar contra `total − sold − otras unidades en la misma venta`.
