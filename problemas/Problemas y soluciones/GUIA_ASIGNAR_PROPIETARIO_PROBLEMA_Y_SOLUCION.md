# Guía: asignar propietario a productos vendidos sin dueño

**Para qué sirve este archivo:** explica el problema de las ventas hechas sobre productos sin propietario, cómo se resolvió con la pantalla **Asignar propietario** (`/admin/asignar-propietario`), cómo instalarla y cómo probarla. Sirve de contexto si aparece un desfase de dinero entre dueños.

**Última actualización:** 2026-10-15
**Archivos:** `src/pages/admin/AsignarPropietario.jsx` (pantalla), `supabase/migrations/20261015_asignar_propietario.sql` (base de datos), más registro de la ruta y el permiso en `src/App.jsx`, `src/components/layout/AdminLayout.jsx` y `src/lib/adminSections.js`.
**Complementa a:** `GUIA_CALCULO_DE_STOCK_PROBLEMA_Y_SOLUCION.md` (cómo se vincula una venta a su producto por `entrada_id`).

**Estado:** código aplicado y compila. **La migración SQL `20261015_asignar_propietario.sql` fue ejecutada en Supabase y la persona usuaria probó la pantalla: funciona** (la tabla `reasignaciones_propietario` existe en la base, verificado por lectura). Al momento de esa verificación quedaban 387 ventas como "Sin propietario" (el mismo número de antes de probar), es decir, la prueba no dejó reasignaciones activas.

---

## 1. El problema

A veces se vende mercadería antes de saber de quién es (no se logra contactar al dueño a tiempo). Cada venta guarda una **copia del nombre del dueño** en `ventas.propietario`; si el producto no tenía dueño, guarda `'Sin propietario'`. Cuando después se le asigna un dueño al producto (en `entradas`), **esa copia no se actualiza**.

Las pantallas de dinero agrupan por `ventas.propietario`: **Entrega de dinero**, **Historial de ventas** (acumulados) y **Cuentas bancarias**. El dinero de lo vendido antes de asignar el dueño queda en la hoja de "Sin propietario" y no en la del dueño real.

### Ejemplo real: `GT8008` (PRIMERA TANDA OCTUBRE, URUS)
Se vendieron 9 docenas en 3 ventas ($1.270.000) con `propietario = 'Sin propietario'`. Se descubre que URUS es de Luis y se le asigna el dueño al producto. Se vende 1 docena más ($150.000): esa ya se guarda como "Luis".

| Pantalla | Qué muestra |
|---|---|
| Entrega de dinero, hoja de **Luis** | Solo **$150.000** |
| Entrega de dinero, hoja de **"Sin propietario"** | Siguen los **$1.270.000** |
| Mercancía por propietarios | Las 24 docenas de GT8008 bajo Luis |

A Luis le corresponden $1.420.000, pero su hoja muestra $150.000.

### Datos de la base al implementar (2026-10-15)
- **387** ventas como "Sin propietario": **356** con `entrada_id` (se pueden mover) y **31** sin vínculo (no se pueden mover con esta pantalla).
- La pantalla listaría **153 productos**: 83 sin dueño con ventas (355 ventas, ~$49,9 millones), 69 sin dueño y sin ventas, y 1 con dueño pero con una venta todavía como "Sin propietario" (`T7521`, Luis, $150.000).

---

## 2. Por qué se puede resolver (qué tiene `ventas`)

| Columna de `ventas` | Qué aporta |
|---|---|
| `entrada_id` | Vínculo **exacto** al producto, sin depender de texto. Con él se encuentran las ventas de un producto |
| `propietario` | La copia del dueño que usan las pantallas de dinero. Se puede actualizar sin tocar nada más |
| El valor `'Sin propietario'` | Marca de "aún sin asignar": permite mover solo esas ventas y no pisar las ya asignadas |
| `id` | Identifica cada venta, para el registro y para deshacer |
| `total_ars`, `monto_transferencia`, `cuenta_nombre` | Para mostrar en la vista previa cuánto dinero se mueve y a qué cuentas entró |

**El stock no se mueve:** el trigger `trg_ventas_reajusta_stock` solo actúa si cambia la cantidad o el `entrada_id`. Cambiar solo el dueño no lo dispara.

