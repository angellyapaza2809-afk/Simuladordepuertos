-- =========================================================
-- 0005_rls.sql
-- Row Level Security.
--
-- ASUNCIÓN (no estaba especificado en el pedido): esta es una
-- herramienta interna de una sola empresa, sin datos multi-tenant.
-- Se asume que cualquier usuario autenticado puede LEER todos los
-- datos maestros e históricos, pero solo puede crear/editar SUS
-- PROPIOS escenarios. Los datos maestros (tarifas, puertos, etc.)
-- solo se editan con la service_role key (backoffice/admin), nunca
-- desde el cliente. Ajustar si la empresa necesita roles distintos
-- (ej. solo ciertos usuarios pueden ver tarifas negociadas).
-- =========================================================

alter table ports enable row level security;
alter table plants enable row level security;
alter table transporters enable row level security;
alter table products enable row level security;
alter table vessels enable row level security;
alter table exchange_rates enable row level security;
alter table transport_rates enable row level security;
alter table unloading_rate_components enable row level security;
alter table storage_rate_rules enable row level security;
alter table storage_rate_components enable row level security;
alter table operations enable row level security;
alter table operation_transport_details enable row level security;
alter table operation_demurrage enable row level security;
alter table operation_cost_summary enable row level security;
alter table scenarios enable row level security;
alter table scenario_rate_snapshots enable row level security;
alter table scenario_results enable row level security;

-- Lectura abierta a cualquier usuario autenticado para datos maestros e histórico
create policy "read master data" on ports for select to authenticated using (true);
create policy "read master data" on plants for select to authenticated using (true);
create policy "read master data" on transporters for select to authenticated using (true);
create policy "read master data" on products for select to authenticated using (true);
create policy "read master data" on vessels for select to authenticated using (true);
create policy "read master data" on exchange_rates for select to authenticated using (true);
create policy "read master data" on transport_rates for select to authenticated using (true);
create policy "read master data" on unloading_rate_components for select to authenticated using (true);
create policy "read master data" on storage_rate_rules for select to authenticated using (true);
create policy "read master data" on storage_rate_components for select to authenticated using (true);
create policy "read history" on operations for select to authenticated using (true);
create policy "read history" on operation_transport_details for select to authenticated using (true);
create policy "read history" on operation_demurrage for select to authenticated using (true);
create policy "read history" on operation_cost_summary for select to authenticated using (true);

-- Escenarios: cada usuario ve y edita solo los suyos
create policy "own scenarios select" on scenarios for select to authenticated
  using (created_by = auth.uid());
create policy "own scenarios insert" on scenarios for insert to authenticated
  with check (created_by = auth.uid());
create policy "own scenarios update" on scenarios for update to authenticated
  using (created_by = auth.uid());
create policy "own scenarios delete" on scenarios for delete to authenticated
  using (created_by = auth.uid());

create policy "own scenario snapshots" on scenario_rate_snapshots for all to authenticated
  using (exists (select 1 from scenarios s where s.id = scenario_id and s.created_by = auth.uid()))
  with check (exists (select 1 from scenarios s where s.id = scenario_id and s.created_by = auth.uid()));

create policy "own scenario results" on scenario_results for all to authenticated
  using (exists (select 1 from scenarios s where s.id = scenario_id and s.created_by = auth.uid()))
  with check (exists (select 1 from scenarios s where s.id = scenario_id and s.created_by = auth.uid()));

-- Nota: no se crean policies de INSERT/UPDATE/DELETE para tablas maestras
-- ni para el histórico desde el cliente: esas cargas se hacen vía
-- service_role key en backoffice/scripts de migración (seed.sql, ETL),
-- nunca desde el frontend.
