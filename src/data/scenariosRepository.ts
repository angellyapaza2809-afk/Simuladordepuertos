import { supabase } from './supabaseClient';
import type { RateSet, SimulationResult } from '../domain/types';

export interface SaveScenarioParams {
  name: string;
  portId: string;
  plantId: string;
  transporterId: string;
  productId?: string;
  tons: number;
  rates: RateSet;
  result: SimulationResult;
  notes?: string;
}

/**
 * Guarda un escenario congelando las tarifas usadas (rate snapshot) y el
 * resultado calculado, para que si las tarifas maestras cambian después,
 * este escenario siga mostrando el mismo resultado (requisito Fase 5).
 */
export async function saveScenario(params: SaveScenarioParams): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Debes iniciar sesión para guardar un escenario.');

  const { data: scenario, error: scenarioError } = await supabase
    .from('scenarios')
    .insert({
      name: params.name,
      created_by: userId,
      port_id: params.portId,
      plant_id: params.plantId,
      transporter_id: params.transporterId,
      product_id: params.productId ?? null,
      tons: params.tons,
      notes: params.notes ?? null,
    })
    .select('id')
    .single();

  if (scenarioError) throw scenarioError;
  const scenarioId = scenario.id as string;

  const snapshots = [
    { scenario_id: scenarioId, rate_type: 'exchange_rate', rate_payload: { usd_to_pen: params.rates.exchangeRate } },
    { scenario_id: scenarioId, rate_type: 'unloading', rate_payload: params.rates.unloadingComponents },
    { scenario_id: scenarioId, rate_type: 'transport', rate_payload: params.rates.transportRate },
    { scenario_id: scenarioId, rate_type: 'storage', rate_payload: params.rates.storageRule },
  ];

  const { error: snapshotError } = await supabase.from('scenario_rate_snapshots').insert(snapshots);
  if (snapshotError) throw snapshotError;

  const { error: resultError } = await supabase.from('scenario_results').insert({
    scenario_id: scenarioId,
    unloading_cost_usd: params.result.unloadingCostUsd,
    transport_cost_usd: params.result.transportCostUsd,
    storage_cost_usd: params.result.storageCostUsd,
    demurrage_usd: params.result.demurrageUsd,
    total_cost_usd: params.result.totalCostUsd,
    cost_per_ton_usd: params.result.costPerTonUsd,
  });
  if (resultError) throw resultError;

  return scenarioId;
}

export interface ScenarioListItem {
  id: string;
  name: string;
  tons: number;
  createdAt: string;
  totalCostUsd: number | null;
  costPerTonUsd: number | null;
}

export async function fetchMyScenarios(): Promise<ScenarioListItem[]> {
  const { data, error } = await supabase
    .from('scenarios')
    .select('id, name, tons, created_at, scenario_results ( total_cost_usd, cost_per_ton_usd )')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    tons: row.tons,
    createdAt: row.created_at,
    totalCostUsd: row.scenario_results?.[0]?.total_cost_usd ?? null,
    costPerTonUsd: row.scenario_results?.[0]?.cost_per_ton_usd ?? null,
  }));
}

export async function deleteScenario(id: string): Promise<void> {
  const { error } = await supabase.from('scenarios').delete().eq('id', id);
  if (error) throw error;
}
