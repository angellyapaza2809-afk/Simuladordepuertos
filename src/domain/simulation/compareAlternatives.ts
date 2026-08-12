import type { AlternativeComparisonRow, Port, RateSet, SimulationInput, Transporter } from '../types';
import { simulateOperation } from './simulateOperation';

export interface CompareAlternativesParams {
  ports: Port[];
  transporters: Transporter[];
  plantId: string;
  productId?: string;
  tons: number;
  /**
   * Dado un puerto y un transportista, resuelve el RateSet correspondiente
   * (tarifas vigentes de descarga, transporte, TC, almacenamiento, demurrage).
   * Se inyecta como función para que este módulo de dominio no dependa
   * de cómo se obtienen las tarifas (Supabase, snapshot congelado, etc.).
   */
  resolveRates: (portId: string, transporterId: string) => RateSet;
}

/**
 * Corre simulateOperation() para cada combinación puerto x transportista
 * y devuelve las filas ordenadas por costo total ascendente (la primera
 * fila es la alternativa más económica). Corresponde a la tabla de la
 * Fase 4 del requerimiento ("Comparación").
 */
export function compareAlternatives(params: CompareAlternativesParams): AlternativeComparisonRow[] {
  const { ports, transporters, plantId, productId, tons, resolveRates } = params;

  const rows: AlternativeComparisonRow[] = [];

  for (const port of ports) {
    for (const transporter of transporters) {
      const rates = resolveRates(port.id, transporter.id);
      const input: SimulationInput = {
        portId: port.id,
        plantId,
        transporterId: transporter.id,
        productId,
        tons,
        rates,
      };
      const result = simulateOperation(input);
      rows.push({
        portId: port.id,
        portCode: port.code,
        transporterId: transporter.id,
        transporterName: transporter.name,
        result,
      });
    }
  }

  return rows.sort((a, b) => a.result.totalCostUsd - b.result.totalCostUsd);
}

/**
 * Calcula diferencia Callao vs Chancay (para la mejor alternativa de cada
 * puerto), en USD y en %. Devuelve null si falta alguno de los dos puertos
 * en las filas dadas.
 */
export function comparePortsDifference(rows: AlternativeComparisonRow[]) {
  const bestCallao = rows
    .filter((r) => r.portCode === 'CALLAO')
    .sort((a, b) => a.result.totalCostUsd - b.result.totalCostUsd)[0];
  const bestChancay = rows
    .filter((r) => r.portCode === 'CHANCAY')
    .sort((a, b) => a.result.totalCostUsd - b.result.totalCostUsd)[0];

  if (!bestCallao || !bestChancay) return null;

  const diffUsd = bestCallao.result.totalCostUsd - bestChancay.result.totalCostUsd;
  const diffPct = (diffUsd / bestChancay.result.totalCostUsd) * 100;

  return {
    bestCallao,
    bestChancay,
    diffUsd, // positivo = Callao más caro que Chancay
    diffPct,
  };
}
