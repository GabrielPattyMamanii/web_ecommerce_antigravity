# Pendientes de stock y ventas (contexto para continuar en otro chat)

**Fecha del análisis:** 2026-10-14
**Proyecto:** `ecommerce-web` (React + Vite + Supabase). Proyecto hermano: `ecommerce-mobile` (Expo / React Native, app Android del panel admin, mismo Supabase).
**Idioma de trabajo con la persona usuaria:** español. Es estudiante de base de datos: valora explicaciones didácticas (qué es cada cosa y por qué), no solo el cambio de código.

Este archivo resume todo lo investigado y decidido para que un chat nuevo pueda continuar sin que haya que ponerlo al día. Léelo completo antes de tocar código.

---

## 1. Reglas de trabajo acordadas con la persona usuaria

- **No implementar nada hasta que lo confirme.** El patrón fue: analizar, explicar, proponer, esperar el "aplícalo".
- **Un problema a la vez.** Si pide centrarse en uno, no mezclar los demás.
- **La app móvil (`ecommerce-mobile`) está fuera de alcance por ahora**, dicho explícitamente. No proponer cambios ahí salvo que lo pida.
- Le gustan los diagramas de **Excalidraw** (archivos `.excalidraw` en esta carpeta `problemas/`), con nombre en mayúsculas cuando lo pide. Hay versiones abstractas ("qué hace cada cosa") y técnicas (variables, archivos, líneas).
- Cuando algo se dedujo leyendo código y no se probó en la aplicación, decirlo.

---

## 2. Modelo de datos relevante

### Tabla `entradas` (un producto de una tanda)
| Columna | Qué es |
|---|---|
| `id` (uuid) | Identificador único del producto |
| `tanda_nombre` | Nombre de la tanda (texto, no hay FK a otra tabla) |
| `codigo` | Código del producto. **No es único** (puede repetirse) |
| `propietario` | Dueño global de la marca/boleta. Puede ser vacío |
| `propietario_producto` | Dueño específico del producto (pisa a `propietario`). Puede ser vacío |
| `cantidad_docenas` | Stock **original** de la boleta. Solo cambia si se edita la tanda |
| `cant_docenas_copy` | Stock **actual**. Baja con ventas (trigger), con el escáner QR y se pisa al editar la tanda |
| `precio_docena` | Precio por docena |

### Tabla `ventas` (una fila por ítem vendido)
Columnas usadas: `id` (autoincremental propio), `venta_id`, `codigo`, `tanda_nombre`, `propietario` (copia del dueño **al momento de vender**; `'Sin propietario'` si no había), `cantidad_docenas`, `precio_docena_ars`, `total_ars`, `cuenta_id`, `cuenta_nombre`, y **`entrada_id`** (uuid, FK a `entradas.id`, `ON DELETE SET NULL`, puede ser NULL).

### Migraciones clave
- `supabase/migrations/20260927_ventas_descuenta_cant_docenas_copy.sql`: agrega `ventas.entrada_id` y 3 triggers sobre `ventas` (INSERT resta, UPDATE ajusta diferencia, DELETE devuelve) que modifican `entradas.cant_docenas_copy`. Las ventas con `entrada_id` NULL se ignoran. **No hace backfill de ventas viejas a propósito.**
- `supabase/migrations/20260927_sync_catalog_product_stock.sql`: trigger que copia `entradas.cant_docenas_copy` a `catalog_products.stock` (lo que ve la tienda pública).
- La RPC `restar_cant_docenas_copy(entrada_id, cantidad)` la usa el escáner QR.

**Estado de aplicación:** la persona usuaria confirmó que las ventas recientes de la web traen `entrada_id` y que el stock baja aunque el producto no tenga propietario. Es decir, **la migración está aplicada**. Lo que baja es `cant_docenas_copy`; `cantidad_docenas` nunca cambia por ventas.

### Cómo se registra una venta hoy (web)
`src/pages/admin/VentasScanner.jsx`: el carrito guarda `entrada_id: selectedEntrada.id` (línea ~631) y `propietario = getPropietario(entrada) || 'Sin propietario'` (línea ~621). `confirmSale` (línea ~674) hace un único `insert` en `ventas`; el trigger hace el descuento.

---

## 3. Lo que YA se resolvió: problema A (descuento doble en Control de Mercancía)

**Archivo modificado:** `src/pages/admin/ControlMercanciaTanda.jsx` (ruta `/admin/control-mercancia/:tanda`). Compila (`vite build` OK). **No fue probado en navegador con datos reales.**

**Qué fallaba:** la pantalla calculaba `disponible = cant_docenas_copy − vendido`, pero `cant_docenas_copy` ya traía las ventas restadas por el trigger, así que se descontaban dos veces. Además `vendido` se calculaba cruzando por texto `codigo + '_' + propietario`, que falla (ver problema 8 abajo).

