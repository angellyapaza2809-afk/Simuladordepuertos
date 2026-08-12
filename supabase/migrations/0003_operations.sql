-- =========================================================
-- 0003_operations.sql
-- Histórico real de operaciones (una fila = una descarga de un buque
-- en un puerto), con su desglose de costos. Corresponde a las hojas
-- "Gastos Totales", "Resumen Puertos" y "BD".
-- =========================================================

create table if not exists operations (
  id                uuid primary key default gen_random_uuid(),
  vessel_id         uuid not null references vessels(id) on delete restrict,
  product_id        uuid references products(id) on delete restrict,
  port_id           uuid not null references ports(id) on delete restrict,
  operation_date    date,
  total_tons        numeric(12,3) not null check (total_tons >= 0),
  exchange_rate_id  uuid references exchange_rates(id),
  notes             text,
  source_sheet      text,       -- de qué hoja/bloque del Excel se migró (trazabilidad)
  created_at        timestamptz not null default now()
);

comment on table operations is 'Cabecera de una operación histórica real de descarga. Fuente principal: bloques de la hoja "Gastos Totales" y filas de "Resumen Puertos".';

-- ---------------------------------------------------------
-- Detalle de transporte por operación: una operación puede repartir
-- toneladas entre varias plantas y transportistas (ver hoja
-- "Gastos de Transporte", que reparte por planta x transportista).
-- ---------------------------------------------------------
create table if not exists operation_transport_details (
  id               uuid primary key default gen_random_uuid(),
  operation_id     uuid not null references operations(id) on delete cascade,
  plant_id         uuid not null references plants(id) on delete restrict,
  transporter_id   uuid not null references transporters(id) on delete restrict,
  tons             numeric(12,3) not null check (tons >= 0),
  rate_pen_per_ton numeric(10,4) not null,   -- tarifa efectivamente aplicada (copiada, no FK, para preservar el histórico)
  cost_pen         numeric(14,2) not null
);

-- ---------------------------------------------------------
-- Demurrage/Despatch por operación.
-- AMBIGÜEDAD #4 (ver análisis Fase 1): en el Excel el signo de este
-- monto es inconsistente entre bloques. Aquí se estandariza con
-- una columna "type" explícita en vez de depender del signo.
-- ---------------------------------------------------------
create table if not exists operation_demurrage (
  id             uuid primary key default gen_random_uuid(),
  operation_id   uuid not null references operations(id) on delete cascade,
  type           text not null check (type in ('DEMURRAGE','DESPATCH')),
  amount_usd     numeric(14,2) not null check (amount_usd >= 0),  -- siempre positivo; el signo en el costo total lo decide el motor según "type"
  laytime_days   numeric(8,2),
  source_note    text
);

comment on table operation_demurrage is 'DEMURRAGE = costo adicional (suma). DESPATCH = ahorro/ingreso (resta). Monto siempre positivo; el tipo determina el signo en el cálculo, resolviendo la ambigüedad de signos del Excel original.';

-- ---------------------------------------------------------
-- Resumen de costos calculado por operación (equivalente a la hoja
-- "Resumen Puertos"). Se guarda materializado para consulta rápida
-- del histórico, pero SIEMPRE debe ser reproducible corriendo el
-- motor de simulación con los datos de arriba.
-- ---------------------------------------------------------
create table if not exists operation_cost_summary (
  id                    uuid primary key default gen_random_uuid(),
  operation_id          uuid not null references operations(id) on delete cascade unique,
  unloading_cost_usd    numeric(14,2) not null,
  transport_cost_usd    numeric(14,2) not null,
  storage_cost_usd      numeric(14,2) not null default 0,
  demurrage_usd         numeric(14,2) not null default 0,   -- ya con signo aplicado (positivo=costo, negativo=ahorro)
  berth_change_cost_usd numeric(14,2) not null default 0,
  total_cost_usd        numeric(14,2) not null,
  cost_per_ton_usd       numeric(10,4) not null,
  calculated_at         timestamptz not null default now()
);

comment on table operation_cost_summary is 'Resumen calculado (cache) por operación, equivalente a la hoja "Resumen Puertos". Debe recalcularse con el motor de simulación, nunca editarse a mano.';

create index if not exists idx_operations_port on operations(port_id);
create index if not exists idx_operations_vessel on operations(vessel_id);
create index if not exists idx_operations_date on operations(operation_date);
create index if not exists idx_transport_details_operation on operation_transport_details(operation_id);
create index if not exists idx_demurrage_operation on operation_demurrage(operation_id);
