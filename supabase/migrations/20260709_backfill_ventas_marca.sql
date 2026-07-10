-- Backfill: ventas.marca quedó null en filas insertadas/editadas por el flujo
-- "agregar/editar producto en pedido" del historial de ventas (bug corregido
-- en VentasHistorial.jsx: EditVentaInline no propagaba entrada.marca al guardar).
-- Completa la marca real cruzando por código + tanda + propietario contra entradas.

-- 1) Verificación previa: detectar cruces ambiguos (mismo codigo+tanda_nombre+propietario
--    con más de una marca distinta en entradas). Si esta consulta devuelve filas, revisarlas
--    a mano antes de correr el UPDATE, porque para esos casos el cruce no es determinístico.
select
    codigo,
    tanda_nombre,
    coalesce(propietario_producto, propietario) as propietario,
    count(distinct marca) as marcas_distintas
from entradas
where marca is not null
group by 1, 2, 3
having count(distinct marca) > 1;

-- 2) Backfill: solo toca filas de ventas con marca null, cruzando por código + tanda + propietario.
update ventas v
set marca = e.marca
from entradas e
where v.marca is null
  and v.codigo = e.codigo
  and v.tanda_nombre = e.tanda_nombre
  and coalesce(e.propietario_producto, e.propietario) = v.propietario
  and e.marca is not null;
