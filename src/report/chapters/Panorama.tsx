import { useState } from 'react';
import { motion } from 'motion/react';
import { fmt, fmtDay, fmtPct } from '../../lib/format';
import type { Story } from '../story';
import { Legend, monthLong, niceTicks, useWidth } from '../chart';
import { Dialog, EASE, LinkButton, Reveal, Slide, Stat, Takeaway } from '../ui';

const PAD = { l: 40, r: 12, t: 16, b: 28 };

function WeeklyChart({ s }: { s: Story }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  // Alto según la ventana, para que el capítulo quepa sin desplazarse.
  const H = Math.round(Math.min(340, Math.max(190, (typeof window === 'undefined' ? 800 : window.innerHeight) * 0.34)));
  const data = s.panorama.weekly;
  const max = Math.max(...data.map((d) => d.total));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const w = Math.max(0, width - PAD.l - PAD.r);
  const h = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (data.length > 1 ? (i / (data.length - 1)) * w : 0);
  const y = (v: number) => PAD.t + h - (v / top) * h;
  const line = (k: 'total' | 'directas') => data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d[k])}`).join('');
  const area = `${line('total')}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const peakIdx = data.findIndex((d) => d.week === s.panorama.peak.week);
  // Una etiqueta por mes, omitiendo la primera si queda pegada a la siguiente.
  const monthTicks = data
    .map((d, i) => ({ i, m: d.week.slice(0, 7) }))
    .filter((t, k, arr) => k === 0 || t.m !== arr[k - 1].m)
    .filter((t, k, arr) => !arr[k + 1] || x(arr[k + 1].i) - x(t.i) > 30);
  const hv = hover !== null ? data[hover] : null;

  return (
    <div ref={ref} className="relative w-full">
      {width > 0 && (
        <svg
          width={width}
          height={H}
          role="img"
          aria-label={`Registros por semana. Pico en la semana del ${fmtDay(s.panorama.peak.week)} con ${fmt(s.panorama.peak.total)}.`}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const i = Math.round(((e.clientX - r.left - PAD.l) / w) * (data.length - 1));
            setHover(i >= 0 && i < data.length ? i : null);
          }}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={width - PAD.r} y1={y(t)} y2={y(t)} stroke="#E9EDF3" />
              <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="fill-ink-faint text-[11px]">
                {fmt(t)}
              </text>
            </g>
          ))}
          {monthTicks.map((t) => (
            <text key={t.m} x={x(t.i)} y={H - 8} textAnchor="start" className="fill-ink-faint text-[11px]">
              {monthLong(t.m).slice(0, 3)}
            </text>
          ))}
          <motion.path d={area} fill="#E6ECF5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
          <motion.path d={line('total')} fill="none" stroke="#9DB3D1" strokeWidth={2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: EASE, delay: 0.2 }} />
          <motion.path d={line('directas')} fill="none" stroke="#0B1F3A" strokeWidth={2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: EASE, delay: 0.4 }} />
          {peakIdx >= 0 && (
            <g>
              <line x1={x(peakIdx)} x2={x(peakIdx)} y1={y(data[peakIdx].total)} y2={y(0)} stroke="#C8102E" strokeDasharray="3 3" />
              <circle cx={x(peakIdx)} cy={y(data[peakIdx].total)} r={4.5} fill="#C8102E" stroke="#fff" strokeWidth={2} />
            </g>
          )}
          {hv && hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={y(0)} stroke="#5B6678" strokeWidth={1} />
              <circle cx={x(hover)} cy={y(hv.total)} r={4} fill="#9DB3D1" stroke="#fff" strokeWidth={2} />
              <circle cx={x(hover)} cy={y(hv.directas)} r={4} fill="#0B1F3A" stroke="#fff" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}
      {hv && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-lg border border-line bg-white px-3 py-2 text-[12.5px] shadow-lg"
          style={{ left: Math.min(Math.max(x(hover) - 80, 0), width - 170) }}
        >
          <p className="font-semibold text-navy-900">Semana del {fmtDay(hv.week)}</p>
          <p className="text-ink-muted">
            <b className="text-ink">{fmt(hv.total)}</b> registros, <b className="text-ink">{fmt(hv.directas)}</b> directos
          </p>
        </div>
      )}
    </div>
  );
}

export default function Panorama({ s }: { s: Story }) {
  const [open, setOpen] = useState(false);
  const p = s.panorama;
  const recent = p.recent.months.map(monthLong).join(' y ');
  const peakThread = p.peak.thread;

  return (
    <Slide
      headline={
        <>
          El {fmtPct(p.recent.share)} de la conversación llegó en {recent}
        </>
      }
      lead={`La captura cubre ${fmt(s.analyzed)} registros entre enero y octubre, pero el volumen se disparó con la discusión electoral de los últimos meses.`}
    >
      <div className="grid min-h-0 flex-1 gap-8 lg:grid-cols-[minmax(220px,0.8fr)_2.2fr] lg:gap-12">
        <div className="grid grid-cols-2 content-start gap-x-6 gap-y-7 sm:grid-cols-3 lg:grid-cols-1">
          <Reveal>
            <Stat value={s.analyzed} label={`registros analizados, de ${fmt(s.cleaned)} depurados (${fmt(s.copies)} copias probables apartadas)`} />
          </Reveal>
          <Reveal>
            <Stat size="md" value={p.direct} label="nombran a una figura o son publicaciones suyas" />
          </Reveal>
          <Reveal>
            <Stat size="md" value={p.comments} label={`comentarios en ${fmt(p.threads)} hilos; ${fmt(p.posts)} son publicaciones`} />
          </Reveal>
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <Reveal className="min-w-0">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[14px] font-semibold text-navy-900">Registros por semana</p>
              <Legend
                items={[
                  { label: 'Todos los registros', color: '#9DB3D1', kind: 'line' },
                  { label: 'Menciones directas', color: '#0B1F3A', kind: 'line' },
                ]}
              />
            </div>
            <WeeklyChart s={s} />
          </Reveal>
          <Takeaway action={<LinkButton onClick={() => setOpen(true)}>Por qué importa la concentración</LinkButton>}>
            El pico llegó la semana del {fmtDay(p.peak.week)}, con {fmt(p.peak.total)} registros
            {peakThread ? `; ${fmt(peakThread.count)} salieron de un solo hilo de ${peakThread.author}` : ''}. En toda la muestra, el{' '}
            {fmtPct(p.concentration)} del volumen está en 10 hilos.
          </Takeaway>
        </div>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Una conversación concentrada">
        <p>
          Los 10 hilos más grandes reúnen el {fmtPct(p.concentration)} de los registros; {p.dominant.count} de ellos son publicaciones de {p.dominant.author}. Un
          hilo con cientos de comentarios pesa más que decenas de publicaciones aisladas.
        </p>
        <p>
          Los comentarios heredan del hilo la figura de la que se habla. Por eso el informe separa las <b>menciones directas</b> (alguien nombra a la figura o
          publica ella misma) de la <b>conversación de contexto</b> (comentarios en un hilo sobre la figura que no la nombran).
        </p>
        {peakThread && (
          <p className="rounded-lg bg-navy-50 p-3 text-[14px] text-ink-muted">
            Hilo del pico: «{peakThread.text.slice(0, 180)}
            {peakThread.text.length > 180 ? '…' : ''}»
          </p>
        )}
      </Dialog>
    </Slide>
  );
}
