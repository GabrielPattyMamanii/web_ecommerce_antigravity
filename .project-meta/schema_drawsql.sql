-- ============================================================
-- Esquema completo del proyecto ecommerce-web, traducido a MySQL
-- SOLO para uso visual en DrawSQL (la base real es PostgreSQL/Supabase).
-- Tipos convertidos: uuid -> CHAR(36), jsonb -> JSON,
-- timestamptz -> DATETIME, text[] -> JSON, boolean -> BOOLEAN.
-- Las relaciones marcadas "-- soft link" NO son FK reales en Postgres
-- (son coincidencias por texto: codigo, tanda_nombre, etc.), se agregan
-- aquí solo para que DrawSQL dibuje la conexión visualmente.
-- ============================================================

-- ── Catálogo ────────────────────────────────────────────────

CREATE TABLE categories (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  name       TEXT         NOT NULL,
  slug       VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  name            TEXT          NOT NULL,
  description     TEXT,
  retail_price    DECIMAL(10,2) NOT NULL,
  wholesale_price DECIMAL(10,2),
  category_id     CHAR(36),
  stock           INT           DEFAULT 0,
  images          JSON,
  sizes           JSON,
  colors          JSON,
  is_active       BOOLEAN       DEFAULT TRUE,
  is_live         BOOLEAN       DEFAULT FALSE,
  code            TEXT,
  created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE catalog_products (
  id           CHAR(36)      NOT NULL PRIMARY KEY, -- mismo id que entradas.id cuando viene de una tanda
  name         TEXT          NOT NULL,
  category_id  CHAR(36),
  brand        TEXT,
  description  TEXT,
  price        DECIMAL(10,2),
  stock        INT           DEFAULT 0,
  image_url    TEXT,
  published    BOOLEAN       DEFAULT TRUE,
  is_live      BOOLEAN       DEFAULT FALSE,
  code         TEXT,
  created_at   DATETIME      DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_catalog_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE site_config (
  id                       CHAR(36)      NOT NULL PRIMARY KEY,
  contact_email            TEXT,
  contact_phone            TEXT,
  whatsapp_number          TEXT,
  address                  TEXT,
  social_links             JSON,
  sena_enabled             BOOLEAN       DEFAULT TRUE,
  sena_type                TEXT          DEFAULT 'fixed',
  sena_amount              DECIMAL(10,2) DEFAULT 0,
  sena_percentage          DECIMAL(5,2)  DEFAULT 10,
  sena_delivery_locations  JSON,
  live_products_enabled    BOOLEAN       DEFAULT TRUE,
  live_button_enabled      BOOLEAN       DEFAULT TRUE
);

-- ── Inventario (tandas / entradas de mercancía) ─────────────

CREATE TABLE tandas (
  id         CHAR(36) NOT NULL PRIMARY KEY,
  nombre     TEXT     NOT NULL,
  fecha      DATE,
  parametros JSON
);

CREATE TABLE entradas (
  id                   CHAR(36)      NOT NULL PRIMARY KEY,
  tanda_nombre         TEXT, -- soft link a tandas.nombre (sin FK real)
  tanda_fecha          DATE,
  marca                TEXT,
  marca_id             TEXT,
  producto_titulo      TEXT,
  cantidad_docenas     DECIMAL(10,2),
  cant_docenas_copy    DECIMAL(10,2), -- copia independiente para catálogo/scanner
  precio_docena        DECIMAL(10,2),
  bultos               DECIMAL(10,2),
  propietario          TEXT,
  propietario_producto TEXT,
  codigo               TEXT,
  observaciones        TEXT,
  codigo_boleta        TEXT,
  gastos               DECIMAL(10,2),
  fotos                JSON,
  created_at           DATETIME      DEFAULT CURRENT_TIMESTAMP
);

-- ── Ventas (registro diario vía QR) ─────────────────────────

CREATE TABLE cuentas_bancarias (
  id            CHAR(36) NOT NULL PRIMARY KEY,
  nombre        TEXT     NOT NULL,
  titular       TEXT     NOT NULL,
  propietario   TEXT,
  activa        BOOLEAN  NOT NULL DEFAULT TRUE,
  reiniciado_at DATETIME,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ventas (
  id                   BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  venta_id             CHAR(36)      NOT NULL, -- agrupa productos de un mismo pedido
  fecha                DATE          NOT NULL DEFAULT (CURRENT_DATE),
  producto_titulo      TEXT          NOT NULL,
  codigo               TEXT          NOT NULL, -- soft link a entradas.codigo
  marca                TEXT,
  propietario          TEXT,
  tanda_nombre         TEXT,         -- soft link a tandas.nombre
  cantidad_docenas     DECIMAL(10,2) NOT NULL,
  precio_docena_ars    DECIMAL(10,2) NOT NULL,
  total_ars            DECIMAL(10,2) NOT NULL,
  dolar_blue           DECIMAL(10,2) NOT NULL,
  metodo_pago          TEXT          NOT NULL DEFAULT 'efectivo',
  monto_efectivo       DECIMAL(10,2),
  monto_transferencia  DECIMAL(10,2),
  cuenta_id            CHAR(36),
  cuenta_nombre        TEXT,
  nombre_pedido        TEXT,
  registrado_por       TEXT,         -- soft link a app_users.username
  metodo_registro      TEXT          DEFAULT 'scanner',
  created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ventas_cuenta FOREIGN KEY (cuenta_id) REFERENCES cuentas_bancarias(id)
);

CREATE TABLE user_productos_comprados (
  id           CHAR(36)      NOT NULL PRIMARY KEY,
  user_id      CHAR(36)      NOT NULL,
  tanda_nombre TEXT          NOT NULL,
  nombre       TEXT          NOT NULL,
  marca        TEXT          NOT NULL,
  codigo       TEXT          NOT NULL,
  cant_docenas DECIMAL(10,2) NOT NULL,
  costo_docena DECIMAL(10,2) NOT NULL,
  comentarios  TEXT,
  imagen_url   TEXT,
  created_at   DATETIME      DEFAULT CURRENT_TIMESTAMP
);

-- ── Sistema de señas (carrito + pago parcial) ───────────────

CREATE TABLE sena_price_ranges (
  id         CHAR(36)      NOT NULL PRIMARY KEY,
  min_qty    INT           NOT NULL,
  max_qty    INT,
  amount     DECIMAL(10,2) NOT NULL,
  sort_order INT           NOT NULL DEFAULT 0,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sena_carritos (
  id                CHAR(36)      NOT NULL PRIMARY KEY,
  buyer_name        TEXT          NOT NULL,
  buyer_lastname    TEXT,
  buyer_email       TEXT          NOT NULL,
  buyer_whatsapp    TEXT,
  delivery_location TEXT,
  amount_paid       DECIMAL(10,2) NOT NULL,
  mp_preference_id  TEXT,
  mp_payment_id     TEXT,
  status            TEXT          NOT NULL DEFAULT 'pending', -- pending|approved|rejected|cancelled|delivered
  notes             TEXT,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sena_items (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  sena_carrito_id CHAR(36)      NOT NULL,
  product_id      TEXT          NOT NULL, -- soft link a products.id o catalog_products.id (ver product_source)
  product_source  TEXT          NOT NULL DEFAULT 'products', -- 'products' | 'catalog_products'
  product_name    TEXT          NOT NULL,
  product_image   TEXT,
  product_price   DECIMAL(10,2),
  quantity        INT           NOT NULL DEFAULT 1,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sena_items_carrito FOREIGN KEY (sena_carrito_id) REFERENCES sena_carritos(id)
);

-- ── Usuarios / permisos ──────────────────────────────────────

-- profiles: vinculada 1 a 1 con auth.users de Supabase (tabla interna,
-- no versionada en migraciones propias). Se representa aquí como
-- entidad independiente para el diagrama.
CREATE TABLE profiles (
  id           CHAR(36) NOT NULL PRIMARY KEY, -- = auth.users.id (Supabase Auth)
  role         TEXT,                          -- 'admin' | otros
  display_name TEXT,
  email        TEXT,
  permissions  JSON
);

-- app_users: usuarios "staff" con login propio (no Supabase Auth),
-- usados en /admin/usuarios y para registrar ventas.
CREATE TABLE app_users (
  id          CHAR(36) NOT NULL PRIMARY KEY,
  username    TEXT     NOT NULL,
  email       TEXT,
  password    TEXT     NOT NULL, -- hash bcrypt
  permissions JSON,
  color       TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Relaciones diferidas (tablas referenciadas se crean más abajo) ──

ALTER TABLE catalog_products
  ADD CONSTRAINT fk_catalog_products_entrada
  FOREIGN KEY (id) REFERENCES entradas(id); -- soft link: mismo id, no es FK real en Postgres

ALTER TABLE user_productos_comprados
  ADD CONSTRAINT fk_upc_user
  FOREIGN KEY (user_id) REFERENCES app_users(id);
