import { useState } from 'react';
import SimulatorView from '../components/SimulatorView';
import HistoricoView from '../components/HistoricoView';
import ScenariosView from '../components/ScenariosView';
import Dashboard from '../components/Dashboard';

type Tab = 'simulador' | 'historico' | 'escenarios' | 'dashboard';

const TABS: { id: Tab; label: string }[] = [
  { id: 'simulador', label: 'Simulador' },
  { id: 'historico', label: 'Histórico' },
  { id: 'escenarios', label: 'Escenarios' },
  { id: 'dashboard', label: 'Dashboard' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('simulador');

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-card">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <h1 className="text-xl font-semibold">Simulador de costos — Puerto Chancay / Callao</h1>
          <p className="text-sm text-ink/60 mt-1">
            Descarga, transporte y almacenamiento de macroinsumos
          </p>
        </div>
      </header>

      <nav className="max-w-5xl mx-auto px-6 pt-6">
        <div className="flex gap-1 border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-ink text-ink'
                  : 'border-transparent text-ink/50 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {tab === 'simulador' && <SimulatorView />}
        {tab === 'historico' && <HistoricoView />}
        {tab === 'escenarios' && <ScenariosView />}
        {tab === 'dashboard' && <Dashboard />}
      </main>
    </div>
  );
}
