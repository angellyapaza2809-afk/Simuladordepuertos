import { describe, it, expect } from 'vitest';
import { calculateUnloadingCostUsd } from '../simulation/unloadingCost';
import { calculateTransportCostUsd } from '../simulation/transportCost';
import { calculateStorageCostUsd } from '../simulation/storageCost';
import { calculateDemurrageCostUsd } from '../simulation/demurrageCost';
import { simulateOperation } from '../simulation/simulateOperation';
import { compareAlternatives, comparePortsDifference } from '../simulation/compareAlternatives';
import type { RateSet, UnloadingRateComponent } from '../types';

// ---------------------------------------------------------------------
// Casos de validación tomados directamente del Excel
// "Resumen_de_gastos_Puerto_Chancay.xlsx", hoja "Gastos de Descarga"
// filas 6-12 (Chancay) y H6:K12 (Callao). Sirven para probar que el
// motor reproduce EXACTAMENTE la lógica del Excel, no una versión
// simplificada.
// ---------------------------------------------------------------------

const chancayUnloadingComponents: UnloadingRateComponent[] = [
  { portId: 'chancay', componentName: 'CONTROL DE BALANZA', currency: 'PEN', unitValue: 0.2, validFrom: '2025-01-01', validTo: null },
  { portId: 'chancay', componentName: 'COMISION DE AGENTE', currency: 'USD', unitValue: 0.34, validFrom: '2025-01-01', validTo: null },
  { portId: 'chancay', componentName: 'GASTOS DE AREA OPERATIVA', currency: 'USD', unitValue: 10, validFrom: '2025-01-01', validTo: null },
  { portId: 'chancay', componentName: 'GASTOS DE A&G', currency: 'PEN', unitValue: 0.82, validFrom: '2025-01-01', validTo: null },
];

const callaoUnloadingComponents: UnloadingRateComponent[] = [
  { portId: 'callao', componentName: 'CONTROL DE BALANZA', currency: 'PEN', unitValue: 0.2, validFrom: '2025-01-01', validTo: null },
  { portId: 'callao', componentName: 'COMISION DE AGENTE', currency: 'USD', unitValue: 0.34, validFrom: '2025-01-01', validTo: null },
  { portId: 'callao', componentName: 'GASTOS DE AREA OPERATIVA', currency: 'USD', unitValue: 12.22, validFrom: '2025-01-01', validTo: null },
  { portId: 'callao', componentName: 'GASTOS DE A&G', currency: 'PEN', unitValue: 0.82, validFrom: '2025-01-01', validTo: null },
];

const TC = 3.4; // hoja "Gastos de Descarga", B6/I6
const TOTAL_DESCARGADO = 23094.99; // hoja "Gastos de Descarga", D4

describe('calculateUnloadingCostUsd — validado contra hoja "Gastos de Descarga"', () => {
  it('reproduce el total de Chancay (D12 de la hoja) dentro de un margen de redondeo', () => {
    const totalUsd = calculateUnloadingCostUsd(chancayUnloadingComponents, TOTAL_DESCARGADO, TC);
    // D12 (Excel) = SUM(D8:D11), en soles. Aquí validamos vía soles resultantes
    // para comparar manzanas con manzanas contra la hoja.
    const totalPen = totalUsd * TC;
    // suma de componentes en S/TN: 0.2 + 0.34*3.4 + 10*3.4 + 0.82 = 35.176
    const expectedPenPerTon = 0.2 + 0.34 * TC + 10 * TC + 0.82;
    const expectedTotalPen = expectedPenPerTon * TOTAL_DESCARGADO;
    expect(totalPen).toBeCloseTo(expectedTotalPen, 2);
  });

  it('Callao siempre debería costear más que Chancay en área operativa (12.22 vs 10 USD)', () => {
    const chancayUsd = calculateUnloadingCostUsd(chancayUnloadingComponents, 1000, TC);
    const callaoUsd = calculateUnloadingCostUsd(callaoUnloadingComponents, 1000, TC);
    expect(callaoUsd).toBeGreaterThan(chancayUsd);
  });

  it('lanza error si el tipo de cambio es 0 o negativo', () => {
    expect(() => calculateUnloadingCostUsd(chancayUnloadingComponents, 1000, 0)).toThrow();
  });
});

describe('calculateTransportCostUsd — validado contra hoja "Gastos de Transporte"', () => {
  it('CHANCAY-5003 x TOSA: 12044.56 TN x 9.5 S/TN = 114,423.32 S/', () => {
    const costUsd = calculateTransportCostUsd(
      { plantId: 'p5003', transporterId: 'tosa', ratePenPerTon: 9.5, validFrom: '2025-01-01', validTo: null },
      12044.56,
      TC
    );
    const costPen = costUsd * TC;
    expect(costPen).toBeCloseTo(12044.56 * 9.5, 1);
  });

  it('LURIN-5001 es la planta más cara de todas las tarifas del Excel (45-50 S/TN)', () => {
    const chancayCost = calculateTransportCostUsd(
      { plantId: 'p5003', transporterId: 'tosa', ratePenPerTon: 9.5, validFrom: '2025-01-01', validTo: null },
      1000,
      TC
    );
    const lurinCost = calculateTransportCostUsd(
      { plantId: 'p5001', transporterId: 'tosa', ratePenPerTon: 50, validFrom: '2025-01-01', validTo: null },
      1000,
      TC
    );
    expect(lurinCost).toBeGreaterThan(chancayCost);
  });
});

