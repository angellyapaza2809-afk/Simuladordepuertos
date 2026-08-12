import { useEffect, useState } from 'react';
import { fetchMyScenarios, deleteScenario, type ScenarioListItem } from '../data/scenariosRepository';

const usd = (n: number) =>
  n.toLocaleString('es-PE', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function ScenariosView() {
  const [scenarios, setScenarios] = useState<ScenarioListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetchMyScenarios()
      .then(setScenarios)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleDelete(id: string) {
    await deleteScenario(id);
    load();
  }

  if (loading) return <p className="text-sm text-ink/60">Cargando escenarios…</p>;
  if (error) return <p className="text-sm text-callao">{error}</p>;
  if (scenarios.length === 0)
    return (
      <div className="bg-card border border-line rounded-xl p-6 text-sm text-ink/60">
        No has guardado ningún escenario todavía. Corre una simulación en la pestaña "Simulador" y guárdala desde ahí.
      </div>
    );

  return (
    <div className="bg-card border border-line rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface text-ink/60 text-xs uppercase tracking-wide">
          <tr>
            <th className="text-left px-4 py-3">Nombre</th>
            <th className="text-right px-4 py-3">TN</th>
            <th className="text-right px-4 py-3">Total</th>
            <th className="text-right px-4 py-3">S/TN</th>
            <th className="text-left px-4 py-3">Guardado</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((s) => (
            <tr key={s.id} className="border-t border-line">
              <td className="px-4 py-3">{s.name}</td>
              <td className="px-4 py-3 text-right tabular">{s.tons.toLocaleString('es-PE')}</td>
              <td className="px-4 py-3 text-right tabular">
                {s.totalCostUsd != null ? usd(s.totalCostUsd) : '—'}
              </td>
              <td className="px-4 py-3 text-right tabular">
                {s.costPerTonUsd != null ? s.costPerTonUsd.toFixed(2) : '—'}
              </td>
              <td className="px-4 py-3 text-ink/60">{new Date(s.createdAt).toLocaleString('es-PE')}</td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => handleDelete(s.id)} className="text-callao hover:underline">
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
