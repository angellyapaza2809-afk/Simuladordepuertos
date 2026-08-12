# Simulador de Costos — Puerto Chancay / Callao

Aplicación web para simular y comparar los costos de descarga y transporte
de macroinsumos entre el Puerto de Chancay y el Puerto del Callao, según
planta destino, transportista y toneladas.

> ✅ Fases 1-6 implementadas: análisis del Excel, base de datos, motor de
> simulación, comparación de alternativas, histórico/escenarios y dashboard.
> El motor de cálculo está testeado (`npm test`) contra valores reales
> extraídos del Excel original. Aun así quedan **ambigüedades de negocio sin
> confirmar** — ver `docs/ANALISIS_EXCEL.md` — que afectan sobre todo el
> cálculo de almacenamiento (`storage_rate_rules`, sin seed por defecto).
> No tomar decisiones de negocio con estas cifras hasta resolverlas.

Guía paso a paso para crear el proyecto en Supabase y conectar el frontend:
**`docs/SUPABASE_SETUP.md`**.

## Stack

- React + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + RLS)
- Motor de simulación puro en `/src/domain` (sin dependencias de Supabase ni de React)

## Estructura

```
/src
  /domain     lógica de negocio pura (cálculo de costos)
  /data       acceso a Supabase (repositorios)
  /components UI
  /pages
/supabase
  /migrations SQL versionado del esquema
  seed.sql    datos maestros iniciales (derivados del Excel)
```

## Setup local

```bash
cp .env.example .env.local
# completar SUPABASE_URL y SUPABASE_ANON_KEY

npm install
npm run dev
```

## Tests del motor de simulación

```bash
npm test
```

15 tests que validan `unloadingCost`, `transportCost`, `storageCost`,
`demurrageCost`, `simulateOperation` y `compareAlternatives` contra cifras
tomadas directamente del Excel origen (hojas "Gastos de Descarga" y
"Gastos de Transporte").

## Base de datos

Este proyecto está preparado para levantarse en cualquier proyecto Supabase nuevo:

```bash
supabase link --project-ref <tu-project-ref>
supabase db push          # aplica /supabase/migrations en orden
psql "$DATABASE_URL" -f supabase/seed.sql
```

Nunca se commitean `service_role` keys. Todas las credenciales van por
variables de entorno (ver `.env.example`).

## Ambigüedades de negocio pendientes

Ver `docs/ANALISIS_EXCEL.md`, sección "Ambigüedades encontradas". En particular:

1. Regla de cálculo de almacenamiento (dos métodos distintos en el Excel origen).
2. Tipo de cambio: no hay una regla única de qué TC usar por operación.
3. Signo de demurrage/despatch — resuelto en el modelo de datos con una
   columna `type` explícita, pero falta confirmar los montos históricos migrados.
4. Conceptos "Ransa"/"Warehouse" en algunos bloques del Excel: no está claro
   si son una cuarta planta destino o un concepto de almacenamiento intermedio.

No usar las cifras de este sistema para decisiones sin validar estos puntos.