**Las transferencias no cambian de cuenta.** La cuenta donde entró cada transferencia (`cuenta_id` / `cuenta_nombre`) queda como estaba. Entrega de dinero compara el dueño de esa cuenta con el dueño de la hoja y marca cada transferencia como **propia** (la plata ya la tiene el dueño) o **ajena** (está en la cuenta de otro): al reasignar, ese cálculo se rehace solo. En la hoja "Sin propietario" toda transferencia aparece como ajena; al pasar al dueño real, las que entraron a una cuenta suya pasan a propia.

---

## 3. La solución

### 3.1 Qué hace la pantalla (`/admin/asignar-propietario`)
1. **Lista** los productos que necesitan acción: sin dueño, o con dueño pero con ventas todavía como "Sin propietario". Para cada uno muestra tanda, marca, dueño actual, cantidad de ventas pendientes, docenas y monto.
2. **Filtros:** tanda, marca, estado (todos / sin dueño con ventas / sin dueño / con dueño y ventas pendientes) y búsqueda por código o título.
3. **Selección** de uno o varios productos y elección del **propietario de una lista** de usuarios (no se escribe a mano, así no hay errores de ortografía ni espacios).
4. **Vista previa** antes de confirmar: productos, ventas a pasar, docenas, monto total, efectivo frente a transferencia, a qué cuentas entró cada transferencia, y los productos que se omitirán (los que ya tienen otro dueño).
5. **Confirmar** llama a la función de base de datos `asignar_propietario`.
6. **Reasignaciones recientes** (abajo): registro de cada una (fecha, usuario, producto, nuevo dueño, ventas, monto) con botón **Deshacer**.

### 3.2 Qué hace la función `asignar_propietario(p_entrada_ids uuid[], p_propietario text)`
Todo en **una transacción** (si algo falla, no queda nada a medias):
1. Verifica permisos: `public.is_admin()` o un perfil con el permiso `asignar-propietario` (`profiles.permissions`).
2. Valida el propietario: no vacío, distinto de "Sin propietario" y existente en `app_users`.
3. Por cada producto (bloqueado con `FOR UPDATE`):
   - Si ya tiene **otro** dueño, lo **omite** (nunca pisa un dueño asignado).
   - Si no tiene dueño, le pone `entradas.propietario_producto = <dueño>`.
   - Pasa a ese dueño las ventas con `entrada_id = <producto>` **y** `propietario = 'Sin propietario'` (nunca toca ventas ya asignadas).
   - Guarda un registro en `reasignaciones_propietario`.
4. Devuelve un resumen: productos, ventas, monto total y los omitidos con su motivo.

Se escribe `propietario_producto` (el dueño del producto, que pisa al de la marca). **No se toca `entradas.propietario`** (el dueño de la marca/boleta).

### 3.3 Función `deshacer_reasignacion(p_id uuid)`
- Las ventas registradas vuelven a "Sin propietario", **solo las que siguen con el dueño asignado** (si alguien ya las cambió a otro, no se tocan).
- Si la reasignación le había puesto el dueño al producto y este sigue con ese dueño, se restaura el valor anterior.
- Marca el registro como deshecho (no se puede deshacer dos veces).

### 3.4 Tabla `reasignaciones_propietario` (registro / auditoría)
| Columna | Qué guarda |
|---|---|
| `id`, `created_at`, `usuario_id`, `usuario_email` | Cuándo y quién |
| `entrada_id` (sin FK a propósito), `tanda_nombre`, `marca`, `codigo`, `producto_titulo` | Qué producto (el registro sobrevive si el producto se borra) |
| `propietario_nuevo` | A quién se asignó |
| `propietario_anterior`, `propietario_producto_anterior`, `entrada_modificada` | Estado anterior del producto, para poder restaurarlo |
| `venta_ids` (`bigint[]`), `ventas_count`, `total_ars` | Qué ventas se movieron y cuánto dinero |
| `deshecho_at`, `deshecho_por` | Si se deshizo y cuándo |

Con RLS: solo se puede **leer** (admin o perfil con el permiso); escriben únicamente las funciones.

### 3.5 Variables de la pantalla
| Variable | Qué es |
|---|---|
| `entradas` | Todos los productos |
| `ventasPend` | Ventas con `propietario = 'Sin propietario'` y `entrada_id` no vacío |
| `sinVinculo` | Cantidad de ventas "Sin propietario" **sin** `entrada_id` (no se pueden mover) |
| `pendPorEntrada` | Por producto: `{ count, docenas, total, transf, cuentas }` de esas ventas |
| `ownerOf(e)` | Dueño efectivo del producto: `propietario_producto`, y si está vacío `propietario` |
| `rows` | Productos sin dueño, o con ventas pendientes |
| `seleccion` | `{ ok, omitidos, ventas, docenas, total, transf, efectivo, cuentas }` para la vista previa |
| `owners` | Usuarios (`get_app_user_colors`), para la lista de propietarios |

