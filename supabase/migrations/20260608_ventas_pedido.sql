-- Agrupa los productos de una misma venta bajo un identificador de pedido (venta_id),
-- y permite ponerle un nombre opcional (nombre_pedido).
alter table ventas add column if not exists venta_id uuid;
alter table ventas add column if not exists nombre_pedido text;

create index if not exists ventas_venta_id_idx on ventas(venta_id);

-- Backfill: los registros ya cargados se insertaban en un solo lote por carrito,
-- por lo que comparten el mismo created_at exacto (now() = inicio de la transacción).
-- Agrupamos por (fecha, created_at) y le asignamos un venta_id común a cada grupo.
update ventas v
set venta_id = g.venta_id
from (
    select fecha, created_at, gen_random_uuid() as venta_id
    from ventas
    where venta_id is null
    group by fecha, created_at
) g
where v.fecha = g.fecha
  and v.created_at = g.created_at
  and v.venta_id is null;

alter table ventas alter column venta_id set not null;
