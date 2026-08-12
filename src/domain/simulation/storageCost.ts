import type { StorageRule } from '../types';

export interface StorageCostResult {
  costUsd: number;
  warning?: string;
}

/**
 * AMBIGÜEDAD DE NEGOCIO SIN RESOLVER (ver docs/ANALISIS_EXCEL.md #1):
 * el Excel origen usa al menos 2 métodos distintos para calcular
 * almacenamiento entre bloques de la hoja "Gastos Totales", sin que
 * se haya podido determinar la regla que decide cuál aplica.
 *
 * Esta función soporta ambos métodos si se le indica explícitamente
 * cuál usar (`StorageRule`), pero por defecto (`{ type: 'none' }`)
 * devuelve costo 0 y una advertencia, para no inventar una cifra.
 * No usar el resultado de "none" como si fuera "sin costo real":
 * es un placeholder hasta confirmar la regla de negocio.
 */
export function calculateStorageCostUsd(
  rule: StorageRule,
  tons: number,
  exchangeRate: number
): StorageCostResult {
  switch (rule.type) {
    case 'none':
      return {
        costUsd: 0,
        warning:
          'Almacenamiento no calculado: la regla de negocio no está confirmada (ver docs/ANALISIS_EXCEL.md, ambigüedad #1).',
      };
    case 'per_ton_fixed': {
      const valueUsd = rule.currency === 'PEN' ? rule.unitValue / exchangeRate : rule.unitValue;
      return { costUsd: valueUsd * tons };
    }
    case 'component_sum': {
      const sum = rule.components.reduce((a, b) => a + b, 0);
      const valueUsd = rule.currency === 'PEN' ? sum / exchangeRate : sum;
      return { costUsd: valueUsd * tons };
    }
  }
}
