import { supabase } from './supabaseClient';

export interface OperationSummaryRow {
  id: string;
  vesselName: string;
  portCode: string;
  productName: string | null;
  operationDate: string | null;
  totalTons: number;
  unloadingCostUsd: number;
  transportCostUsd: number;
  storageCostUsd: number;
  demurrageUsd: number;
  totalCostUsd: number;
  costPerTonUsd: number;
}

/**
 * Trae el histórico consolidado (equivalente a la hoja "Resumen Puertos").
 * Solo lectura — el histórico se carga vía ETL/seed, nunca se edita desde
 * la UI (ver 0005_rls.sql).
 */
export async function fetchOperationsHistory(): Promise<OperationSummaryRow[]> {
  const { data, error } = await supabase
    .from('operation_cost_summary')
    .select(
      `
      unloading_cost_usd,
      transport_cost_usd,
      storage_cost_usd,
      demurrage_usd,
      total_cost_usd,
      cost_per_ton_usd,
      operations (
        id,
        operation_date,
        total_tons,
        vessels ( name ),
        products ( name ),
        ports ( code )
      )
    `
    )
    .order('operation_date', { referencedTable: 'operations', ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.operations.id,
    vesselName: row.operations.vessels?.name ?? '(sin nombre)',
    portCode: row.operations.ports?.code ?? '',
    productName: row.operations.products?.name ?? null,
    operationDate: row.operations.operation_date,
    totalTons: row.operations.total_tons,
    unloadingCostUsd: row.unloading_cost_usd,
    transportCostUsd: row.transport_cost_usd,
    storageCostUsd: row.storage_cost_usd,
    demurrageUsd: row.demurrage_usd,
    totalCostUsd: row.total_cost_usd,
    costPerTonUsd: row.cost_per_ton_usd,
  }));
}
