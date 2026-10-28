# Tarea pendiente: cerrar el acceso público a la tabla `ventas`

> Documento para retomar más adelante. Estado a 2026-10-24. Es una tarea APARTE del dashboard de
> ventas y ganancia: hacerla con cuidado, porque un cierre mal hecho puede impedir registrar ventas.
> Nunca mostrar claves del `.env`.

> Actualización 2026-10-27: la columna `costo_docena_usd` se oculta aparte con `supabase/migrations/20261027_ventas_ocultar_costo_docena_usd.sql` (no requiere cerrar el resto de la tabla). Esta tarea sigue pendiente para precios, totales, dólar y datos de pago.

## Qué pasa hoy

La tabla `ventas` tiene RLS activado pero con una política que permite todo a cualquiera:

```sql
create policy "ventas_all" on ventas for all using (true);   -- supabase/migrations/20260526_ventas.sql
```

Comprobado el 2026-10-24 (solo lectura): usando únicamente la clave pública del front
(`VITE_SUPABASE_ANON_KEY`, que cualquiera puede ver en el código de la web), una petición GET a
`/rest/v1/ventas` devolvió datos: 1.131 filas, con precio, total cobrado, dólar, quién registró la
venta, método de pago y cuenta bancaria. Con esa misma política, esa clave también podría **modificar o
borrar** ventas (no se probó la escritura).

No se confirmó que la política siga exactamente así en producción (puede haberse cambiado desde el
panel de Supabase), pero el comportamiento observado coincide con `using (true)`.

## Por qué importa

- Expone la facturación y los datos de pago a cualquiera que conozca la URL del proyecto.
- El nuevo dashboard muestra costos y ganancia. Su RPC (`get_dashboard_ventas`) ya es solo para admin,
  pero los costos guardados (`ventas.costo_docena_usd`) y los precios seguirían leíbles por esta vía.
- Alguien podría borrar o alterar ventas (y, por los triggers, mover el stock de `entradas`).

## Por qué NO se puede cerrar con un solo cambio

Quien escribe y lee `ventas` desde la app no es solo el admin:

- Hay usuarios de **login liviano** (`app_users`) que registran ventas desde `VentasScanner.jsx` y ven el
  historial en `VentasHistorial.jsx`. No tienen sesión de Supabase (`auth.uid()` es NULL), así que las
  políticas basadas en `auth.uid()` o en `profiles.role = 'admin'` los dejarían sin acceso.
- Personal con permisos parciales (`profiles.permissions`), que no es admin.
- Otras pantallas que consultan `ventas`: `EntregaDinero.jsx`, `EntregaDineroTanda.jsx`,
  `CuentasBancarias.jsx`, `ControlMercanciaTanda.jsx`, `AsignarPropietario.jsx`, `Usuarios.jsx`,
  `src/lib/stockVentas.js`.
- Triggers de stock (`trg_ventas_*`, `SECURITY DEFINER`) que actúan sobre `entradas` al insertar,
  editar o borrar ventas: seguirían funcionando, pero hay que probarlos.

Si se reemplaza la política por una de "solo admin", **los usuarios de login liviano dejan de poder
vender y ver ventas**. Hay que dar acceso alternativo antes de cerrar.

## Enfoque propuesto

1. **Inventario.** Listar todas las lecturas y escrituras sobre `ventas` (búsqueda de `from('ventas')` en
   `src/`), con qué rol las hace cada pantalla.
2. **RPCs `SECURITY DEFINER`** para cada operación que hacen los usuarios de login liviano (registrar
   ventas, listar historial, editar, borrar), que validen el permiso del usuario:
   - sesión de Supabase: `public.is_admin()` o permisos en `profiles.permissions`;
   - sin sesión: `app_user_id` válido con el permiso de la sección (como hace
     `get_bultos_personalizados` y `get_app_user_permissions`).
   Cuidar que no se pueda pasar el id de otro usuario para escalar permisos.
3. **Cambiar el front** para que esas pantallas usen las RPCs en vez de `supabase.from('ventas')`.
4. **Reemplazar la política** `ventas_all` por una que solo permita a admin (y a los roles que correspondan)
   leer/escribir directo la tabla.
5. **Probar** con cada tipo de usuario (admin, personal con permisos parciales, login liviano):
   registrar una venta, editarla, borrarla, ver el historial, entrega de dinero, cuentas bancarias.
6. **Plan de vuelta atrás:** guardar el SQL de la política anterior para restaurarla de inmediato si algo
   deja de funcionar:
   ```sql
   create policy "ventas_all" on ventas for all using (true);
   ```
7. Hacer un **backup** (`backup-db.ps1`) antes del cambio y aplicarlo fuera del horario de ventas.

## Revisar también

- Qué otras tablas se pueden leer con la clave pública (`entradas`, `cuentas_bancarias`, `app_users` ya
  está restringida, etc.). Esta tarea solo investigó `ventas`; `tandas` y `tanda_settings` ya devuelven 0
  filas con la clave pública.
- Que ninguna política nueva deje pasar a un `app_user` a datos de otros usuarios.

## Cómo comprobar que quedó cerrado

Con la clave pública y sin sesión, una petición GET a `/rest/v1/ventas?select=id&limit=1` debe devolver
una lista vacía o un error de permiso, y a la vez la app debe seguir funcionando para cada tipo de usuario.