**Cómo quedó:**
- **Doc. Control** = `cantidad_docenas` (original de la boleta, solo se muestra).
- **vend.** = suma de `ventas` por `entrada_id`. Respaldo por texto `codigo + propietario` solo para ventas con `entrada_id` NULL, tratando `'Sin propietario'` como vacío. Si esa clave coincide con más de un producto, no se asigna y se muestra "Ventas ambiguas".
- **disp.** = `cantidad_docenas − vend.`, nunca menor a 0. Si lo vendido supera al original: etiqueta "Sobrevendido".
- **Alerta de descuadre:** si `cantidad_docenas − vend.` ≠ `cant_docenas_copy`, aparece un aviso en la fila.
- La consulta de ventas ahora filtra solo por `tanda_nombre`.
- **Efecto colateral:** en esta pantalla, subtotales, "Valor Control Estimado" y totales de marca usan `cantidad_docenas` (ya no bajan al vender).
- No se tocó la base de datos.

---

## 4. Problemas pendientes (ordenados por prioridad sugerida)

### 1. Registrar Ventas no calcula el stock cuando el producto no tiene propietario
- **Dónde:** `src/pages/admin/VentasScanner.jsx` líneas ~245-279.
- **Qué pasa:** el stock mostrado es `cantidad_docenas − SUM(ventas)`, pero la consulta de ventas solo se ejecuta `if (entrada.codigo && propietarioKey)`. Sin propietario, `vendido` queda fijo en 0 y el disponible nunca baja. Con propietario, el cruce es por `codigo + propietario + tanda` (texto).
- **Impacto:** la caja no avisa si se vende de más un producto sin dueño; con dueño puede fallar por los casos de texto del problema 8.
- **Solución sugerida:** sumar las ventas por `entrada_id` (igual que en Control), usando el texto solo como respaldo. Riesgo bajo.

### 2. Otros listados siguen sumando `cant_docenas_copy` como "valor de la boleta"
- **Dónde:** `ControlMercancia.jsx` (línea ~52), `BoletasCargadas.jsx` (~51), `BoletasTanda.jsx` (~235-323).
- **Qué pasa:** estos totales bajan con cada venta (por el trigger), mientras Control de la tanda ahora muestra el valor fijo de la boleta. La misma tanda muestra dos números distintos.
- **Decisión pendiente de la persona usuaria:** ¿esos totales deben ser "valor de la boleta" (usar `cantidad_docenas`) o "stock actual" (`cant_docenas_copy`)?
- **Riesgo:** medio (cambia qué significan esos totales).

### 3. Editar una tanda pisa lo descontado (problema F)
- **Dónde:** `src/components/mercancia/AgregarTanda.jsx` líneas ~456-472. Misma lógica replicada en `ecommerce-men/src/lib/inventarioUtils.js` (~127-132).
- **Qué pasa:** si `cantidad_docenas` cambia, hace `cant_docenas_copy = cantidad nueva`, perdiendo todo lo descontado por ventas. El SELECT previo (línea ~441) ni siquiera trae `cant_docenas_copy`.
- **Impacto:** es el único problema que **modifica datos reales** (incluido el stock del catálogo) sin avisar.
- **Solución sugerida:** traer `cant_docenas_copy` en el SELECT y aplicar solo la diferencia: `copy = max(0, copy_actual + (cantidad_nueva − cantidad_vieja))`. Ejemplo: original 10, copy 7 (se vendieron 3), se edita a 12 → copy 9. Riesgo bajo/medio.

### 4. No se valida el stock al vender (problema D)
- Nada impide vender más de lo disponible; `cant_docenas_copy` puede quedar negativo. Hoy Control solo lo muestra "Sobrevendido" después de vender.
- **Solución sugerida:** `CHECK (cant_docenas_copy >= 0) NOT VALID` en `entradas` (si el trigger lo viola, falla todo el INSERT, atomicidad) y validar en `VentasScanner.jsx` (~277) usando `cant_docenas_copy`. Capturar el error en `confirmSale`. Riesgo medio: puede frenar la caja si el stock cargado está mal.

### 5. El escáner QR resta por otra vía (problema E)
- **Dónde:** `src/pages/scan/ProductScan.jsx` (~126), RPC `restar_cant_docenas_copy`.
- **Qué pasa:** baja `cant_docenas_copy` sin registrar venta. Si se usa junto con registrar la venta, se descuenta dos veces. Genera descuadre (Control no lo ve en `vend.`).
- **Opciones:** (1) escáner solo lectura, (2) columna separada `cant_docenas_fisica` para el conteo físico, (3) que el escáner cree una fila en `ventas`. **Requiere decisión operativa de la persona usuaria.** Riesgo medio.

