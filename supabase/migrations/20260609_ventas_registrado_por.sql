-- Agrega columna para registrar qué usuario cargó la venta
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS registrado_por TEXT;
