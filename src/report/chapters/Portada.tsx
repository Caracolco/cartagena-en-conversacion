import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { fmt, fmtDate } from '../../lib/format';
import { FOCUS, type Story } from '../story';
import { EASE, rise, stagger } from '../ui';

const ROWS = 30;
const CELL = 8;

/** Cada punto es una mención directa (propia o de terceros) de una figura; los de Wilson van en rojo. */
function DotField({ s }: { s: Story }) {
  const [hover, setHover] = useState<string | null>(null);
  const layout = useMemo(() => {
    const bands: { id: string; name: string; n: number; x0: number; cols: number }[] = [];
    let col = 0;
    // Wilson al final, para que el ojo recorra primero el volumen de las demás figuras.
    const order = [...s.figures.rows.filter((r) => r.id !== FOCUS), ...s.figures.rows.filter((r) => r.id === FOCUS)];
    for (const r of order) {
      const cols = Math.max(1, Math.ceil(r.direct / ROWS));
      bands.push({ id: r.id, name: r.name, n: r.direct, x0: col, cols });
      col += cols + 1;
    }
    return { bands, cols: col - 1 };
  }, [s]);

  const width = layout.cols * CELL;
  const height = ROWS * CELL;
  const total = layout.bands.reduce((a, b) => a + b.n, 0);
  const focus = layout.bands.find((b) => b.id === FOCUS)!;
  const shown = layout.bands.find((b) => b.id === hover);

  return (
    <figure className="w-full">
      <div className="relative">
        <svg viewBox={`-2 -2 ${width + 4} ${height + 4}`} className="block h-auto w-full" role="img" aria-label={`${fmt(total)} menciones directas de las siete figuras; ${fmt(focus.n)} son de Wilson Toncel.`}>
          {layout.bands.map((b) =>
            Array.from({ length: b.n }, (_, i) => {
              const c = b.x0 + Math.floor(i / ROWS);
              const r = ROWS - 1 - (i % ROWS);
              const isFocus = b.id === FOCUS;
              const delay = c * 0.011;
              return (
                <circle
                  key={`${b.id}-${i}`}
                  className={isFocus ? 'dot-focus' : 'dot'}
                  style={{ animationDelay: isFocus ? `${delay}s, ${1.5 + (i % 7) * 0.03}s` : `${delay}s` }}
                  cx={c * CELL + CELL / 2}
                  cy={r * CELL + CELL / 2}
                  r={isFocus ? 3 : 2.6}
                  fill={isFocus ? '#C8102E' : '#0B1F3A'}
                  opacity={hover && hover !== b.id ? 0.18 : isFocus ? 1 : 0.86}
                />
              );
            }),
          )}
          {layout.bands.map((b) => (
            <rect
              key={b.id}
              x={b.x0 * CELL - CELL / 2}
              y={-2}
              width={(b.cols + 1) * CELL}
              height={height + 4}
              fill="transparent"
              onPointerEnter={() => setHover(b.id)}
              onPointerLeave={() => setHover(null)}
            >
              <title>{`${b.name}: ${fmt(b.n)} menciones directas`}</title>
            </rect>
          ))}
        </svg>
        {shown && (
          <div className="pointer-events-none absolute -top-9 left-0 rounded-md bg-navy-900 px-2.5 py-1 text-[12.5px] text-white shadow-lg">
            {shown.name}: <b>{fmt(shown.n)}</b>
          </div>
        )}
      </div>
      <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-[13.5px] leading-snug text-ink-muted">
        <span>Cada punto es una mención directa a una de las siete figuras: {fmt(total)} en total.</span>
        <span className="font-semibold text-accent">Los rojos son de Wilson Toncel: {fmt(focus.n)}.</span>
      </figcaption>
    </figure>
  );
}

export default function Portada({ s, onStart }: { s: Story; onStart: () => void }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto grid min-h-full w-full max-w-[1240px] content-center items-center gap-10 px-5 py-10 md:px-10 lg:grid-cols-[1fr_1.1fr] xl:gap-14 xl:px-14">
      <div>
        <motion.p variants={rise} className="text-[14px] text-ink-muted">
          Escucha social del {fmtDate(s.period.from)} al {fmtDate(s.period.to)}
        </motion.p>
        <motion.h1 variants={rise} className="display mt-4 text-[clamp(2.8rem,min(1rem+4.6vw,12vh),6rem)] font-medium leading-[0.95] text-navy-900">
          Cartagena en Conversación
        </motion.h1>
        <motion.p variants={rise} className="mt-6 max-w-[46ch] text-[clamp(1.05rem,0.95rem+0.4vw,1.3rem)] leading-relaxed text-ink">
          Análisis de la conversación pública digital alrededor de las principales figuras políticas de Cartagena.
        </motion.p>
        <motion.p variants={rise} className="mt-4 max-w-[52ch] text-[14px] leading-relaxed text-ink-muted">
          {fmt(s.rawRows)} registros capturados por Brand24, depurados a {fmt(s.cleaned)}: sin duplicados, con homónimos excluidos y cada
          mención atribuida a su figura.
        </motion.p>
        <motion.button
          variants={rise}
          type="button"
          onClick={onStart}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-navy-900 px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-navy-800"
        >
          Comenzar el recorrido <ArrowRight size={17} aria-hidden />
        </motion.button>
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, ease: EASE, delay: 0.2 }} className="min-w-0">
        <DotField s={s} />
      </motion.div>
    </motion.div>
  );
}