### 6. Ventas históricas sin `entrada_id` (problema C)
- Las anteriores a la migración no están reflejadas en `cant_docenas_copy`. En Control se cuentan por el respaldo de texto y aparecen como descuadre.
- **Solución sugerida:** backfill solo donde la coincidencia (`codigo + tanda + propietario`) sea única, con vista previa en solo lectura.
- **Cuidado:** el trigger de UPDATE ya descuenta cuando `entrada_id` pasa de NULL a un valor. Si no se quiere descontar, deshabilitar `trg_ventas_reajusta_stock` durante el backfill. Hacer backup antes (carpeta `backups/`). Riesgo alto si se automatiza.

### 7. La app móvil no manda `entrada_id` (problema B) — EN PAUSA por pedido explícito
- `ecommerce-mobile/stores/cartStore.ts` (~70-78) y `hooks/useVentasHistorial.ts` (~138) insertan en `ventas` sin `entrada_id`; los triggers las ignoran y no descuentan stock. No trabajar en esto salvo que lo pida.

### 8. Cambiar el propietario de un producto en la edición de tandas (recién detectado, sin resolver)
- **Qué pasa:** `AgregarTanda.jsx` solo escribe en `entradas`, no actualiza `ventas`. Las ventas ya hechas conservan el dueño viejo en `ventas.propietario`.
- **Qué se desordena:**
  - **Entrega de dinero** (`EntregaDineroTanda.jsx` ~623 filtra `.eq('propietario', propietario)`), **Historial de ventas** (acumulados) y **Cuentas bancarias** agrupan por `ventas.propietario`: el dinero queda repartido entre dueño viejo y nuevo.
  - **Mercancía por propietarios** lee `entradas.propietario`, así que no coincide con lo que se rinde a cada dueño.
  - **Registrar Ventas** (cruce por texto) deja de contar las ventas anteriores, y el stock mostrado sube de forma incorrecta (se resuelve con el problema 1).
  - **Control de Mercancía** ya no se ve afectado (usa `entrada_id`).
- **Decisión pendiente de la persona usuaria (pregunta abierta):** ¿el cambio de dueño suele ser la **corrección de un error de carga** (las ventas anteriores deberían pasar al dueño nuevo) o un **cambio real de propiedad** (lo vendido antes le corresponde al dueño anterior)? El sistema hoy no distingue los dos casos. Una opción es preguntar al guardar si las ventas anteriores también pasan al dueño nuevo.
- Deducido leyendo el código, no probado en la aplicación.

### Causa de fondo repetida: el cruce por texto `codigo + '_' + propietario`
Aparece en los problemas 1, 6 y 8. Falla porque:
- Producto sin dueño: `entradas` lo deja vacío, `ventas` guarda `'Sin propietario'`.
- Espacios de más (`'Juan '`) en un lado y no en el otro (Control recorta con `trim()`, Registrar Ventas guarda sin recortar).
- El dueño cambia después de vender.
- Dos productos con mismo código y dueño en la misma tanda se reparten la misma venta.
La solución estructural es unir por `entrada_id` y dejar el texto solo como respaldo.

---

## 5. Orden sugerido

1. Problema 1 (Registrar Ventas sin propietario): misma raíz que lo ya resuelto, riesgo bajo.
2. Problema 3 (AgregarTanda pisa el descuento): el único que daña datos reales.
3. Decidir el problema 8 y el 2 (dependen de respuestas de la persona usuaria).
4. Problemas 4, 5 y 6.
5. Problema 7 (móvil) solo si se retoma.

---

## 6. Otros archivos de esta carpeta

- `bugs_control_mercancia.md`: primer análisis (problema 1 original). Quedó parcialmente desactualizado: el punto A ya está resuelto.
- Diagramas Excalidraw: `guia_inicio_mercancia_ventas.excalidraw` (guía abstracta), `control_mercancia_problemas_y_soluciones.excalidraw` (problemas A-F, abstracto), `control_mercancia_tecnico.excalidraw` (versión técnica), `control_mercancia_diagrama.excalidraw`, `PUNTOS_FLOJOS_PROPUESTA_DISPONIBLE.excalidraw` y `PROBLEMA_A_DESCUENTO_DOBLE_Y_PROPIETARIO.excalidraw` (problema A, solución y simulación).

## 7. Consulta útil para verificar consistencia

Debe devolver 0 filas cuando todo esté sincronizado (no aplica a productos donde también se usó el escáner QR):

```sql
SELECT e.id, e.codigo, e.cantidad_docenas, e.cant_docenas_copy,
       e.cantidad_docenas - COALESCE(SUM(v.cantidad_docenas), 0) AS esperado
FROM entradas e LEFT JOIN ventas v ON v.entrada_id = e.id
GROUP BY e.id
HAVING e.cant_docenas_copy IS DISTINCT FROM
       e.cantidad_docenas - COALESCE(SUM(v.cantidad_docenas), 0);
```
