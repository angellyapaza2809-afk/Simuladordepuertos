import type { SimulationInput, SimulationResult } from '../types';
import { calculateUnloadingCostUsd } from './unloadingCost';
import { calculateTransportCostUsd } from './transportCost';
import { calculateStorageCostUsd } from './storageCost';
import { calculateDemurrageCostUsd } from './demurrageCost';

/**
 * Orquesta el cálculo completo de una operación (real o simulada).
 * Es la función central del motor: descarga + transporte + almacenamiento
 * + demurrage/despatch + cambio de muelle = costo total.
 *
 * No accede a Supabase ni a React — recibe todas las tarifas ya resueltas
 * en `input.rates` (ver /src/data/ratesRepository.ts para cómo se cargan).
 */
export function simulateOperation(input: SimulationInput): SimulationResult {
  const { tons, rates } = input;

  if (tons <= 0) {
    throw new Error('Las toneladas deben ser mayores que 0');
  }
  if (rates.exchangeRate <= 0) {
    throw new Error('El tipo de cambio debe ser mayor que 0');
  }

  const warnings: string[] = [];

  const unloadingCostUsd = calculateUnloadingCostUsd(
    rates.unloadingComponents,
    tons,
    rates.exchangeRate
  );

  const transportCostUsd = calculateTransportCostUsd(rates.transportRate, tons, rates.exchangeRate);

  const storage = calculateStorageCostUsd(rates.storageRule, tons, rates.exchangeRate);
  if (storage.warning) warnings.push(storage.warning);

  const demurrageUsd = calculateDemurrageCostUsd(rates.demurrage);

  const berthChangeCostUsd = rates.berthChangeCostUsd ?? 0;

  const totalCostUsd =
    unloadingCostUsd + transportCostUsd + storage.costUsd + demurrageUsd + berthChangeCostUsd;

  return {
    unloadingCostUsd,
    transportCostUsd,
    storageCostUsd: storage.costUsd,
    demurrageUsd,
    berthChangeCostUsd,
    totalCostUsd,
    costPerTonUsd: totalCostUsd / tons,
    warnings,
  };
}
