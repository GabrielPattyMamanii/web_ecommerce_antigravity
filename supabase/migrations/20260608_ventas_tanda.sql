-- Guarda a qué tanda pertenecía el producto al momento de la venta,
-- para poder mostrarlo en el historial de ventas.
alter table ventas add column if not exists tanda_nombre text;
