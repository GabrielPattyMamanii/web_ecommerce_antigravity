# Resumen: seguridad de la base de datos

Fecha: 2026-10-26. Relacionado: `TAREA_CERRAR_ACCESO_PUBLICO_VENTAS.md`.

## La situación hoy
La tienda y el panel se conectan a Supabase con una **llave pública** (anon key) que viaja dentro de la página web. Cualquiera puede copiarla con las herramientas del navegador, y eso es normal: no se puede esconder. Lo que importa es **qué permiten hacer las reglas de la base a quien tenga esa llave**. Hoy permiten demasiado en varias tablas.

### Qué puede ver hoy alguien con esa llave (comprobado en solo lectura)
| Tabla | Filas legibles | Qué expone |
|---|---|---|
| `ventas` | 1.135 | Fechas, precios, totales, método de pago, cuenta bancaria, quién vendió. El costo (`costo_docena_usd`) ya está oculto. |
| `entradas` | 380 | Precio de compra, gastos y bultos reales (permite calcular el margen). |
| `old_entradas` | 190 | Lo mismo, de tandas viejas. |
| `posibles_compras` | 16 | Compras planeadas, con costos y gastos de importación. |
| `cuentas_bancarias` | 7 | Nombres de titulares y cuentas (`mp_account_key` vacío). |
| `profiles` | 3 | Correos y roles (se sabe quién es el administrador). |
| `precios_custom` | 196 | Precios personalizados. |

Ya protegidas (devuelven 0 filas): `tandas`, `tanda_settings`, `app_users`, `reasignaciones_propietario`, `user_boletas`, `user_productos_comprados`, `sena_carritos`, `sena_items`, `debts`, `debt_evidence`.

La clave de control total (`service_role`) no está en el repo ni en el historial de git. Las escrituras con la llave pública no se probaron.

## Problemas posibles si no se hace nada
1. **Filtración de información del negocio:** un competidor o curioso ve costos y márgenes. Es el riesgo más probable.
2. **Modificar o borrar ventas:** la regla `ventas_all` lo permite. Los triggers moverían el stock (descuenta al insertar, reajusta al editar cantidad/entrada, devuelve al borrar) y los números dejarían de cuadrar.
3. **Ventas falsas:** ensucian la ganancia y el stock.
4. **Engaños por mail al administrador**, porque su correo es visible.

No hay evidencia de abuso, pero tampoco se pudo medir: faltan los logs de Supabase. Los datos revisados se ven coherentes.

## Solución propuesta (Proyecto E, por etapas)
1. Cerrar las tablas sensibles al público sin sesión.
2. Crear consultas protegidas (RPC) para lo que hacen los logins ligeros: registrar ventas, ver historial, etc., verificando quién es el usuario.
3. Dar a los logins ligeros solo lo necesario (precio sugerido, sin costo ni margen).
4. Ir por etapas: primero editar/borrar, luego leer, luego insertar. Backup antes de cada etapa y prueba con cada tipo de usuario.

Rollback de cada etapa, una línea: `create policy "ventas_all" on ventas for all using (true);` y `GRANT SELECT ON public.ventas TO anon, authenticated;`.

## A quién afecta
| Usuario | Hoy | Si no se hace nada | Con la solución |
|---|---|---|---|
| **Administrador** (sesión Supabase) | Funciona todo | Igual, pero sus datos siguen abiertos a terceros | Sin cambios |
| **Staff** (2, con sesión, no admin) | Funciona | Igual | Hay que decidir qué permisos conservan |
| **Login liviano** (Luis, Rosa, Gabriel y un cuarto; `app_users`, sin sesión Supabase) | Funciona | Funciona, pero comparten la exposición | **Hay que migrar sus pantallas antes de cerrar.** Si se cierra sin migrar: no pueden vender, el producto "no se encuentra" y las pantallas quedan vacías sin error |
| **Visitantes de la tienda** | Ven productos, categorías, cupones | Sin cambios | **Sin cambios** (usan tablas públicas por diseño) |

Lo que no cambia en ningún caso: triggers, RPC SECURITY DEFINER y edge functions (usan `service_role` vía `Deno.env`).

## Recomendaciones inmediatas (no urgentes)
1. Backups regulares con `backup-db.ps1`, y probar que se puedan restaurar.
2. Revisar los logs de Supabase para ver si hubo borrados o cambios desde fuera de la web.
3. Cerrar lo que no afecta a nadie (p. ej. `posibles_compras`, si los logins ligeros no la usan).
4. Dejar el proyecto grande para cuando haya tiempo, empezando por un inventario de qué pantalla usa cada tabla (no modifica nada).

## Preguntas abiertas
- ¿Luis, Rosa y Gabriel usan Posibles Compras?
- ¿Los 2 "staff" venden o ven ventas?
- ¿Se acepta un código secreto de sesión para el login liviano?
