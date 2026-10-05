-- Esquema de la base de datos de Scenta (PostgreSQL).
-- Reconstruido a partir de lo que lee y escribe la app (src/context/AppContext.tsx y src/lib/db-actions.ts).
-- Se puede correr varias veces: solo crea lo que falta.
--
-- Criterios:
--  * Montos y cantidades en double precision: el driver los devuelve como número (numeric vendría como texto).
--  * Fechas que la app guarda como texto con formato local (ej. "19/4/2026") quedan en text.
--  * Casi todas las columnas aceptan null: la app hace upserts parciales (ej. solo { id, status }).
--  * Columnas verificadas contra la base original de Xata (export del 5/10/2026).

CREATE TABLE IF NOT EXISTS categorias (
    id    text PRIMARY KEY,
    name  text NOT NULL,
    count integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proveedores (
    id      text PRIMARY KEY,
    name    text NOT NULL,
    contact text DEFAULT '',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS esencias (
    id            text PRIMARY KEY,
    name          text NOT NULL,
    category      text,
    gender        text,
    provider      text,
    cost          double precision DEFAULT 0,
    cost_usd      double precision,
    qty           double precision DEFAULT 0,
    price30g      double precision,
    price100g     double precision,
    price250g     double precision,
    price100g_usd double precision,
    price250g_usd double precision,
    last_update   text,
    source        text DEFAULT 'manual',
    created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS insumos (
    id       text PRIMARY KEY,
    name     text NOT NULL,
    category text,
    provider text,
    cost     double precision DEFAULT 0,
    qty      double precision DEFAULT 0,
    stock    double precision DEFAULT 0,
    unit     text DEFAULT 'un.',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bases (
    id            text PRIMARY KEY,
    name          text NOT NULL,
    components    jsonb DEFAULT '[]'::jsonb,
    essence_gender text,
    essence_grams double precision,
    category      text,
    created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS productos (
    id                  text PRIMARY KEY,
    name                text NOT NULL,
    category            text,
    base_id             text DEFAULT '',
    components          jsonb DEFAULT '[]'::jsonb,
    cost                double precision DEFAULT 0,
    price               double precision DEFAULT 0,   -- mayorista
    price_minorista     double precision DEFAULT 0,
    stock               double precision DEFAULT 0,
    description         text DEFAULT '',
    gender              text DEFAULT 'Unisex',
    last_update         text,
    image_url           text,
    availability_status text DEFAULT 'disponible',    -- disponible | demora | no-disponible
    delivery_days       integer DEFAULT 0,
    created_at          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventario (
    id          text PRIMARY KEY,
    name        text,
    type        text,
    category    text,
    qty         double precision DEFAULT 0,
    last_update text,
    unit        text DEFAULT 'un.',
    gender      text,
    created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transacciones (
    id          text PRIMARY KEY,
    type        text,          -- Ingreso | Egreso
    amount      double precision DEFAULT 0,
    description text,
    date        text,
    created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuarios (
    id         text PRIMARY KEY,
    username   text NOT NULL,
    email      text,
    password   text,
    role       text DEFAULT 'minorista',   -- admin | minorista | mayorista
    status     text DEFAULT 'Activo',
    last_login text,
    notas      text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
    id                 text PRIMARY KEY,
    items              jsonb DEFAULT '[]'::jsonb,
    total              double precision DEFAULT 0,
    status             text DEFAULT 'solicitud recibida',
    customer_name      text,
    date               text,
    payment_method     text DEFAULT 'efectivo',
    payment_status     text DEFAULT 'pendiente',
    cancelation_reason text,
    created_at         timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promociones (
    id                  text PRIMARY KEY,
    product_id          text,
    discount_percentage double precision DEFAULT 0,
    is_active           boolean DEFAULT true,
    end_date            text,
    created_at          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS config (
    key        text PRIMARY KEY,
    value      text,
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS solicitudes_mayorista (
    id              serial PRIMARY KEY,   -- int4: el driver lo devuelve como número (bigserial vendría como texto)
    user_id         text,
    username        text,
    nombre          text,
    apellido        text,
    mail            text,
    celular         text,
    motivo          text,
    estado          text DEFAULT 'pendiente',   -- pendiente | aprobada | rechazada
    motivo_rechazo  text,
    fecha_reintento text,
    created_at      timestamptz DEFAULT now()
);

-- Índices para las búsquedas que hace la app
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders (date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_name);
CREATE INDEX IF NOT EXISTS idx_transacciones_created ON transacciones (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes_mayorista (estado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios (username);
