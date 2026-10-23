import { useState } from 'react';
import { motion } from 'motion/react';
import { CircleAlert } from 'lucide-react';
import { fmt, fmtPct } from '../../lib/format';
import { FOCUS, type FigureRow, type Story } from '../story';
import { Dialog, EASE, LinkButton, Reveal, Slide, Takeaway } from '../ui';

function Bar({ value, max, color, delay, label }: { value: number; max: number; color: string; delay: number; label: string }) {
  const w = max ? Math.max((value / max) * 100, value ? 0.8 : 0) : 0;
  return (
    <div className="flex min-w-0 items-center gap-2.5" title={label}>
      <div className="relative h-[16px] min-w-0 flex-1">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-r-[4px]"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${w}%` }}
          transition={{ duration: 0.9, ease: EASE, delay }}
        />
      </div>
      <span className="figure-num w-[3.2em] shrink-0 text-right text-[19px] text-navy-900">{fmt(value)}</span>
    </div>
  );
}

function Row({ r, max, i, onInfo }: { r: FigureRow; max: number; i: number; onInfo: () => void }) {
  const focus = r.id === FOCUS;
  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.15 + i * 0.06 }}
      className={`grid grid-cols-[minmax(118px,0.9fr)_1.3fr_1.3fr] items-center gap-x-4 rounded-lg px-2 py-[clamp(0.2rem,0.9vh,0.5rem)] md:gap-x-8 md:px-3 ${focus ? 'bg-accent-soft' : ''}`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <p className={`truncate text-[14.5px] leading-tight ${focus ? 'font-bold text-accent' : 'font-semibold text-navy-900'}`}>{r.name}</p>
        {r.limited && (
          <button type="button" onClick={onInfo} className="shrink-0 text-ink-faint hover:text-navy-900" aria-label={`${r.name}: cobertura limitada, ver detalle`} title="Cobertura limitada">
            <CircleAlert size={14} />
          </button>
        )}
      </div>
      <Bar value={r.direct} max={max} color={focus ? '#C8102E' : '#0B1F3A'} delay={0.25 + i * 0.06} label={`${r.name}: ${fmt(r.propia)} propias y ${fmt(r.espontanea)} de terceros`} />
      <Bar value={r.contexto} max={max} color="#C3D0E3" delay={0.35 + i * 0.06} label={`${r.name}: ${fmt(r.contexto)} comentarios en hilos sobre la figura que no la nombran`} />
    </motion.li>
  );
}

export default function Figuras({ s }: { s: Story }) {
  const [open, setOpen] = useState(false);
  const rows = s.figures.rows;
  const max = Math.max(...rows.map((r) => Math.max(r.direct, r.contexto)));
  const bySpont = [...rows].sort((a, b) => b.espontanea - a.espontanea);
  const w = rows.find((r) => r.id === FOCUS)!;
  const rank = bySpont.findIndex((r) => r.id === FOCUS) + 1;

  return (
    <Slide
      headline={
        <>
          {bySpont[0].name} y {bySpont[1].name} reúnen el {fmtPct(s.figures.top2Share)} de las menciones de terceros. Wilson Toncel suma {fmt(w.espontanea)}
        </>
      }
      lead="Directas: la nombran o las publica ella. Contexto: comentarios en hilos sobre ella que no la nombran; muestran alcance, no apoyo."
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5">
        <Reveal>
          <div className="grid grid-cols-[minmax(118px,0.9fr)_1.3fr_1.3fr] gap-x-4 px-2 text-[13px] font-semibold text-navy-900 md:gap-x-8 md:px-3">
            <span />
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-navy-900" /> Menciones directas
            </span>
            <span className="inline-flex flex-wrap items-center gap-x-5 gap-y-1">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-mist" /> Conversación de contexto
              </span>
              <span className="inline-flex items-center gap-1.5 font-normal text-ink-muted">
                <CircleAlert size={13} aria-hidden /> Cobertura limitada
              </span>
            </span>
          </div>
        </Reveal>
        <ul className="flex flex-col gap-0.5">
          {rows.map((r, i) => (
            <Row key={r.id} r={r} max={max} i={i} onInfo={() => setOpen(true)} />
          ))}
        </ul>
        <Takeaway action={<LinkButton onClick={() => setOpen(true)}>Cómo se atribuye cada registro</LinkButton>}>
          Wilson ocupa el puesto {rank} de 7 en menciones de terceros ({fmtPct(w.share, 1)} de {fmt(s.figures.totalSpont)}) y no aparece en los grandes hilos
          de la campaña, por eso no tiene conversación de contexto. La mayor parte del volumen de las figuras líderes viene de esos hilos.
        </Takeaway>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Cómo se atribuye cada registro">
        <p>
          Una figura recibe una <b>mención directa</b> si publica desde su cuenta o si un tercero la nombra en su propio texto. Un registro puede nombrar a varias
          figuras ({fmt(s.figures.multiFigure)} casos) y cuenta para cada una.
        </p>
        <p>
          La <b>conversación de contexto</b> se hereda del hilo: un comentario sin nombre propio en un sondeo sobre varias figuras cuenta como contexto para todas
          ellas. Por eso esa columna no se suma entre figuras.
        </p>
        <div className="space-y-2 border-t border-line pt-3">
          {rows
            .filter((r) => r.limited || r.identity)
            .map((r) => (
              <p key={r.id} className="text-[14px]">
                <b className="text-navy-900">{r.name}.</b> {[r.identity, ...r.notes].filter(Boolean).join(' ')}
              </p>
            ))}
        </div>
      </Dialog>
    </Slide>
  );
}
