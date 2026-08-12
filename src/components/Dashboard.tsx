import { useEffect, useMemo, useState } from 'react';
import { fetchOperationsHistory, type OperationSummaryRow } from '../data/operationsRepository';

const usd = (n: number) =>
  n.toLocaleString('es-PE', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-line rounded-xl p-5">
      <p className="text-xs uppercase tracking-wide text-ink/50 mb-1">{label}</p>
      <p className="text-2xl font-semibold tabular">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [rows, setRows] = useState<OperationSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOperationsHistory()
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  const kpis = useMemo(() => {
    const totalCost = rows.reduce((a, r) => a + r.totalCostUsd, 0);
    const totalTons = rows.reduce((a, r) => a + r.totalTons, 0);
    const costPerTon = totalTons > 0 ? totalCost / totalTons : 0;

    const byPort = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.portCode] = (acc[r.portCode] ?? 0) + r.totalCostUsd;
      return acc;
    }, {});

    return { totalCost, totalTons, costPerTon, byPort };
  }, [rows]);

  if (loading) return <p className="text-sm text-ink/60">Cargando dashboard…</p>;

  if (rows.length === 0)
    return (
      <div className="bg-card border border-line rounded-xl p-6 text-sm text-ink/60">
        No hay datos históricos cargados todavía para construir el dashboard.
      </div>
    );

  const maxPortCost = Math.max(...Object.values(kpis.byPort));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Gasto total" value={usd(kpis.totalCost)} />
        <KpiCard label="Toneladas totales" value={kpis.totalTons.toLocaleString('es-PE')} />
        <KpiCard label="Costo por TN" value={`${kpis.costPerTon.toFixed(2)}`} />
      </div>

      <div className="bg-card border border-line rounded-xl p-5">
        <h3 className="text-sm font-medium text-ink/60 mb-3">Gasto por puerto</h3>
        <div className="space-y-3">
          {Object.entries(kpis.byPort).map(([port, cost]) => (
            <div key={port}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium">{port}</span>
                <span className="tabular">{usd(cost)}</span>
              </div>
              <div className="h-3 bg-surface rounded-full overflow-hidden">
                <div
                  className={`h-full ${port === 'CHANCAY' ? 'bg-chancay' : 'bg-callao'}`}
                  style={{ width: `${(cost / maxPortCost) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
