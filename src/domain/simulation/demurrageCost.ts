import type { DemurrageInput } from '../types';

/**
 * DEMURRAGE = costo adicional (suma al total).
 * DESPATCH  = ahorro/ingreso (resta del total).
 *
 * Esto reemplaza el criterio de "signo inconsistente" observado en
 * el Excel origen (ver docs/ANALISIS_EXCEL.md, ambigüedad #4) por
 * una columna de tipo explícita.
 */
export function calculateDemurrageCostUsd(demurrage?: DemurrageInput): number {
  if (!demurrage) return 0;
  const sign = demurrage.type === 'DEMURRAGE' ? 1 : -1;
  return sign * Math.abs(demurrage.amountUsd);
}
