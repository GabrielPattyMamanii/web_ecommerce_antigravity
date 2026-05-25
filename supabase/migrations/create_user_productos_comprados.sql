-- =====================================================
-- Tabla: user_productos_comprados
-- Descripción: Almacena los productos comprados por 
--              cada usuario agrupados por tanda
-- =====================================================

CREATE TABLE IF NOT EXISTS user_productos_comprados (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    tanda_nombre TEXT NOT NULL,
    nombre       TEXT NOT NULL,              -- Nombre del producto
    marca        TEXT NOT NULL,              -- Marca del producto
    codigo       TEXT NOT NULL,              -- Código del producto
    cant_docenas NUMERIC(10, 2) NOT NULL,    -- Cantidad de docenas
    costo_docena NUMERIC(10, 2) NOT NULL,    -- Costo por docena
    comentarios  TEXT,                       -- Comentarios opcionales
    imagen_url   TEXT,                       -- URL de imagen en Storage
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_upc_user_id      ON user_productos_comprados(user_id);
CREATE INDEX IF NOT EXISTS idx_upc_tanda_nombre ON user_productos_comprados(tanda_nombre);
CREATE INDEX IF NOT EXISTS idx_upc_user_tanda   ON user_productos_comprados(user_id, tanda_nombre);

-- RLS: habilitar Row Level Security (opcional, según tu configuración)
-- ALTER TABLE user_productos_comprados ENABLE ROW LEVEL SECURITY;
