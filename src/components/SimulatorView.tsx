import { useEffect, useMemo, useState } from 'react';
import type { Plant, Port, Product, RateSet, Transporter, AlternativeComparisonRow } from '../domain/types';
import { simulateOperation } from '../domain/simulation/simulateOperation';
import { comparePortsDifference } from '../domain/simulation/compareAlternatives';
import {
  fetchPorts,
  fetchPlants,
  fetchTransporters,
  fetchProducts,
  fetchTransportRate,
  fetchUnloadingComponents,
  fetchStorageRule,
  fetchExchangeRate,
} from '../data/ratesRepository';
import { saveScenario } from '../data/scenariosRepository';

const usd = (n: number) =>
  n.toLocaleString('es-PE', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

async function resolveRateSet(portId: string, plantId: string, transporterId: string): Promise<RateSet> {
  const [exchangeRate, unloadingComponents, transportRate, storageRule] = await Promise.all([
    fetchExchangeRate(),
    fetchUnloadingComponents(portId),
    fetchTransportRate(plantId, transporterId),
    fetchStorageRule(portId),
  ]);

  if (!transportRate) {
    throw new Error('No hay tarifa de transporte vigente para esa combinación de planta y transportista.');
  }

  return { exchangeRate, unloadingComponents, transportRate, storageRule };
}

export default function SimulatorView() {
  const [ports, setPorts] = useState<Port[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [plantId, setPlantId] = useState('');
  const [productId, setProductId] = useState('');
  const [tons, setTons] = useState<number>(1000);

  const [rows, setRows] = useState<AlternativeComparisonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    Promise.all([fetchPorts(), fetchPlants(), fetchTransporters(), fetchProducts()])
      .then(([p, pl, t, pr]) => {
        setPorts(p);
        setPlants(pl);
        setTransporters(t);
        if (pl.length) setPlantId(pl[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  const diff = useMemo(() => comparePortsDifference(rows), [rows]);
  const warnings = useMemo(() => {
    const w = new Set<string>();
    rows.forEach((r) => r.result.warnings.forEach((x) => w.add(x)));
    return Array.from(w);
  }, [rows]);

  async function runSimulation() {
    if (!plantId || tons <= 0 || ports.length === 0 || transporters.length === 0) return;
    setLoading(true);
    setError(null);
    setSaveState('idle');
    try {
      // compareAlternatives() del dominio espera un resolver SÍNCRONO de
      // tarifas; como aquí las tarifas se leen de Supabase (async), se
      // resuelven todas las combinaciones primero y luego se arma cada
      // fila manualmente, reusando simulateOperation() para cada una.
      const combos = ports.flatMap((port) => transporters.map((t) => ({ port, transporter: t })));
      const rateSets = await Promise.all(
        combos.map(({ port, transporter }) => resolveRateSet(port.id, plantId, transporter.id))
      );

      const computedRows: AlternativeComparisonRow[] = combos.map(({ port, transporter }, i) => ({
        portId: port.id,
        portCode: port.code,
        transporterId: transporter.id,
        transporterName: transporter.name,
        result: simulateOperation({
          portId: port.id,
          plantId,
          transporterId: transporter.id,
          productId: productId || undefined,
          tons,
          rates: rateSets[i],
        }),
      }));

      computedRows.sort((a, b) => a.result.totalCostUsd - b.result.totalCostUsd);
      setRows(computedRows);
    } catch (e: any) {
      setError(e.message ?? 'Error al simular');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveBest() {
    if (!diff) return;
    setSaveState('saving');
    try {
      const best = diff.bestChancay.result.totalCostUsd <= diff.bestCallao.result.totalCostUsd
        ? diff.bestChancay
        : diff.bestCallao;
      const rateSet = await resolveRateSet(best.portId, plantId, best.transporterId);
      await saveScenario({
        name: `Simulación ${new Date().toLocaleString('es-PE')}`,
        portId: best.portId,
        plantId,
        transporterId: best.transporterId,
        productId: productId || undefined,
        tons,
        rates: rateSet,
        result: best.result,
      });
      setSaveState('saved');
    } catch (e) {
      setSaveState('error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-line rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">Parámetros de la operación</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1 text-sm text-ink/70">
            Planta destino
            <select
              className="border border-line rounded-lg px-3 py-2 bg-white text-ink"
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
            >
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink/70">
            Producto (opcional)
            <select
              className="border border-line rounded-lg px-3 py-2 bg-white text-ink"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">— No especificado —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink/70">
            Toneladas
            <input
              type="number"
              min={1}
              className="border border-line rounded-lg px-3 py-2 bg-white text-ink tabular"
              value={tons}
              onChange={(e) => setTons(Number(e.target.value))}
            />
          </label>
        </div>

        <button
          onClick={runSimulation}
          disabled={loading || !plantId}
          className="mt-5 bg-ink text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Calculando…' : 'Simular y comparar alternativas'}
        </button>

        {error && <p className="mt-3 text-sm text-callao">{error}</p>}
      </div>

      {rows.length > 0 && (
        <>
          {diff && (
            <div className="bg-card border border-line rounded-xl p-5">
              <h3 className="text-sm font-medium text-ink/60 mb-3">Callao vs Chancay (mejor alternativa de cada uno)</h3>
              <div className="space-y-3">
                {[
                  { label: 'CHANCAY', row: diff.bestChancay, color: 'bg-chancay' },
                  { label: 'CALLAO', row: diff.bestCallao, color: 'bg-callao' },
                ].map(({ label, row, color }) => {
                  const max = Math.max(diff.bestChancay.result.totalCostUsd, diff.bestCallao.result.totalCostUsd);
                  const pct = (row.result.totalCostUsd / max) * 100;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{label} · {row.transporterName}</span>
                        <span className="tabular">{usd(row.result.totalCostUsd)}</span>
                      </div>
                      <div className="h-3 bg-surface rounded-full overflow-hidden">
                        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-sm text-ink/70">
                Diferencia:{' '}
                <span className="font-medium tabular">{usd(Math.abs(diff.diffUsd))}</span>{' '}
                ({diff.diffPct >= 0 ? '+' : ''}{diff.diffPct.toFixed(1)}%) — Callao{' '}
                {diff.diffUsd >= 0 ? 'más caro' : 'más barato'} que Chancay.
              </p>
              <button
                onClick={handleSaveBest}
                disabled={saveState === 'saving'}
                className="mt-4 border border-line rounded-lg px-3 py-1.5 text-sm hover:bg-surface"
              >
                {saveState === 'saving' && 'Guardando…'}
                {saveState === 'saved' && 'Escenario guardado ✓'}
                {saveState === 'error' && 'Error al guardar — reintentar'}
                {saveState === 'idle' && 'Guardar mejor alternativa como escenario'}
              </button>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="bg-callao/10 border border-callao/30 text-callao rounded-xl p-4 text-sm">
              {warnings.map((w) => (
                <p key={w}>⚠ {w}</p>
              ))}
            </div>
          )}

          <div className="bg-card border border-line rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface text-ink/60 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Alternativa</th>
                  <th className="text-right px-4 py-3">Descarga</th>
                  <th className="text-right px-4 py-3">Transporte</th>
                  <th className="text-right px-4 py-3">Almacenamiento</th>
                  <th className="text-right px-4 py-3">Demurrage</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-right px-4 py-3">S/TN</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={`${r.portId}-${r.transporterId}`}
                    className={`border-t border-line ${i === 0 ? 'bg-chancay/5 font-medium' : ''}`}
                  >
                    <td className="px-4 py-3">
                      {i === 0 && <span className="text-chancay mr-1">★</span>}
                      {r.portCode} · {r.transporterName}
                    </td>
                    <td className="px-4 py-3 text-right tabular">{usd(r.result.unloadingCostUsd)}</td>
                    <td className="px-4 py-3 text-right tabular">{usd(r.result.transportCostUsd)}</td>
                    <td className="px-4 py-3 text-right tabular">{usd(r.result.storageCostUsd)}</td>
                    <td className="px-4 py-3 text-right tabular">{usd(r.result.demurrageUsd)}</td>
                    <td className="px-4 py-3 text-right tabular">{usd(r.result.totalCostUsd)}</td>
                    <td className="px-4 py-3 text-right tabular">{r.result.costPerTonUsd.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
