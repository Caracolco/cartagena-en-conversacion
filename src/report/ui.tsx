import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { animate, AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import { ExternalLink, X } from 'lucide-react';
import { fmt } from '../lib/format';
import type { Sentiment } from '../lib/types';

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Variantes compartidas: el contenedor escalona a sus hijos al entrar en pantalla. */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={rise} className={className}>
      {children}
    </motion.div>
  );
}

/** Pantalla de capítulo: titular arriba, contenido debajo, todo dentro del alto de la ventana. */
export function Slide({ headline, lead, children }: { headline: ReactNode; lead?: ReactNode; children: ReactNode }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto flex min-h-full w-full max-w-[1240px] flex-col gap-[clamp(1rem,3vh,2rem)] px-5 py-[clamp(1.25rem,4vh,2.5rem)] md:px-10 xl:px-14">
      <motion.header variants={rise} className="max-w-[900px]">
        <h2 className="display text-balance text-[clamp(1.7rem,min(1.1rem+2.1vw,5.5vh),3.1rem)] font-medium leading-[1.06] text-navy-900">{headline}</h2>
        {lead && <p className="mt-3 max-w-[68ch] text-[clamp(0.98rem,0.9rem+0.25vw,1.12rem)] leading-relaxed text-ink-muted">{lead}</p>}
      </motion.header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </motion.div>
  );
}

/** Cifra que cuenta desde cero al entrar el capítulo. */
export function CountUp({ value, format = fmt, className = '' }: { value: number; format?: (n: number) => string; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    const c = animate(0, value, { duration: 1.1, ease: EASE, onUpdate: setShown });
    return () => c.stop();
  }, [value, reduce]);
  return <span className={className}>{format(shown)}</span>;
}

export function Stat({ value, label, tone = 'navy', size = 'lg', format }: { value: number; label: ReactNode; tone?: 'navy' | 'red'; size?: 'xl' | 'lg' | 'md'; format?: (n: number) => string }) {
  const sz =
    size === 'xl'
      ? 'text-[clamp(3.4rem,min(2.4rem+5.2vw,13vh),7.5rem)]'
      : size === 'lg'
        ? 'text-[clamp(2.4rem,min(1.8rem+2.6vw,8vh),4.4rem)]'
        : 'text-[clamp(1.9rem,min(1.5rem+1.6vw,5.4vh),3rem)]';
  return (
    <div>
      <CountUp value={value} format={format} className={`figure-num block ${sz} ${tone === 'red' ? 'text-accent' : 'text-navy-900'}`} />
      <p className="mt-2 max-w-[28ch] text-[14px] leading-snug text-ink-muted">{label}</p>
    </div>
  );
}

/** El hallazgo de cada pantalla. */
export function Takeaway({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <motion.div variants={rise} className="border-l-[3px] border-accent pl-4">
      <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink">{children}</p>
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
}

export function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-[13.5px] font-semibold text-navy-700 underline decoration-navy-300 underline-offset-4 hover:decoration-navy-700">
      {children}
    </button>
  );
}

/** Ventana de detalle. Mientras está abierta, el teclado no cambia de capítulo. */
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    document.body.dataset.dialog = 'open';
    const prev = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      delete document.body.dataset.dialog;
      window.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-navy-950/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
          <motion.div
            ref={box}
            role="dialog"
            aria-modal="true"
            aria-labelledby={id}
            tabIndex={-1}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="relative max-h-[86dvh] w-full max-w-[640px] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl outline-none md:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 id={id} className="display text-[26px] leading-tight text-navy-900">
                {title}
              </h3>
              <button type="button" onClick={onClose} className="-mr-2 -mt-1 rounded-full p-2 text-ink-muted hover:bg-navy-50 hover:text-navy-900" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export const SENT_TEXT: Record<Sentiment, string> = { positivo: 'Positivo', negativo: 'Negativo', neutral: 'Neutral' };
export const SENT_FILL: Record<Sentiment, string> = { positivo: '#2E6BB0', neutral: '#B8C2D0', negativo: '#C8102E' };

export function SentimentTag({ s }: { s: Sentiment }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
      <span className="h-2 w-2 rounded-full" style={{ background: SENT_FILL[s] }} aria-hidden />
      {SENT_TEXT[s]}
    </span>
  );
}

export function SourceLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title="Abrir publicación original"
      className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-navy-700 hover:text-accent"
    >
      Ver original <ExternalLink size={13} aria-hidden />
    </a>
  );
}
