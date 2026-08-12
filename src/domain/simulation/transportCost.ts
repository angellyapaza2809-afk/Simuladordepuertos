import type { TransportRate } from '../types';

/**
 * Costo de transporte = tarifa (S/TN, según planta+transportista) x toneladas,
 * convertido a USD con el tipo de cambio.
 *
 * Fuente: hoja "Gastos de Transporte" del Excel.
 */
export function calculateTransportCostUsd(
  rate: TransportRate,
  tons: number,
  exchangeRate: number
): number {
  if (exchangeRate <= 0) {
    throw new Error('El tipo de cambio debe ser mayor que 0');
  }
  const costPen = rate.ratePenPerTon * tons;
  return costPen / exchangeRate;
}
