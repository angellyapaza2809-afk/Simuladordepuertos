-- =========================================================
-- 0002_rates.sql
-- Tarifas vigentes por periodo. Todas con valid_from/valid_to
-- para poder reconstruir qué tarifa aplicaba en una fecha dada,
-- y para que un escenario histórico no cambie si la tarifa cambia
-- después (Fase 5 del requerimiento).
-- =========================================================

-- ---------------------------------------------------------
-- TRANSPORT_RATES
-- Tarifa de flete terrestre = f(planta, transportista), en S/ por TN.
-- Corresponde a la hoja "Gastos de Transporte" (F3:H5) y "tarifas".
-- ---------------------------------------------------------
create table if not exists transport_rates (
  id              uuid primary key default gen_random_uuid(),
  plant_id        uuid not null references plants(id) on delete restrict,
  transporter_id  uuid not null references transporters(id) on delete restrict,
  rate_pen_per_ton numeric(10,4) not null check (rate_pen_per_ton >= 0),
  valid_from      date not null,
  valid_to        date,                    -- null = vigente
  source_note     text,                    -- de dónde salió el número (celda/hoja del Excel)
  created_at      timestamptz not null default now(),
  constraint transport_rates_no_overlap
    exclude using gist (
      plant_id with =,
      transporter_id with =,
      daterange(valid_from, coalesce(valid_to, 'infinity'::date), '[]') with &&
    )
);

comment on table transport_rates is 'Tarifa de transporte (S/TN) por combinación planta+transportista. Fuente: hoja "Gastos de Transporte", filas 3-5.';

-- Requiere la extensión btree_gist para el exclude constraint con uuid
create extension if not exists btree_gist;

-- ---------------------------------------------------------
-- UNLOADING_RATE_COMPONENTS
-- Costo de descarga por puerto = suma de 4 componentes, cada uno
-- con su propia moneda de origen (USD o PEN).
-- Corresponde a la hoja "Gastos de Descarga", filas 8-11.
-- ---------------------------------------------------------
create table if not exists unloading_rate_components (
  id              uuid primary key default gen_random_uuid(),
  port_id         uuid not null references ports(id) on delete restrict,
  component_name  text not null,          -- 'CONTROL DE BALANZA' | 'COMISION DE AGENTE' | 'GASTOS DE AREA OPERATIVA' | 'GASTOS DE A&G'
  currency        text not null check (currency in ('USD','PEN')),
  unit_value      numeric(10,4) not null,  -- valor por TN, en la moneda indicada
  valid_from      date not null,
  valid_to        date,
  source_note     text,
  created_at      timestamptz not null default now()
);

comment on table unloading_rate_components is 'Componentes de la tarifa de descarga por puerto (4 conceptos). Fuente: hoja "Gastos de Descarga".';

-- ---------------------------------------------------------
-- STORAGE_RATE_RULES
-- AMBIGUEDAD #1 (ver análisis Fase 1): en el Excel el almacenamiento
-- se calculó con al menos 2 métodos distintos entre bloques de
-- "Gastos Totales" (ej. 5*0.25*TC, o suma de constantes 6.4+4+0.5),
-- sin que se identificara la regla que determina cuál aplica.
-- Se modela con un "formula_type" para no fijar prematuramente
-- una regla incorrecta; el motor de simulación deberá soportar
-- ambos métodos hasta que se confirme la regla real.
-- ---------------------------------------------------------
create table if not exists storage_rate_rules (
  id             uuid primary key default gen_random_uuid(),
  port_id        uuid references ports(id) on delete restrict,   -- null = aplica a ambos puertos
  formula_type   text not null check (formula_type in ('per_ton_fixed', 'component_sum')),
  -- per_ton_fixed: unit_value (S/ o $ por TN, ver currency) x toneladas
  -- component_sum: se compone de N filas de storage_rate_components (abajo)
  currency       text check (currency in ('USD','PEN')),
  unit_value     numeric(10,4),
  valid_from     date not null,
  valid_to       date,
  source_note    text,
  created_at     timestamptz not null default now()
);

create table if not exists storage_rate_components (
  id                    uuid primary key default gen_random_uuid(),
  storage_rate_rule_id  uuid not null references storage_rate_rules(id) on delete cascade,
  label                 text not null,      -- ej. 'component 6.4', 'component 4', 'component 0.5'
  currency              text not null check (currency in ('USD','PEN')),
  value                 numeric(10,4) not null
);

comment on table storage_rate_rules is 'AMBIGÜEDAD PENDIENTE DE CONFIRMAR: el Excel usa al menos 2 métodos de cálculo de almacenamiento sin regla documentada. No usar en producción sin validar con el usuario cuál método corresponde a cada caso.';

-- ---------------------------------------------------------
-- DEMURRAGE / DESPATCH rates o parámetros no se modelan como "tarifa"
-- porque en el Excel el monto viene de un cálculo externo (Laytime)
-- y se inyecta como valor fijo por operación, no se deriva de una
-- tarifa reutilizable. Ver tabla operation_demurrage en 0003_operations.sql.
-- ---------------------------------------------------------
