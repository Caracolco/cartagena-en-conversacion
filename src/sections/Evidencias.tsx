import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, PencilLine, Search } from 'lucide-react';
import { CAND_BY_ID, CANDIDATES, TOPIC_LABEL } from '../lib/config';
import { applyFilters, counted, sentimentShift } from '../lib/metrics';
import { fmt, fmtDate } from '../lib/format';
import { norm } from '../lib/text';
import { CandChip, Card, Empty, Section, SentimentChip } from '../components/ui';
import { SOURCE_LABEL, TARGET_LABEL } from '../components/theme';
import { SentimentBar } from './Panorama';
import type { ActiveMention } from '../lib/overrides';
import type { View } from './view';

type Preset = 'todos' | 'directas' | 'pendientes' | 'revisados' | 'apartados';

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'directas', label: 'Menciones directas' },
  { id: 'pendientes', label: 'Pendientes de validación' },
  { id: 'revisados', label: 'Revisados' },
  { id: 'apartados', label: 'Copias y excluidos' },
];

const PAGE = 20;

export default function Evidencias({ v }: { v: View }) {
  const [preset, setPreset] = useState<Preset>('directas');
  const [cand, setCand] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'recientes' | 'interacciones'>('recientes');
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!v.evidenceQuery) return;
    if (v.evidenceQuery.preset) setPreset(v.evidenceQuery.preset);
    setCand(v.evidenceQuery.cand ?? '');
  }, [v.evidenceQuery]);

  useEffect(() => setPage(0), [preset, cand, q, sort, v.filtered]);

  const shift = useMemo(() => sentimentShift(v.filtered), [v.filtered]);
  const allFiltered = useMemo(() => applyFilters(v.all, { ...v.filters, cand: '' }), [v.all, v.filters]);
  const pendingCount = allFiltered.filter((m) => m.cands.some((c) => c.pending)).length;
  const setAside = allFiltered.filter((m) => m.dupOf || m.excluded).length;
  const changed = v.filtered.filter((m) => m.sentimentOrig && toEs(m.sentimentOrig) !== m.sentiment).length;

  const rows = useMemo(() => {
    let list: ActiveMention[];
    if (preset === 'pendientes') list = allFiltered.filter((m) => m.cands.some((c) => c.pending && (!cand || c.id === cand)));
    else if (preset === 'apartados') list = allFiltered.filter((m) => m.dupOf || m.excluded);
    else {
      list = v.filtered;
      if (preset === 'directas') list = list.filter((m) => counted(m).some((c) => c.rel !== 'contexto'));
      if (preset === 'revisados') list = list.filter((m) => m.reviewed);
    }
    if (cand && preset !== 'pendientes') list = list.filter((m) => m.cands.some((c) => c.id === cand));
    if (q.trim()) {
      const nq = norm(q);
      list = list.filter((m) => norm(`${m.title} ${m.content} ${m.author} ${m.outlet ?? ''}`).includes(nq));
    }
    return [...list].sort((a, b) => (sort === 'recientes' ? (a.created < b.created ? 1 : -1) : b.interactions - a.interactions));
  }, [preset, cand, q, sort, v.filtered, allFiltered]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const visible = rows.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <Section
      id="evidencias"
      kicker="Clasificación y soporte"
      title="Sentimientos y evidencias"
      lead={<>Cada cifra se puede rastrear hasta la publicación original. Las clasificaciones se corrigen aquí y los indicadores se actualizan al instante.</>}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Sentimiento depurado" subtitle="Reclasificación por contexto, revisable">
          <SentimentBar counts={shift.depurado} />
        </Card>
        <Card title="Sentimiento original de Brand24" subtitle={`${fmt(shift.orig['sin dato'])} registros venían sin clasificar`}>
          <SentimentBar counts={{ positivo: shift.orig.positivo, neutral: shift.orig.neutral, negativo: shift.orig.negativo }} />
          <p className="mt-3 text-xs text-ink-muted">
            <b className="text-ink">{fmt(changed)}</b> registros cambiaron de clasificación tras la depuración.
          </p>
        </Card>
        <Card title="Estado de revisión" subtitle="Control de calidad de la base">
          <div className="grid grid-cols-3 gap-2 text-center">
            <button className="rounded-lg bg-navy-50 p-3 hover:bg-navy-100" onClick={() => setPreset('revisados')}>
              <b className="block font-display text-2xl text-navy-900">{fmt(shift.reviewed)}</b>
              <span className="text-[11px] text-ink-muted">revisados a mano</span>
            </button>
            <button className="rounded-lg bg-amber-50 p-3 hover:bg-amber-100" onClick={() => setPreset('pendientes')}>
              <b className="block font-display text-2xl text-amber-800">{fmt(pendingCount)}</b>
              <span className="text-[11px] text-amber-800">por validar</span>
            </button>
            <button className="rounded-lg bg-navy-50 p-3 hover:bg-navy-100" onClick={() => setPreset('apartados')}>
              <b className="block font-display text-2xl text-navy-900">{fmt(setAside)}</b>
              <span className="text-[11px] text-ink-muted">copias o excluidos</span>
            </button>
          </div>
          <p className="mt-3 text-[11.5px] leading-snug text-ink-muted">
            Clasificación automática por reglas en español. Sin revisión manual, trátela como estimación.
          </p>
        </Card>
      </div>

      <Card className="mt-4" title="Explorador de evidencias" subtitle={`${fmt(rows.length)} registros`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-line">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                className={`px-3 py-1.5 text-xs font-medium ${preset === p.id ? 'bg-navy-900 text-white' : 'bg-white text-ink-muted hover:bg-navy-50'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <select className="field" value={cand} onChange={(e) => setCand(e.target.value)} aria-label="Figura">
            <option value="">Todas las figuras</option>
            {CANDIDATES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="relative">
            <Search size={14} className="absolute left-2 top-2 text-ink-faint" />
            <input className="field w-56 pl-7" placeholder="Buscar en textos y autores" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <select className="field ml-auto" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Orden">
            <option value="recientes">Más recientes</option>
            <option value="interacciones">Más interacciones</option>
          </select>
        </div>

        {visible.length ? (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[960px] text-[13px]">
              <thead>
                <tr className="border-y border-line bg-navy-50/60 text-left text-[11px] uppercase tracking-wider text-ink-muted">
                  <th className="w-[108px] py-2 pl-5 font-semibold">Fecha</th>
                  <th className="w-[150px] py-2 font-semibold">Fuente</th>
                  <th className="py-2 font-semibold">Texto</th>
                  <th className="w-[190px] py-2 font-semibold">Figuras</th>
                  <th className="w-[150px] py-2 font-semibold">Clasificación</th>
                  <th className="w-[96px] py-2 pr-5 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((m) => (
                  <tr key={m.id} className={`border-b border-line align-top ${m.dupOf || m.excluded ? 'opacity-60' : ''}`}>
                    <td className="py-2.5 pl-5 text-xs text-ink-muted">
                      {fmtDate(m.date)}
                      <span className="block">{m.platform}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-xs">
                      <span className="line-clamp-2 font-medium text-ink">{m.outlet || m.author || '—'}</span>
                      <span className="text-ink-faint">{SOURCE_LABEL[m.sourceType]}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <p className="line-clamp-3 leading-snug">
                        {m.title && <b>{m.title}. </b>}
                        {m.content || <i className="text-ink-faint">(sin texto)</i>}
                      </p>
                      {(m.dupOf || m.excluded || m.note) && (
                        <p className="mt-1 text-[11px] text-ink-muted">
                          {m.dupOf && <span className="mr-2 text-amber-700">Copia probable</span>}
                          {m.excluded && <span className="mr-2 text-accent">Excluido</span>}
                          {m.note}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {m.cands.filter((c) => c.rel !== 'contexto' || c.pending).map((c) => (
                          <CandChip key={c.id} link={c} />
                        ))}
                      </div>
                      {m.cands.some((c) => c.rel === 'contexto' && !c.pending) && (
                        <p className="mt-1 text-[11px] leading-tight text-ink-faint">
                          Hilo sobre: {m.cands.filter((c) => c.rel === 'contexto' && !c.pending).map((c) => CAND_BY_ID[c.id].short).join(', ')}
                        </p>
                      )}
                      {!m.cands.length && <span className="text-xs text-ink-faint">—</span>}
                    </td>
                    <td className="py-2.5 pr-3">
                      <SentimentChip s={m.sentiment} />
                      {m.target !== 'ninguno' && <span className="mt-1 block text-[11px] text-ink-muted">→ {TARGET_LABEL[m.target]}</span>}
                      {m.topics.length > 0 && m.topicSource === 'texto' && (
                        <span className="mt-0.5 block text-[11px] text-ink-faint">
                          {m.topics.map((t) => TOPIC_LABEL[t]).join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-5 text-right">
                      <div className="flex justify-end gap-1">
                        <a href={m.link} target="_blank" rel="noreferrer" className="btn-ghost h-7 px-2 py-0" title="Abrir publicación original">
                          <ExternalLink size={13} />
                        </a>
                        <button className={`btn-ghost h-7 px-2 py-0 ${m.reviewed ? 'border-navy-600 text-navy-700' : ''}`} onClick={() => v.openReview(m.id)} title="Revisar clasificación">
                          <PencilLine size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}

        {rows.length > PAGE && (
          <div className="mt-3 flex items-center justify-end gap-2 text-xs text-ink-muted">
            <span>
              Página {page + 1} de {pages}
            </span>
            <button className="btn-ghost h-7 px-2 py-0" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Anterior">
              <ChevronLeft size={14} />
            </button>
            <button className="btn-ghost h-7 px-2 py-0" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Siguiente">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </Card>
    </Section>
  );
}

function toEs(s: string) {
  const u = s.toUpperCase();
  return u === 'POSITIVE' ? 'positivo' : u === 'NEGATIVE' ? 'negativo' : 'neutral';
}