describe('calculateStorageCostUsd — ambigüedad de negocio', () => {
  it('con regla "none" devuelve costo 0 y una advertencia explícita', () => {
    const result = calculateStorageCostUsd({ type: 'none' }, 1000, TC);
    expect(result.costUsd).toBe(0);
    expect(result.warning).toBeDefined();
  });

  it('con regla "per_ton_fixed" en USD calcula tons x valor', () => {
    const result = calculateStorageCostUsd({ type: 'per_ton_fixed', currency: 'USD', unitValue: 1.25 }, 1000, TC);
    expect(result.costUsd).toBeCloseTo(1250, 6);
    expect(result.warning).toBeUndefined();
  });
});

describe('calculateDemurrageCostUsd — signo explícito por tipo', () => {
  it('DEMURRAGE suma al costo (positivo)', () => {
    expect(calculateDemurrageCostUsd({ type: 'DEMURRAGE', amountUsd: 5000 })).toBe(5000);
  });

  it('DESPATCH resta del costo (negativo)', () => {
    expect(calculateDemurrageCostUsd({ type: 'DESPATCH', amountUsd: 5000 })).toBe(-5000);
  });

  it('sin demurrage, devuelve 0', () => {
    expect(calculateDemurrageCostUsd(undefined)).toBe(0);
  });
});

describe('simulateOperation — orquestación completa', () => {
  const baseRates: RateSet = {
    exchangeRate: TC,
    unloadingComponents: chancayUnloadingComponents,
    transportRate: { plantId: 'p5003', transporterId: 'tosa', ratePenPerTon: 9.5, validFrom: '2025-01-01', validTo: null },
    storageRule: { type: 'none' },
  };

  it('el total es la suma de sus partes', () => {
    const result = simulateOperation({
      portId: 'chancay',
      plantId: 'p5003',
      transporterId: 'tosa',
      tons: 1000,
      rates: baseRates,
    });
    const expectedTotal =
      result.unloadingCostUsd +
      result.transportCostUsd +
      result.storageCostUsd +
      result.demurrageUsd +
      result.berthChangeCostUsd;
    expect(result.totalCostUsd).toBeCloseTo(expectedTotal, 6);
    expect(result.costPerTonUsd).toBeCloseTo(result.totalCostUsd / 1000, 6);
  });

  it('incluye advertencia de almacenamiento cuando la regla es "none"', () => {
    const result = simulateOperation({
      portId: 'chancay',
      plantId: 'p5003',
      transporterId: 'tosa',
      tons: 1000,
      rates: baseRates,
    });
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('lanza error si las toneladas son 0 o negativas', () => {
    expect(() =>
      simulateOperation({ portId: 'chancay', plantId: 'p5003', transporterId: 'tosa', tons: 0, rates: baseRates })
    ).toThrow();
  });

  it('demurrage tipo DESPATCH reduce el costo total frente al mismo caso sin demurrage', () => {
    const withDespatch = simulateOperation({
      portId: 'chancay',
      plantId: 'p5003',
      transporterId: 'tosa',
      tons: 1000,
      rates: { ...baseRates, demurrage: { type: 'DESPATCH', amountUsd: 2000 } },
    });
    const without = simulateOperation({
      portId: 'chancay',
      plantId: 'p5003',
      transporterId: 'tosa',
      tons: 1000,
      rates: baseRates,
    });
    expect(withDespatch.totalCostUsd).toBeCloseTo(without.totalCostUsd - 2000, 6);
  });
});

describe('compareAlternatives + comparePortsDifference', () => {
  it('ordena las alternativas de menor a mayor costo total', () => {
    const ports = [
      { id: 'callao', code: 'CALLAO' as const, name: 'Callao' },
      { id: 'chancay', code: 'CHANCAY' as const, name: 'Chancay' },
    ];
    const transporters = [
      { id: 'tosa', name: 'TOSA E.I.R.L.' },
      { id: 'transjibaja', name: 'TRANSJIBAJA S.A.C.' },
    ];

    const rows = compareAlternatives({
      ports,
      transporters,
      plantId: 'p5003',
      tons: 1000,
      resolveRates: (portId, transporterId) => ({
        exchangeRate: TC,
        unloadingComponents: portId === 'callao' ? callaoUnloadingComponents : chancayUnloadingComponents,
        transportRate: {
          plantId: 'p5003',
          transporterId,
          ratePenPerTon: transporterId === 'tosa' ? 9.5 : 8.0,
          validFrom: '2025-01-01',
          validTo: null,
        },
        storageRule: { type: 'none' },
      }),
    });

    expect(rows).toHaveLength(4);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].result.totalCostUsd).toBeGreaterThanOrEqual(rows[i - 1].result.totalCostUsd);
    }

    const diff = comparePortsDifference(rows);
    expect(diff).not.toBeNull();
    expect(diff!.bestChancay.portCode).toBe('CHANCAY');
    expect(diff!.bestCallao.portCode).toBe('CALLAO');
  });
});
