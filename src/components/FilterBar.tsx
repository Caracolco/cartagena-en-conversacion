import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { CANDIDATES, PLATFORMS, TOPICS } from '../lib/config';
import { EMPTY_FILTERS, type Filters } from '../lib/metrics';
import { fmt } from '../lib/format';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  min: string;
  max: string;
  count: number;
  total: number;
}

export default function FilterBar({ filters, onChange, min, max, count, total }: Props) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });
  const activeCount = Object.values(filters).filter(Boolean).length;
  return (
    <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-3 gap-y-2 px-6 py-2.5">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        <SlidersHorizontal size={14} /> Filtros
      </span>
      <label className="flex items-center gap-1.5 text-xs text-ink-muted">
        Desde
        <input type="date" className="field w-[132px]" min={min} max={max} value={filters.from} onChange={(e) => set('from', e.target.value)} />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-ink-muted">
        Hasta
        <input type="date" className="field w-[132px]" min={min} max={max} value={filters.to} onChange={(e) => set('to', e.target.value)} />
      </label>
      <select className="field" aria-label="Figura" value={filters.cand} onChange={(e) => set('cand', e.target.value as Filters['cand'])}>
        <option value="">Todas las figuras</option>
        {CANDIDATES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select className="field" aria-label="Plataforma" value={filters.platform} onChange={(e) => set('platform', e.target.value as Filters['platform'])}>
        <option value="">Todas las plataformas</option>
        {PLATFORMS.map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>
      <select className="field" aria-label="Sentimiento" value={filters.sentiment} onChange={(e) => set('sentiment', e.target.value as Filters['sentiment'])}>
        <option value="">Todo sentimiento</option>
        <option value="positivo">Positivo</option>
        <option value="neutral">Neutral</option>
        <option value="negativo">Negativo</option>
      </select>
      <select className="field" aria-label="Temática" value={filters.topic} onChange={(e) => set('topic', e.target.value as Filters['topic'])}>
        <option value="">Todas las temáticas</option>
        {TOPICS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      {activeCount > 0 && (
        <button className="btn-ghost h-8 py-0 text-xs" onClick={() => onChange(EMPTY_FILTERS)}>
          <RotateCcw size={13} /> Limpiar
        </button>
      )}
      <span className="ml-auto text-xs text-ink-muted">
        {activeCount > 0 ? (
          <>
            <b className="text-navy-900">{fmt(count)}</b> de {fmt(total)} registros
          </>
        ) : (
          <>{fmt(total)} registros depurados</>
        )}
      </span>
    </div>
  );
}
