-- =========================================================
-- 0001_master_data.sql
-- Entidades maestras: puertos, plantas, transportistas, productos,
-- buques y tipo de cambio histórico.
-- =========================================================

create extension if not exists "pgcrypto"; -- para gen_random_uuid()

-- ---------------------------------------------------------
-- PORTS
-- ---------------------------------------------------------
create table if not exists ports (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,        -- 'CALLAO' | 'CHANCAY'
  name        text not null,
  created_at  timestamptz not null default now()
);

comment on table ports is 'Puertos de descarga: Callao y Chancay.';

-- ---------------------------------------------------------
-- PLANTS (destinos finales de la mercadería)
-- Nota: una planta NO pertenece a un solo puerto; ambos puertos
-- pueden despachar hacia la misma planta (por eso no hay FK a ports).
-- ---------------------------------------------------------
create table if not exists plants (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,   -- '5003' | '5029' | '5001' (Centro receptor en hoja "tarifas")
  name              text not null,          -- 'CHANCAY (TPC/PAB)', 'GH CHANCAY', 'LURIN'
  created_at        timestamptz not null default now()
);

comment on table plants is 'Plantas/destinos finales: TPC/PAB Chancay (5003), GH Chancay (5029), Lurín (5001). Código = "Centro receptor" en la hoja tarifas del Excel.';

-- ---------------------------------------------------------
-- TRANSPORTERS
-- ---------------------------------------------------------
create table if not exists transporters (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,   -- 'TOSA E.I.R.L.', 'TRANSJIBAJA S.A.C.', 'VILMA ROJAS'
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,   -- 'MAIZ', 'TORTA DE SOYA', 'FREJOL', 'GRANO DE SOYA'
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------
-- VESSELS (buques) - catálogo abierto, se crean on-demand
-- ---------------------------------------------------------
create table if not exists vessels (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------
-- EXCHANGE RATES (tipo de cambio USD/PEN)
-- El Excel usa un TC distinto por bloque/operación (3.4, 3.36, 3.45, 3.75...).
-- Se modela como serie histórica por fecha para poder reconstruir cualquier
-- cálculo pasado con el TC que realmente se usó ese día.
-- ---------------------------------------------------------
create table if not exists exchange_rates (
  id            uuid primary key default gen_random_uuid(),
  rate_date     date not null unique,
  usd_to_pen    numeric(10,4) not null check (usd_to_pen > 0),
  created_at    timestamptz not null default now()
);

comment on table exchange_rates is 'Tipo de cambio USD/PEN por fecha. En el Excel el TC varía por bloque de buque sin regla documentada (ver ambigüedad #3 del análisis); se guarda como serie por fecha para poder auditar cada operación con el TC realmente vigente.';
