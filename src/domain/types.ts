// Tipos de dominio. Esta capa no importa nada de Supabase ni de React.

export type PortCode = 'CALLAO' | 'CHANCAY';

export interface Port {
  id: string;
  code: PortCode;
  name: string;
}

export interface Plant {
  id: string;
  code: string; // '5003' | '5029' | '5001'
  name: string;
}

export interface Transporter {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
}

export interface TransportRate {
  plantId: string;
  transporterId: string;
  ratePenPerTon: number;
  validFrom: string;
  validTo: string | null;
}

export type UnloadingComponentCurrency = 'USD' | 'PEN';

export interface UnloadingRateComponent {
  portId: string;
  componentName: string;
  currency: UnloadingComponentCurrency;
  unitValue: number; // valor por TN, en `currency`
  validFrom: string;
  validTo: string | null;
}

/**
 * AMBIGÜEDAD DE NEGOCIO (ver docs/ANALISIS_EXCEL.md, punto 1):
 * el Excel origen usa al menos 2 métodos de cálculo de almacenamiento,
 * sin regla documentada de cuándo aplica cada uno. Este tipo modela
 * ambos métodos para no perder información, pero el motor solo
 * calcula un resultado si se lo indica explícitamente.
 */
export type StorageRule =
  | { type: 'none' }
  | { type: 'per_ton_fixed'; currency: UnloadingComponentCurrency; unitValue: number }
  | { type: 'component_sum'; currency: UnloadingComponentCurrency; components: number[] };

export interface DemurrageInput {
  type: 'DEMURRAGE' | 'DESPATCH';
  amountUsd: number; // siempre positivo; el signo lo aplica el motor según `type`
}

export interface RateSet {
  exchangeRate: number; // USD -> PEN (ej. 3.45 significa 1 USD = 3.45 PEN)
  unloadingComponents: UnloadingRateComponent[]; // los 4 (o los que existan) componentes del puerto elegido
  transportRate: TransportRate; // tarifa planta+transportista aplicable
  storageRule: StorageRule;
  demurrage?: DemurrageInput;
  berthChangeCostUsd?: number;
}

export interface SimulationInput {
  portId: string;
  plantId: string;
  transporterId: string;
  productId?: string;
  tons: number;
  rates: RateSet;
}

export interface SimulationResult {
  unloadingCostUsd: number;
  transportCostUsd: number;
  storageCostUsd: number;
  demurrageUsd: number; // con signo ya aplicado (positivo = costo, negativo = ahorro)
  berthChangeCostUsd: number;
  totalCostUsd: number;
  costPerTonUsd: number;
  warnings: string[]; // ej. "Almacenamiento no calculado: regla no confirmada"
}

export interface AlternativeComparisonRow {
  portId: string;
  portCode: PortCode;
  transporterId: string;
  transporterName: string;
  result: SimulationResult;
}
