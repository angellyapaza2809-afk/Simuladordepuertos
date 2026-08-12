-- =========================================================
-- 0004_scenarios.sql
-- Simulaciones guardadas por el usuario. Requisito clave (Fase 5):
-- si una tarifa cambia después, una simulación guardada NO debe
-- cambiar. Por eso se congela un snapshot de las tarifas usadas
-- en el momento de guardar, en vez de solo referenciarlas por FK.
-- =========================================================

create table if not exists scenarios (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  created_by     uuid references auth.users(id),
  port_id        uuid not null references ports(id),
  plant_id       uuid not null references plants(id),
  transporter_id uuid not null references transporters(id),
  product_id     uuid references products(id),
  tons           numeric(12,3) not null check (tons >= 0),
  notes          text,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Snapshot de tarifas usadas en el momento de simular.
-- Se guarda como JSON para no depender del esquema de tarifas
-- evolucionando en el tiempo (si se agregan/quitan componentes).
-- ---------------------------------------------------------
create table if not exists scenario_rate_snapshots (
  id             uuid primary key default gen_random_uuid(),
  scenario_id    uuid not null references scenarios(id) on delete cascade,
  rate_type      text not null check (rate_type in ('transport','unloading','storage','exchange_rate')),
  rate_payload   jsonb not null,   -- copia congelada de la tarifa aplicada
  created_at     timestamptz not null default now()
);

comment on table scenario_rate_snapshots is 'Copia congelada de las tarifas vigentes al momento de correr el escenario. Garantiza que un escenario histórico no cambie si las tarifas maestras cambian después.';

-- ---------------------------------------------------------
-- Resultado calculado del escenario (igual forma que operation_cost_summary)
-- ---------------------------------------------------------
create table if not exists scenario_results (
  id                    uuid primary key default gen_random_uuid(),
  scenario_id           uuid not null references scenarios(id) on delete cascade unique,
  unloading_cost_usd    numeric(14,2) not null,
  transport_cost_usd    numeric(14,2) not null,
  storage_cost_usd      numeric(14,2) not null default 0,
  demurrage_usd         numeric(14,2) not null default 0,
  total_cost_usd        numeric(14,2) not null,
  cost_per_ton_usd      numeric(10,4) not null,
  computed_at           timestamptz not null default now()
);

create index if not exists idx_scenarios_created_by on scenarios(created_by);
create index if not exists idx_scenario_snapshots_scenario on scenario_rate_snapshots(scenario_id);
