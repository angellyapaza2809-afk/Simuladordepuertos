-- =========================================================
-- seed.sql
-- Datos maestros derivados del Excel "Resumen de gastos Puerto Chancay".
-- Todas las tarifas quedan con valid_from = '2025-01-01' como fecha
-- de referencia arbitraria (el Excel no trae fecha explícita de
-- vigencia para muchas tarifas) y valid_to = null (vigente).
-- AJUSTAR estas fechas si se conoce la vigencia real.
-- =========================================================

-- ---------------------------------------------------------
-- PORTS
-- ---------------------------------------------------------
insert into ports (code, name) values
  ('CALLAO', 'Puerto del Callao'),
  ('CHANCAY', 'Puerto de Chancay')
on conflict (code) do nothing;

-- ---------------------------------------------------------
-- PLANTS  (código = "Centro receptor", hoja "tarifas")
-- ---------------------------------------------------------
insert into plants (code, name) values
  ('5003', 'CHANCAY (TPC/PAB)'),
  ('5029', 'GH CHANCAY'),
  ('5001', 'LURIN')
on conflict (code) do nothing;

-- ---------------------------------------------------------
-- TRANSPORTERS
-- ---------------------------------------------------------
insert into transporters (name) values
  ('TOSA E.I.R.L.'),
  ('TRANSJIBAJA S.A.C.'),
  ('VILMA ROJAS')
on conflict (name) do nothing;

-- ---------------------------------------------------------
-- PRODUCTS  (nombres normalizados; el Excel usa variantes de
-- capitalización: 'Maiz', 'MAIZ', 'maiz' -> se unifican aquí)
-- ---------------------------------------------------------
insert into products (name) values
  ('MAIZ'),
  ('TORTA DE SOYA'),
  ('FREJOL'),
  ('GRANO DE SOYA')
on conflict (name) do nothing;

-- ---------------------------------------------------------
-- EXCHANGE RATES
-- Muestra de los TC observados en distintos bloques del Excel.
-- Fuente: hoja "Gastos Totales", columna E/I de cada bloque de buque.
-- ---------------------------------------------------------
insert into exchange_rates (rate_date, usd_to_pen) values
  ('2025-01-01', 3.40),
  ('2025-04-01', 3.36),
  ('2025-06-01', 3.45),
  ('2025-08-01', 3.75)
on conflict (rate_date) do nothing;

-- ---------------------------------------------------------
-- TRANSPORT_RATES (S/ por TN), por planta x transportista.
-- Fuente: hoja "Gastos de Transporte", rango F3:H5.
-- ---------------------------------------------------------
insert into transport_rates (plant_id, transporter_id, rate_pen_per_ton, valid_from, source_note)
select p.id, t.id, v.rate, '2025-01-01', 'Gastos de Transporte!F3:H5'
from (values
  ('5003', 'TOSA E.I.R.L.',        9.5),
  ('5003', 'TRANSJIBAJA S.A.C.',   8.0),
  ('5003', 'VILMA ROJAS',          7.9),
  ('5029', 'TOSA E.I.R.L.',        9.5),
  ('5029', 'TRANSJIBAJA S.A.C.',   9.5),
  ('5029', 'VILMA ROJAS',          8.9),
  ('5001', 'TOSA E.I.R.L.',       50.0),
  ('5001', 'TRANSJIBAJA S.A.C.',  45.0),
  ('5001', 'VILMA ROJAS',         45.0)
) as v(plant_code, transporter_name, rate)
join plants p on p.code = v.plant_code
join transporters t on t.name = v.transporter_name;

-- ---------------------------------------------------------
-- Tarifas planas alternativas encontradas en la hoja "tarifas"
-- (29.03 / 31.51 / 23.96 S/TN), usadas en el Excel como una
-- "Simulación" con tarifa única por planta, independiente del
-- transportista. Se guardan aparte para no confundir con las
-- tarifas reales diferenciadas por transportista de arriba.
-- Si el negocio confirma que esta es la tarifa vigente real,
-- reemplazar transport_rates en vez de mantener ambas.
-- ---------------------------------------------------------
comment on column transport_rates.source_note is 'Traza el origen exacto (hoja/rango) de cada tarifa migrada desde el Excel.';

-- ---------------------------------------------------------
-- UNLOADING_RATE_COMPONENTS
-- Fuente: hoja "Gastos de Descarga", filas 8-11 (Chancay) y H8:J11 (Callao).
-- ---------------------------------------------------------
insert into unloading_rate_components (port_id, component_name, currency, unit_value, valid_from, source_note)
select p.id, v.component, v.currency, v.value, '2025-01-01', 'Gastos de Descarga'
from (values
  ('CHANCAY', 'CONTROL DE BALANZA',        'PEN', 0.20),
  ('CHANCAY', 'COMISION DE AGENTE',        'USD', 0.34),
  ('CHANCAY', 'GASTOS DE AREA OPERATIVA',  'USD', 10.00),
  ('CHANCAY', 'GASTOS DE A&G',             'PEN', 0.82),
  ('CALLAO',  'CONTROL DE BALANZA',        'PEN', 0.20),
  ('CALLAO',  'COMISION DE AGENTE',        'USD', 0.34),
  ('CALLAO',  'GASTOS DE AREA OPERATIVA',  'USD', 12.22),
  ('CALLAO',  'GASTOS DE A&G',             'PEN', 0.82)
) as v(port_code, component, currency, value)
join ports p on p.code = v.port_code;

-- ---------------------------------------------------------
-- STORAGE_RATE_RULES
-- NO SE CARGA una regla por defecto: ver ambigüedad #1 del análisis.
-- Descomentar y ajustar solo tras confirmar con el usuario cuál
-- método (per_ton_fixed vs component_sum) aplica y cuándo.
-- ---------------------------------------------------------
-- insert into storage_rate_rules (port_id, formula_type, currency, unit_value, valid_from, source_note)
-- values (null, 'per_ton_fixed', 'USD', 1.25, '2025-01-01', 'Gastos Totales - ejemplo 5*0.25');
