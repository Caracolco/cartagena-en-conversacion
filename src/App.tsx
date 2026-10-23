import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileUp, Loader2 } from 'lucide-react';
import { applyOverrides, countable } from './lib/overrides';
import { applyFilters, EMPTY_FILTERS, type Filters } from './lib/metrics';
import { loadDataset, loadOverrides, saveImported, saveOverrides, type DataOrigin } from './lib/store';
import type { Dataset, Override, Overrides } from './lib/types';
import revisionesBase from './data/revisiones-base.json';
import { fmt, fmtDate } from './lib/format';
import FilterBar from './components/FilterBar';
import ImportDialog from './components/ImportDialog';
import ExportMenu from './components/ExportMenu';
import ReviewDrawer from './components/ReviewDrawer';
import Panorama from './sections/Panorama';
import Candidatos from './sections/Candidatos';
import Wilson from './sections/Wilson';
import Temas from './sections/Temas';
import Evidencias from './sections/Evidencias';
import Conclusiones from './sections/Conclusiones';
import type { View } from './sections/view';

const SECTIONS = [
  { id: 'panorama', label: 'Panorama general' },
  { id: 'candidatos', label: 'Conversación por candidato' },
  { id: 'wilson', label: 'Wilson Toncel' },
  { id: 'temas', label: 'Cartagena: temas de conversación' },
  { id: 'evidencias', label: 'Sentimientos y evidencias' },
  { id: 'conclusiones', label: 'Conclusiones' },
];

const BASE_OVERRIDES = revisionesBase as Overrides;

export default function App() {
  const [ds, setDs] = useState<Dataset | null>(null);
  const [origin, setOrigin] = useState<DataOrigin>('publicada');
  const [error, setError] = useState('');
  const [userOverrides, setUserOverrides] = useState<Overrides>(() => loadOverrides());
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [active, setActive] = useState('panorama');
  const [evidenceQuery, setEvidenceQuery] = useState<{ preset?: 'pendientes'; cand?: string } | null>(null);

  useEffect(() => {
    loadDataset()
      .then(({ ds, origin }) => {
        setDs(ds);
        setOrigin(origin);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => saveOverrides(userOverrides), [userOverrides]);

  // Sección visible para resaltar la navegación.
  useEffect(() => {
    if (!ds) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: '-140px 0px -55% 0px' },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [ds]);

  const all = useMemo(() => (ds ? applyOverrides(ds, BASE_OVERRIDES, userOverrides) : []), [ds, userOverrides]);
  const base = useMemo(() => countable(all), [all]);
  const filtered = useMemo(() => applyFilters(base, filters), [base, filters]);
  const noCand = useMemo(() => applyFilters(base, filters, { ignoreCand: true }), [base, filters]);

  const saveOverride = useCallback((id: string, o: Override | null) => {
    setUserOverrides((prev) => {
      const next = { ...prev };
      if (o) next[id] = { ...o, at: new Date().toISOString() };
      else delete next[id];
      return next;
    });
  }, []);

  const onImported = useCallback(async (next: Dataset | null) => {
    if (next) {
      await saveImported(next);
      setDs(next);
      setOrigin('importada');
    } else {
      await saveImported(undefined);
      const r = await loadDataset();
      setDs(r.ds);
      setOrigin(r.origin);
    }
    setFilters(EMPTY_FILTERS);
  }, []);

  if (error) {
    return <div className="p-10 text-center text-accent">No se pudo cargar la base: {error}</div>;
  }
  if (!ds) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 text-ink-muted">
        <Loader2 className="animate-spin" size={18} /> Cargando conversación…
      </div>
    );
  }

  const view: View = {
    ds,
    all,
    base,
    filtered,
    noCand,
    filters,
    overrides: { ...BASE_OVERRIDES, ...userOverrides },
    openReview: setReviewId,
    showEvidence: (q) => {
      setEvidenceQuery({ ...q });
      document.getElementById('evidencias')?.scrollIntoView();
    },
    evidenceQuery,
  };

  const reviewMention = reviewId ? all.find((m) => m.id === reviewId) : undefined;

  return (
    <div className="min-h-screen">
      <header className="relative overflow-hidden bg-navy-900 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" aria-hidden />
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3.5">
            <div className="relative h-10 w-10 rounded-lg bg-white/10 ring-1 ring-white/15">
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-accent" />
              <span className="absolute bottom-2 left-2 h-1 w-5 rounded bg-white/80" />
              <span className="absolute bottom-4 left-2 h-1 w-3 rounded bg-white/50" />
            </div>
            <div>
              <h1 className="font-display text-[26px] leading-none">Cartagena en conversación</h1>
              <p className="mt-1 text-[13px] text-navy-300">
                Escucha social · 7 figuras políticas · {fmtDate(ds.audit.dateMin)} – {fmtDate(ds.audit.dateMax)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs text-navy-100 md:inline">
              {fmt(base.length)} registros · base {origin}
            </span>
            <button className="btn-light" onClick={() => setImportOpen(true)}>
              <FileUp size={15} /> Importar Excel
            </button>
            <ExportMenu ds={ds} all={all} userOverrides={userOverrides} onImportOverrides={(o) => setUserOverrides((p) => ({ ...p, ...o }))}>
              <Download size={15} /> Exportar
            </ExportMenu>
          </div>
        </div>
        <div className="h-[3px] bg-gradient-to-r from-accent via-accent to-transparent" />
      </header>

      <div className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-[1320px] gap-1 overflow-x-auto px-6 pt-2" aria-label="Secciones">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium transition-colors ${
                active === s.id ? 'border-accent text-navy-900' : 'border-transparent text-ink-muted hover:text-navy-900'
              }`}
            >
              {s.label}
            </a>
          ))}
        </nav>
        <FilterBar filters={filters} onChange={setFilters} min={ds.audit.dateMin} max={ds.audit.dateMax} count={filtered.length} total={base.length} />
      </div>

      <main className="mx-auto max-w-[1320px] px-6">
        <Panorama v={view} />
        <Candidatos v={view} />
        <Wilson v={view} />
        <Temas v={view} />
        <Evidencias v={view} />
        <Conclusiones v={view} />
      </main>

      <footer className="border-t border-line bg-navy-50">
        <div className="mx-auto max-w-[1320px] px-6 py-5 text-xs leading-relaxed text-ink-muted">
          Fuente: {ds.audit.sourceFiles.join(', ')} (Brand24). Conversación digital registrada; no mide audiencias de prensa, radio ni televisión ni
          permite inferir intención de voto. Sentimiento y temas clasificados por reglas y revisables en la sección de evidencias.
        </div>
      </footer>

      {reviewMention && (
        <ReviewDrawer
          mention={reviewMention}
          thread={ds.threads[reviewMention.thread]}
          original={ds.mentions.find((m) => m.id === reviewMention.id)!}
          override={userOverrides[reviewMention.id] ?? BASE_OVERRIDES[reviewMention.id]}
          onSave={(o) => saveOverride(reviewMention.id, o)}
          onClose={() => setReviewId(null)}
        />
      )}
      {importOpen && <ImportDialog current={ds} origin={origin} onClose={() => setImportOpen(false)} onApply={onImported} />}
    </div>
  );
}
