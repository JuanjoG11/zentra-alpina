import React, { useState, useMemo } from 'react';
import useStore from '../store/useStore';
import { getFilteredData, calculateKPIs } from '../utils/calculations';

const IndicatorsProfile = () => {
  const { indicators, addIndicator, updateIndicator, removeIndicator, selectedPeriod, selectedCity, selectedZone, selectedProvider, selectedSeller } = useStore();

  const filters = { selectedPeriod, selectedCity, selectedZone, selectedProvider, selectedSeller };
  const filtered = useMemo(() => getFilteredData(filters), [selectedPeriod, selectedCity, selectedZone, selectedProvider, selectedSeller]);
  const kpis = useMemo(() => calculateKPIs(filtered), [filtered]);

  const [form, setForm] = useState({ name: '', formula: '' });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const evaluate = (formula) => {
    try {
      // Allow formulas that reference KPI keys directly, e.g. "totalSales" or expressions like "compliance * 100".
      // We use a Function with `with` to provide KPI keys as top-level identifiers.
      // NOTE: This runs locally in the browser; avoid evaluating untrusted formulas from remote sources.
      // eslint-disable-next-line no-new-func
      const fn = new Function('kpis', `with(kpis){ return ${formula}; }`);
      const result = fn(kpis);
      return typeof result === 'number' ? result : result;
    } catch (e) {
      return `Error: ${e.message}`;
    }
  };

  const handleAdd = () => {
    setError(null);
    if (!form.name || !form.formula) {
      setError('Completa nombre y fórmula');
      return;
    }
    const sample = evaluate(form.formula);
    if (typeof sample === 'string' && sample.startsWith('Error')) {
      setError('Fórmula inválida: ' + sample);
      return;
    }
    addIndicator({ name: form.name, formula: form.formula });
    setForm({ name: '', formula: '' });
  };

  const handleEditSave = () => {
    if (!editing) return;
    updateIndicator(editing.id, { name: editing.name, formula: editing.formula });
    setEditing(null);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Perfil Indicadores</h2>

      <section className="mb-6">
        <h3 className="font-medium mb-2">Añadir indicador</h3>
        <div className="flex gap-2 items-center">
          <input
            placeholder="Nombre"
            className="px-3 py-2 rounded bg-slate-100 border border-slate-200 text-sm w-64"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            placeholder="Fórmula (ej: totalSales, netSales, compliance * 100)"
            className="px-3 py-2 rounded bg-slate-100 border border-slate-200 text-sm flex-1"
            value={form.formula}
            onChange={(e) => setForm({ ...form, formula: e.target.value })}
          />
          <button onClick={handleAdd} className="px-3 py-2 bg-blue-600 rounded">Agregar</button>
        </div>
        {error && <div className="text-sm text-rose-400 mt-2">{error}</div>}
      </section>

      <section>
        <h3 className="font-medium mb-2">Indicadores actuales</h3>
        <div className="space-y-2">
          {indicators.map((ind) => (
            <div key={ind.id} className="p-3 rounded bg-slate-100 border border-slate-200 flex items-start justify-between gap-4">
              <div className="flex-1">
                {editing && editing.id === ind.id ? (
                  <div className="flex gap-2">
                    <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="px-2 py-1 rounded bg-slate-200" />
                    <input value={editing.formula} onChange={(e) => setEditing({ ...editing, formula: e.target.value })} className="px-2 py-1 rounded bg-slate-200 flex-1" />
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-semibold">{ind.name}</div>
                    <div className="text-xs text-slate-600">{ind.formula}</div>
                  </div>
                )}
              </div>

              <div className="w-48 text-right">
                <div className="text-lg font-mono">
                  {(() => {
                    const val = evaluate(ind.formula);
                    return typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(val);
                  })()}
                </div>
                <div className="mt-2 flex gap-2 justify-end">
                  {editing && editing.id === ind.id ? (
                    <>
                      <button onClick={() => setEditing(null)} className="px-2 py-1 border rounded">Cancelar</button>
                      <button onClick={handleEditSave} className="px-2 py-1 bg-green-600 rounded">Guardar</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditing({ ...ind })} className="px-2 py-1 border rounded">Editar</button>
                      <button onClick={() => removeIndicator(ind.id)} className="px-2 py-1 bg-rose-600 rounded">Eliminar</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="font-medium mb-2">KPIs base (para usar en fórmulas)</h3>
        <pre className="bg-slate-100 p-3 rounded text-sm overflow-auto" style={{ maxHeight: 240 }}>
          {JSON.stringify(kpis, null, 2)}
        </pre>
      </section>
    </div>
  );
};

export default IndicatorsProfile;