### 3.6 Permisos y acceso
- Sección nueva `asignar-propietario` en `src/lib/adminSections.js` (aparece en Usuarios para otorgarla), ruta protegida en `AdminLayout.jsx` y entrada de menú "Asignar Propietario".
- El administrador (`profiles.role = 'admin'`) tiene acceso a todo. A una persona contratada se le puede dar el permiso `asignar-propietario` en su perfil.
- **Importante:** la función de base valida con `auth.uid()`. Los usuarios del "login liviano" de `app_users` (sin sesión de Supabase) **no pueden ejecutarla**: la persona que gestione esto debe tener un perfil de Supabase con rol admin o con ese permiso.

---

## 4. Instalación (en este orden)

1. **Ejecutar la migración** `supabase/migrations/20261015_asignar_propietario.sql` en el editor SQL de Supabase. Solo crea objetos (tabla, dos funciones, permisos); **no modifica datos existentes**.
2. Verificar que existe: 
   ```sql
   SELECT proname FROM pg_proc WHERE proname IN ('asignar_propietario', 'deshacer_reasignacion');
   SELECT to_regclass('public.reasignaciones_propietario');
   ```
3. Entrar a `/admin/asignar-propietario` (si aparece el aviso rojo de "no se encontró el registro de reasignaciones", falta el paso 1).

---

## 5. Cómo probarlo (con un producto chico)

1. Elegir un producto sin dueño con pocas ventas (por ejemplo `GT8008`, 3 ventas, $1.270.000).
2. Seleccionarlo, elegir el propietario, tocar **Revisar y asignar** y comprobar la vista previa (3 ventas, 9 docenas, $1.270.000 y a qué cuentas entró lo transferido).
3. **Confirmar.** Debe aparecer el mensaje de éxito y el producto debe salir de la lista.
4. Comprobar:
   - **Entrega de dinero**: la hoja del dueño elegido incluye ahora esas ventas, y la de "Sin propietario" ya no.
   - **Control de Mercancía / Registrar Ventas**: el stock de GT8008 no cambió.
   - **Mercancía por propietarios**: el producto figura bajo ese dueño.
5. **Deshacer** desde "Reasignaciones recientes": las ventas vuelven a "Sin propietario" y el producto queda sin dueño (si la reasignación se lo había puesto).
6. SQL de verificación de un producto:
   ```sql
   SELECT propietario, COUNT(*), SUM(total_ars) FROM ventas
   WHERE entrada_id = '<id del producto>' GROUP BY propietario;
   ```

**Resultado esperado:** antes → todas "Sin propietario"; después de asignar → todas con el dueño elegido; después de deshacer → todas "Sin propietario" otra vez.

---

## 6. Límites y cuidados

- **Ventas sin `entrada_id`** (31 "Sin propietario" a la fecha): no se mueven. Se resuelven a mano o vinculándolas antes (ver la guía de cálculo de stock).
- **Dinero ya entregado:** no se revisó cómo se marca una entrega como hecha. Si el dinero de "Sin propietario" ya se rindió, mover ventas altera la composición de entregas pasadas. Conviene mirar la hoja de "Sin propietario" antes.
- **Dueño distinto ya asignado:** el producto se omite y se avisa. Cambiar de un dueño real a otro **no** se hace con esta pantalla (es el caso de cambio de propiedad real, que sigue pendiente de decisión).
- **La edición de tanda** (`AgregarTanda`) carga los dueños al abrirse y los vuelve a escribir al guardar: si alguien la tiene abierta mientras se asigna un dueño aquí, al guardar puede pisarlo. Asignar desde esta pantalla con las ediciones de tanda cerradas.
- **Seguridad de la base (hallazgo pendiente):** `ventas` tiene una política `ventas_all` con `for all using (true)` (migración `20260526_ventas.sql`): cualquiera con la clave pública puede **leer, modificar y borrar** ventas, salvo que se haya cambiado después. Las funciones nuevas validan permisos, pero esa política las vuelve evitables. Conviene revisar y cerrar las políticas RLS de `ventas` y `entradas`.
