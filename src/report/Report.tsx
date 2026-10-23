import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { ArrowLeft, ArrowRight, Settings2 } from 'lucide-react';
import { fmtDate } from '../lib/format';
import type { ActiveMention } from '../lib/overrides';
import type { Dataset } from '../lib/types';
import { buildStory, type Story } from './story';
import { EASE } from './ui';
import Portada from './chapters/Portada';
import Panorama from './chapters/Panorama';
import Figuras from './chapters/Figuras';
import Wilson from './chapters/Wilson';
import Ciudad from './chapters/Ciudad';
import Percepcion from './chapters/Percepcion';

interface Chapter {
  id: string;
  label: string;
  /** Pantallas dentro del capítulo; las flechas las recorren antes de pasar al siguiente. */
  steps: string[];
  render: (s: Story, step: number, go: (chapter: number) => void) => ReactNode;
}

export const CHAPTERS: Chapter[] = [
  { id: 'portada', label: 'Portada', steps: [''], render: (s, _, go) => <Portada s={s} onStart={() => go(1)} /> },
  { id: 'panorama', label: 'Panorama de conversación', steps: [''], render: (s) => <Panorama s={s} /> },
  { id: 'figuras', label: 'Las siete figuras', steps: [''], render: (s) => <Figuras s={s} /> },
  { id: 'wilson', label: 'Wilson Toncel', steps: [''], render: (s) => <Wilson s={s} /> },
  { id: 'ciudad', label: '¿De qué habla Cartagena?', steps: [''], render: (s) => <Ciudad s={s} /> },
  {
    id: 'percepcion',
    label: 'Percepción y conclusiones',
    steps: ['Tono', 'Voces de la ciudad', 'Voces sobre las figuras', 'Conclusiones'],
    render: (s, step) => <Percepcion s={s} step={step} />,
  },
];

