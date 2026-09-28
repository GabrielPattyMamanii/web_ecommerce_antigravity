-- ============================================================
-- Subconjunto de tablas: flujo "Registrar Ventas" (VentasScanner.jsx)
-- y cómo (no) se descuenta el stock de "entradas".
-- SOLO para uso visual en DrawSQL. Tipos convertidos a MySQL:
-- uuid -> CHAR(36), timestamptz -> DATETIME.
-- ============================================================

CREATE TABLE tandas (
  id         CHAR(36) NOT NULL PRIMARY KEY,
  nombre     TEXT     NOT NULL,
  fecha      DATE,
  parametros JSON
);

CREATE TABLE entradas (
  id                   CHAR(36)      NOT NULL PRIMARY KEY,
  tanda_nombre         TEXT, -- soft link a tandas.nombre
  producto_titulo      TEXT,
  cantidad_docenas     DECIMAL(10,2), -- "stock original" de la entrada (nunca se decrementa)
  cant_docenas_copy    DECIMAL(10,2), -- stock aparte, solo lo descuenta ProductScan.jsx (RPC), NO esta pantalla
  precio_docena        DECIMAL(10,2),
  propietario          TEXT,          -- dueño global de la boleta/marca -- PUEDE quedar NULL
  propietario_producto TEXT,          -- override de dueño por producto  -- PUEDE quedar NULL
  codigo               VARCHAR(255),  -- en la realidad NO es único (varios dueños pueden compartir código);
                                       -- se declara como índice único acá solo para que DrawSQL pueda
                                       -- dibujar la relación ilustrativa de abajo.
  created_at           DATETIME      DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_entradas_codigo_ilustrativo (codigo)
);

CREATE TABLE cuentas_bancarias (
  id          CHAR(36) NOT NULL PRIMARY KEY,
  nombre      TEXT     NOT NULL,
  titular     TEXT     NOT NULL,
  propietario TEXT,
  activa      BOOLEAN  NOT NULL DEFAULT TRUE
);

CREATE TABLE app_users (
  id       CHAR(36) NOT NULL PRIMARY KEY,
  username TEXT     NOT NULL,
  color    TEXT
);

-- ── La tabla clave del problema ──────────────────────────────
CREATE TABLE ventas (
  id                BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  venta_id          CHAR(36)      NOT NULL,
  fecha             DATE          NOT NULL,
  codigo            VARCHAR(255)  NOT NULL, -- soft link a entradas.codigo
  tanda_nombre      TEXT,                   -- soft link a entradas.tanda_nombre
  propietario       TEXT          NOT NULL, -- soft link a entradas.propietario/_producto
                                             -- NUNCA es NULL en esta tabla: si la entrada no
                                             -- tenía dueño, acá se guarda el string literal
                                             -- 'Sin propietario' (ver VentasScanner.jsx:621)
  cantidad_docenas  DECIMAL(10,2) NOT NULL,
  precio_docena_ars DECIMAL(10,2) NOT NULL,
  total_ars         DECIMAL(10,2) NOT NULL,
  metodo_pago       TEXT          NOT NULL DEFAULT 'efectivo',
  cuenta_id         CHAR(36),
  registrado_por    TEXT,                   -- soft link a app_users.username
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ventas_cuenta FOREIGN KEY (cuenta_id) REFERENCES cuentas_bancarias(id)
);

-- ── EL BUG, representado como relación ──────────────────────
-- El "stock disponible" que muestra VentasScanner.jsx se calcula así:
--   entradas.cantidad_docenas - SUM(ventas.cantidad_docenas)
--   WHERE ventas.codigo = entradas.codigo
--     AND ventas.propietario = entradas.propietario_producto ?? entradas.propietario
--
-- Esa comparación SOLO se ejecuta si propietario_producto/propietario
-- de la entrada NO es null. Si ambos son null, la consulta ni se hace
-- y "vendido" queda hardcodeado en 0 -- aunque ventas.propietario
-- tenga filas guardadas como 'Sin propietario'. Por eso no hay una
-- FK real aquí: el "join" es un match de 3 columnas de texto
-- (codigo + propietario + tanda_nombre) que se rompe apenas
-- propietario es NULL en el origen.
ALTER TABLE ventas
  ADD CONSTRAINT fk_ventas_entrada_soft_link
  FOREIGN KEY (codigo) REFERENCES entradas(codigo); -- ilustrativo: no existe en Postgres real
