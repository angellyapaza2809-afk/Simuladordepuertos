import type { UnloadingRateComponent } from '../types';

/**
 * Costo de descarga = suma de los componentes de tarifa (cada uno con
 * su propia moneda), convertidos a USD, multiplicado por las toneladas.
 *
 * Fuente: hoja "Gastos de Descarga" del Excel (filas 8-11), replicada
 * literalmente: cada componente se pasa a S/ (si viene en USD, se
 * multiplica por el TC) y luego el total en S/ se vuelve a dividir
 * por el TC para obtener el costo final en USD. Es la misma lógica
 * del Excel (ida y vuelta de moneda), no una simplificación.
 */
export function calculateUnloadingCostUsd(
  components: UnloadingRateComponent[],
  tons: number,
  exchangeRate: number
): number {
  if (exchangeRate <= 0) {
    throw new Error('El tipo de cambio debe ser mayor que 0');
  }

  const totalPenPerTon = components.reduce((sum, c) => {
    const valuePen = c.currency === 'USD' ? c.unitValue * exchangeRate : c.unitValue;
    return sum + valuePen;
  }, 0);

  const totalPen = totalPenPerTon * tons;
  return totalPen / exchangeRate;
}

export function calculateUnloadingCostPerTonUsd(
  components: UnloadingRateComponent[],
  exchangeRate: number
): number {
  return calculateUnloadingCostUsd(components, 1, exchangeRate);
}
