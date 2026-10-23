import { useEffect, useState } from 'react';
import { Check, ExternalLink, RotateCcw, X } from 'lucide-react';
import { CAND_BY_ID, TOPICS } from '../lib/config';
import { fmtDate } from '../lib/format';
import type { ActiveMention } from '../lib/overrides';
import type { CandidateId, Mention, Override, Sentiment, Target, Thread, TopicId } from '../lib/types';
import { CandChip } from './ui';
import { SENT_COLOR, SENT_LABEL, TARGET_LABEL } from './theme';

interface Props {
  mention: ActiveMention;
  original: Mention;
  thread?: Thread;
  override?: Override;
  onSave: (o: Override | null) => void;
  onClose: () => void;
}

export default function ReviewDrawer({ mention: m, original, thread, override, onSave, onClose }: Props) {
  const [sentiment, setSentiment] = useState<Sentiment>(m.sentiment);
  const [target, setTarget] = useState<Target>(m.target);
  const [topics, setTopics] = useState<TopicId[]>(m.topics);
  const [exclude, setExclude] = useState(!!m.excluded);
  const [keepCopy, setKeepCopy] = useState(!!original.dupOf && !m.dupOf);
  const [confirm, setConfirm] = useState<CandidateId[]>(override?.confirm ?? []);
  const [reject, setReject] = useState<CandidateId[]>(override?.reject ?? []);
  const [note, setNote] = useState(m.note ?? '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

  const save = () => {
    const o: Override = { note: note || undefined, by: 'Revisión manual' };
    if (sentiment !== original.sentiment) o.sentiment = sentiment;
    if (target !== original.target) o.target = target;
    if (topics.join() !== original.topics.join()) o.topics = topics;
    if (exclude) o.exclude = true;
    else if (keepCopy) o.exclude = false;
    if (confirm.length) o.confirm = confirm;
    if (reject.length) o.reject = reject;
    const empty = Object.keys(o).filter((k) => k !== 'by' && (o as Record<string, unknown>)[k] !== undefined).length === 0;
    onSave(empty ? null : o);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy-950/40" onClick={onClose}>
      <aside className="flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} aria-label="Revisar registro">
        <header className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <p className="kicker">Revisar clasificación</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {fmtDate(m.date)} · {m.platform} · {m.type} · {m.outlet || m.author || 'autor no disponible'}
            </p>
          </div>
          <button className="btn-ghost h-8 px-2" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 text-sm">
          <div>
            <p className="whitespace-pre-line leading-relaxed">
              {m.title && <b>{m.title}. </b>}
              {m.content || <i className="text-ink-faint">(sin texto)</i>}
            </p>
            <a href={m.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-accent">
              Abrir publicación original <ExternalLink size={11} />
            </a>
          </div>

          {m.isComment && thread && (
            <details className="rounded-lg bg-navy-50 p-3 text-xs">
              <summary className="cursor-pointer font-semibold text-navy-800">Publicación a la que responde</summary>
              <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-line leading-relaxed text-ink-muted">{thread.text || '(sin texto visible)'}</p>
            </details>
          )}

          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">Sentimiento</legend>
            <div className="flex gap-2">
              {(['positivo', 'neutral', 'negativo'] as Sentiment[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSentiment(s)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${sentiment === s ? 'border-navy-900 bg-navy-900 text-white' : 'border-line hover:bg-navy-50'}`}
                >
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: SENT_COLOR[s] }} />
                  {SENT_LABEL[s]}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-ink-faint">
              Brand24: {original.sentimentOrig || 'sin dato'} · Automático: {SENT_LABEL[original.sentiment]}
            </p>
          </fieldset>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">Destinatario de la valoración</span>
            <select className="field w-full" value={target} onChange={(e) => setTarget(e.target.value as Target)}>
              {(Object.keys(TARGET_LABEL) as Target[]).map((t) => (
                <option key={t} value={t}>
                  {TARGET_LABEL[t]}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">Temas</legend>
            <div className="flex flex-wrap gap-1.5">
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTopics((l) => toggle(l, t.id))}
                  className={`chip border py-1 ${topics.includes(t.id) ? 'border-navy-900 bg-navy-900 text-white' : 'border-line text-ink-muted hover:bg-navy-50'}`}
                >
                  {topics.includes(t.id) && <Check size={11} />}
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">Figuras vinculadas</legend>
            {original.cands.length ? (
              <ul className="space-y-1.5">
                {original.cands.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                    <div>
                      <CandChip link={confirm.includes(c.id) ? { ...c, pending: undefined } : c} />
                      {c.pending && <p className="mt-1 text-[11px] text-amber-800">{c.pending}</p>}
                    </div>
                    <div className="flex gap-1">
                      {c.pending && (
                        <button
                          className={`chip border py-1 ${confirm.includes(c.id) ? 'border-navy-900 bg-navy-900 text-white' : 'border-line'}`}
                          onClick={() => {
                            setConfirm((l) => toggle(l, c.id));
                            setReject((l) => l.filter((x) => x !== c.id));
                          }}
                        >
                          Confirmar
                        </button>
                      )}
                      <button
                        className={`chip border py-1 ${reject.includes(c.id) ? 'border-accent bg-accent text-white' : 'border-line'}`}
                        onClick={() => {
                          setReject((l) => toggle(l, c.id));
                          setConfirm((l) => l.filter((x) => x !== c.id));
                        }}
                        title={`No corresponde a ${CAND_BY_ID[c.id].name}`}
                      >
                        Descartar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-ink-faint">Ninguna figura vinculada.</p>
            )}
          </fieldset>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={exclude} onChange={(e) => setExclude(e.target.checked)} />
              Excluir de los indicadores (spam, irrelevante o duplicado)
            </label>
            {original.dupOf && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={keepCopy} disabled={exclude} onChange={(e) => setKeepCopy(e.target.checked)} />
                No es copia: contar este registro
              </label>
            )}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">Nota</span>
            <textarea className="field h-16 w-full py-1.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motivo de la corrección" />
          </label>
        </div>

        <footer className="flex items-center justify-between border-t border-line px-5 py-3">
          <button
            className="btn-ghost"
            onClick={() => {
              onSave(null);
              onClose();
            }}
            disabled={!override}
          >
            <RotateCcw size={14} /> Restablecer automático
          </button>
          <button className="btn-primary" onClick={save}>
            Guardar revisión
          </button>
        </footer>
      </aside>
    </div>
  );
}
