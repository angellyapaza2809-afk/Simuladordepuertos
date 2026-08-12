import { useEffect, useState } from 'react';
import { fetchOperationsHistory, type OperationSummaryRow } from '../data/operationsRepository';

const usd = (n: number) =>
  n.toLocaleString('es-PE', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function HistoricoView() {
  const [rows, setRows] = useState<OperationSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOperationsHistory()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-ink/60">Cargando histórico…</p>;
  if (error) return <p className="text-sm text-callao">{error}</p>;
  if (rows.length === 0)
    return (
      <div className="bg-card border border-line rounded-xl p-6 text-sm text-ink/60">
        Aún no hay operaciones históricas cargadas. Se cargan vía ETL/seed desde el Excel origen, no desde esta pantalla.
      </div>
    );

  return (
    <div className="bg-card border border-line rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface text-ink/60 text-xs uppercase tracking-wide">
          <tr>
            <th className="text-left px-4 py-3">Buque</th>
            <th className="text-left px-4 py-3">Puerto</th>
            <th className="text-left px-4 py-3">Producto</th>
            <th className="text-right px-4 py-3">TN</th>
            <th className="text-right px-4 py-3">Total</th>
            <th className="text-right px-4 py-3">S/TN</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-line">
              <td className="px-4 py-3">{r.vesselName}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    r.portCode === 'CHANCAY' ? 'bg-chancay' : 'bg-callao'
                  }`}
                />
                {r.portCode}
              </td>
              <td className="px-4 py-3">{r.productName ?? '—'}</td>
              <td className="px-4 py-3 text-right tabular">{r.totalTons.toLocaleString('es-PE')}</td>
              <td className="px-4 py-3 text-right tabular">{usd(r.totalCostUsd)}</td>
              <td className="px-4 py-3 text-right tabular">{r.costPerTonUsd.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