/** '#/wilson' o '#/percepcion/2' (pantalla dentro del capítulo). */
function fromHash(): { chapter: number; step: number } {
  const [id, step] = window.location.hash.replace(/^#\/?/, '').split('/');
  const chapter = Math.max(0, CHAPTERS.findIndex((c) => c.id === id));
  return { chapter, step: Math.min(Math.max(0, Number(step) || 0), CHAPTERS[chapter].steps.length - 1) };
}

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export default function Report({ ds, ms }: { ds: Dataset; ms: ActiveMention[] }) {
  const story = useMemo(() => buildStory(ds, ms), [ds, ms]);
  const [pos, setPos] = useState(() => ({ ...fromHash(), dir: 1 }));
  const chapter = CHAPTERS[pos.chapter];

  const go = useCallback((target: number, step = 0) => {
    setPos((p) => {
      const c = Math.min(CHAPTERS.length - 1, Math.max(0, target));
      return { chapter: c, step: Math.min(step, CHAPTERS[c].steps.length - 1), dir: c > p.chapter || (c === p.chapter && step > p.step) ? 1 : -1 };
    });
  }, []);

  const next = useCallback(() => {
    setPos((p) => {
      if (p.step < CHAPTERS[p.chapter].steps.length - 1) return { ...p, step: p.step + 1, dir: 1 };
      if (p.chapter < CHAPTERS.length - 1) return { chapter: p.chapter + 1, step: 0, dir: 1 };
      return p;
    });
  }, []);

  const prev = useCallback(() => {
    setPos((p) => {
      if (p.step > 0) return { ...p, step: p.step - 1, dir: -1 };
      if (p.chapter > 0) return { chapter: p.chapter - 1, step: CHAPTERS[p.chapter - 1].steps.length - 1, dir: -1 };
      return p;
    });
  }, []);

  // La dirección refleja el capítulo actual; atrás/adelante del navegador también navegan.
  useEffect(() => {
    const target = `#/${chapter.id}${pos.step ? `/${pos.step}` : ''}`;
    if (window.location.hash !== target) window.history.replaceState(null, '', target);
  }, [chapter.id, pos.step]);
  useEffect(() => {
    const onHash = () => {
      const h = fromHash();
      go(h.chapter, h.step);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target) || document.body.dataset.dialog) return;
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault();
        next();
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        prev();
      } else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(CHAPTERS.length - 1, 99);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, go]);

  // Deslizar en tableta.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') touch.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const t = touch.current;
    touch.current = null;
    if (!t) return;
    const dx = e.clientX - t.x;
    if (Math.abs(dx) > 70 && Math.abs(e.clientY - t.y) < 50) (dx < 0 ? next : prev)();
  };

  const isFirst = pos.chapter === 0 && pos.step === 0;
  const isLast = pos.chapter === CHAPTERS.length - 1 && pos.step === chapter.steps.length - 1;
  const totalScreens = CHAPTERS.reduce((a, c) => a + c.steps.length, 0);
  const screen = CHAPTERS.slice(0, pos.chapter).reduce((a, c) => a + c.steps.length, 0) + pos.step + 1;

  return (
    <MotionConfig reducedMotion="user">
      <div className="report flex h-dvh w-full overflow-hidden bg-white text-ink">
        <aside className="hidden w-[240px] shrink-0 flex-col border-r border-line px-6 py-8 xl:flex">
          <button type="button" onClick={() => go(0)} className="text-left">
            <span className="display block text-[22px] leading-[1.05] text-navy-900">Cartagena en Conversación</span>
          </button>
          <p className="mt-2 text-[12.5px] leading-snug text-ink-muted">
            {fmtDate(story.period.from)} – {fmtDate(story.period.to)}
          </p>
          <nav className="mt-10 flex flex-col gap-1" aria-label="Capítulos">
            {CHAPTERS.map((c, i) => {
              const active = i === pos.chapter;
              return (
                <div key={c.id}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={active ? 'step' : undefined}
                    className={`relative w-full py-2 pl-4 text-left text-[14px] leading-snug transition-colors ${active ? 'font-semibold text-navy-900' : 'text-ink-muted hover:text-navy-900'}`}
                  >
                    {active && <motion.span layoutId="rail-mark" className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-full bg-accent" transition={{ duration: 0.4, ease: EASE }} />}
                    {c.label}
                  </button>
                  {active && c.steps.length > 1 && (
                    <div className="mb-1 ml-4 flex flex-col gap-0.5 border-l border-line pl-3">
                      {c.steps.map((st, k) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => go(i, k)}
                          aria-current={k === pos.step ? 'step' : undefined}
                          className={`py-1 text-left text-[13px] ${k === pos.step ? 'text-navy-900' : 'text-ink-faint hover:text-navy-900'}`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          <div className="mt-auto space-y-3 text-[12px] leading-snug text-ink-faint">
            <p>Fuente: Brand24. Conversación digital registrada; no mide audiencias de medios ni intención de voto.</p>
            <a href="#/admin" className="inline-flex items-center gap-1.5 font-medium text-ink-muted hover:text-navy-900">
              <Settings2 size={14} aria-hidden /> Datos y revisión
            </a>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 md:px-10 xl:hidden">
            <button type="button" onClick={() => go(0)} className="display text-[18px] text-navy-900">
              Cartagena en Conversación
            </button>
            <span className="truncate text-[13px] text-ink-muted">
              {chapter.label}
              {chapter.steps.length > 1 ? `: ${chapter.steps[pos.step].toLowerCase()}` : ''}
            </span>
          </header>

          <main className="relative min-h-0 flex-1 touch-pan-y overflow-hidden" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
            <AnimatePresence mode="wait" custom={pos.dir} initial={false}>
              <motion.section
                key={`${pos.chapter}-${pos.step}`}
                custom={pos.dir}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: d * 48 }),
                  center: { opacity: 1, x: 0 },
                  exit: (d: number) => ({ opacity: 0, x: d * -48 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.45, ease: EASE }}
                aria-label={chapter.steps.length > 1 ? `${chapter.label}: ${chapter.steps[pos.step]}` : chapter.label}
                className="absolute inset-0 overflow-y-auto overflow-x-hidden"
              >
                {chapter.render(story, pos.step, go)}
              </motion.section>
            </AnimatePresence>
          </main>

          <footer className="flex items-center gap-4 border-t border-line px-5 py-3 md:px-10">
            <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-navy-100" aria-hidden>
              <motion.div className="h-full rounded-full bg-navy-900" animate={{ width: `${(screen / totalScreens) * 100}%` }} transition={{ duration: 0.5, ease: EASE }} />
            </div>
            <a href="#/admin" className="text-ink-faint hover:text-navy-900 xl:hidden" aria-label="Datos y revisión">
              <Settings2 size={18} />
            </a>
            <div className="flex gap-2">
              <button type="button" onClick={prev} disabled={isFirst} aria-label="Anterior" className="grid h-10 w-10 place-items-center rounded-full border border-line text-navy-900 transition-colors hover:border-navy-900 disabled:opacity-30">
                <ArrowLeft size={18} />
              </button>
              <button type="button" onClick={next} disabled={isLast} aria-label="Siguiente" className="grid h-10 w-10 place-items-center rounded-full bg-navy-900 text-white transition-colors hover:bg-navy-800 disabled:opacity-30">
                <ArrowRight size={18} />
              </button>
            </div>
          </footer>
        </div>
      </div>
    </MotionConfig>
  );
}
