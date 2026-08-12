import { supabase } from './supabaseClient';
import type {
  Port,
  Plant,
  Transporter,
  Product,
  TransportRate,
  UnloadingRateComponent,
  StorageRule,
} from '../domain/types';

// ---------------------------------------------------------------------
// Esta es la ÚNICA capa que sabe que los datos vienen de Supabase.
// El dominio (/src/domain) nunca importa este archivo; es al revés:
// la UI llama a este repositorio, arma un RateSet, y se lo pasa a
// simulateOperation().
// ---------------------------------------------------------------------

export async function fetchPorts(): Promise<Port[]> {
  const { data, error } = await supabase.from('ports').select('id, code, name').order('name');
  if (error) throw error;
  return data as Port[];
}

export async function fetchPlants(): Promise<Plant[]> {
  const { data, error } = await supabase.from('plants').select('id, code, name').order('name');
  if (error) throw error;
  return data as Plant[];
}

export async function fetchTransporters(): Promise<Transporter[]> {
  const { data, error } = await supabase.from('transporters').select('id, name').order('name');
  if (error) throw error;
  return data as Transporter[];
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('id, name').order('name');
  if (error) throw error;
  return data as Product[];
}

/**
 * Tarifa de transporte vigente para una combinación planta+transportista,
 * en una fecha dada (por defecto hoy).
 */
export async function fetchTransportRate(
  plantId: string,
  transporterId: string,
  atDate: string = new Date().toISOString().slice(0, 10)
): Promise<TransportRate | null> {
  const { data, error } = await supabase
    .from('transport_rates')
    .select('plant_id, transporter_id, rate_pen_per_ton, valid_from, valid_to')
    .eq('plant_id', plantId)
    .eq('transporter_id', transporterId)
    .lte('valid_from', atDate)
    .or(`valid_to.is.null,valid_to.gte.${atDate}`)
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    plantId: data.plant_id,
    transporterId: data.transporter_id,
    ratePenPerTon: data.rate_pen_per_ton,
    validFrom: data.valid_from,
    validTo: data.valid_to,
  };
}

/**
 * Componentes de tarifa de descarga vigentes para un puerto, en una fecha dada.
 */
export async function fetchUnloadingComponents(
  portId: string,
  atDate: string = new Date().toISOString().slice(0, 10)
): Promise<UnloadingRateComponent[]> {
  const { data, error } = await supabase
    .from('unloading_rate_components')
    .select('port_id, component_name, currency, unit_value, valid_from, valid_to')
    .eq('port_id', portId)
    .lte('valid_from', atDate)
    .or(`valid_to.is.null,valid_to.gte.${atDate}`);

  if (error) throw error;

  return (data ?? []).map((c) => ({
    portId: c.port_id,
    componentName: c.component_name,
    currency: c.currency,
    unitValue: c.unit_value,
    validFrom: c.valid_from,
    validTo: c.valid_to,
  }));
}

/**
 * Regla de almacenamiento vigente. Devuelve `{ type: 'none' }` si no hay
 * ninguna cargada (ver ambigüedad #1) — el motor mostrará la advertencia
 * correspondiente en vez de inventar un costo.
 */
export async function fetchStorageRule(
  portId: string | null,
  atDate: string = new Date().toISOString().slice(0, 10)
): Promise<StorageRule> {
  let query = supabase
    .from('storage_rate_rules')
    .select('id, formula_type, currency, unit_value')
    .lte('valid_from', atDate)
    .or(`valid_to.is.null,valid_to.gte.${atDate}`);

  query = portId ? query.or(`port_id.eq.${portId},port_id.is.null`) : query.is('port_id', null);

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return { type: 'none' };

  if (data.formula_type === 'per_ton_fixed') {
    return { type: 'per_ton_fixed', currency: data.currency, unitValue: data.unit_value };
  }

  const { data: components, error: compError } = await supabase
    .from('storage_rate_components')
    .select('value, currency')
    .eq('storage_rate_rule_id', data.id);
  if (compError) throw compError;

  return {
    type: 'component_sum',
    currency: (components?.[0]?.currency as 'USD' | 'PEN') ?? 'USD',
    components: (components ?? []).map((c) => c.value),
  };
}

/**
 * Tipo de cambio vigente en o antes de la fecha dada.
 */
export async function fetchExchangeRate(
  atDate: string = new Date().toISOString().slice(0, 10)
): Promise<number> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('usd_to_pen')
    .lte('rate_date', atDate)
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No hay tipo de cambio cargado para la fecha solicitada.');
  return data.usd_to_pen;
}
