-- Columna para distinguir si la venta se registró vía scanner QR o búsqueda manual.
-- Default 'scanner' porque es el flujo principal; solo la búsqueda manual setea 'manual'.
alter table ventas add column if not exists metodo_registro text default 'scanner';
