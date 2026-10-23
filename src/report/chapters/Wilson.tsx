import { useState } from 'react';
import { motion } from 'motion/react';
import { fmt, fmtPct } from '../../lib/format';
import { PLATFORMS } from '../../lib/config';
import { pct } from '../../lib/metrics';
import type { Story } from '../story';
import { Legend, monthLong } from '../chart';
import { Dialog, EASE, LinkButton, Reveal, SENT_FILL, Slide, Stat, Takeaway } from '../ui';

function SplitBar({ own, third }: { own: number; third: number }) {
  const total = own + third || 1;
  return (
    <div>
      <div className="flex h-11 w-full gap-[2px] overflow-hidden rounded-[6px]">
        <motion.div
          className="flex items-center bg-navy-900 pl-3 text-[15px] font-semibold text-white"
          initial={{ width: 0 }}
          animate={{ width: `${pct(own, total)}%` }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}
        >
          {fmt(own)}
        </motion.div>
        <motion.div
          className="flex items-center bg-accent pl-3 text-[15px] font-semibold text-white"
          initial={{ width: 0 }}
          animate={{ width: `${pct(third, total)}%` }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.45 }}
        >
          {fmt(third)}
        </motion.div>
      </div>
      <div className="mt-2 flex justify-between gap-4 text-[13px] text-ink-muted">
        <span>Publicaciones propias ({fmtPct(pct(own, total))})</span>
        <span>Menciones de terceros ({fmtPct(pct(third, total))})</span>
      </div>
    </div>
  );
}

function Monthly({ data }: { data: Story['wilson']['monthly'] }) {
  const max = Math.max(1, ...data.map((d) => d.propia + d.terceros));
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[14px] font-semibold text-navy-900">Registros directos por mes</p>
        <Legend
          items={[
            { label: 'Propios', color: '#0B1F3A' },
            { label: 'De terceros', color: '#C8102E' },
          ]}
        />
      </div>
      <div className="flex h-[clamp(96px,17vh,160px)] items-end gap-[6px] border-b border-line md:gap-2">
        {data.map((d, i) => {
          const total = d.propia + d.terceros;
          return (
            <div key={d.month} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${monthLong(d.month)}: ${d.propia} propios, ${d.terceros} de terceros`}>
              <span className="mb-1 text-center text-[12px] font-semibold text-navy-900">{total || ''}</span>
              <motion.div
                className="flex flex-col justify-end gap-[2px] overflow-hidden"
                initial={{ height: 0 }}
                animate={{ height: `${(total / max) * 100}%` }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.3 + i * 0.05 }}
              >
                {d.terceros > 0 && <div className="rounded-t-[4px] bg-accent" style={{ flex: d.terceros }} />}
                {d.propia > 0 && <div className={`bg-navy-900 ${d.terceros ? '' : 'rounded-t-[4px]'}`} style={{ flex: d.propia }} />}
              </motion.div>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[6px] md:gap-2">
        {data.map((d) => (
          <span key={d.month} className="min-w-0 flex-1 text-center text-[11px] text-ink-faint">
            {monthLong(d.month).slice(0, 3)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Wilson({ s }: { s: Story }) {
  const [open, setOpen] = useState(false);
  const w = s.wilson;
  const st = w.s;
  const topics = w.topics.slice(0, 4);
  const ownTop = [...PLATFORMS].sort((a, b) => st.platforms[b].propia - st.platforms[a].propia)[0];

  return (
    <Slide
      headline={
        <>
          Wilson Toncel se escucha sobre todo en su propia voz: {fmt(st.propia)} de sus {fmt(st.direct)} registros los publicó él
        </>
      }
    >
      <div className="grid min-h-0 flex-1 gap-8 lg:grid-cols-[minmax(240px,0.85fr)_2fr] lg:gap-12">
        <div className="grid grid-cols-3 content-start gap-x-5 gap-y-[clamp(0.75rem,2.5vh,1.5rem)] lg:grid-cols-1">
          <Reveal>
            <Stat size="xl" tone="red" value={st.direct} label="registros directos entre enero y octubre" />
          </Reveal>
          <Reveal>
            <Stat size="md" value={st.share} format={(n) => fmtPct(n, 1)} label={`de las menciones de terceros a las siete figuras; puesto ${w.rank} de 7`} />
          </Reveal>
          <Reveal>
            <Stat size="md" value={w.othersMedian} label={`menciones de terceros recibe la figura mediana del grupo, frente a ${fmt(st.espontanea)} de Wilson`} />
          </Reveal>
        </div>

        <div className="flex min-w-0 flex-col gap-[clamp(1rem,3vh,1.75rem)]">
          <Reveal>
            <SplitBar own={st.propia} third={st.espontanea} />
          </Reveal>
          <Reveal>
            <Monthly data={w.monthly} />
          </Reveal>
          <Reveal>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-[13px] font-semibold text-navy-900">Temas que más aparecen</p>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink">
                  {topics.map((t, i) => (
                    <span key={t.id}>
                      {t.label} <b className="text-navy-900">{t.n}</b>
                      {i < topics.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-navy-900">Sentimiento registrado</p>
                <p className="mt-1.5 flex flex-wrap gap-x-4 text-[14.5px] text-ink">
                  {(['positivo', 'neutral', 'negativo'] as const).map((k) => (
                    <span key={k} className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: SENT_FILL[k] }} aria-hidden />
                      <b className="text-navy-900">{w.sentiment[k]}</b> {k === 'positivo' ? 'positivos' : k === 'neutral' ? 'neutrales' : 'negativos'}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          </Reveal>
          <Takeaway action={<LinkButton onClick={() => setOpen(true)}>Límites de la cobertura</LinkButton>}>
            Su visibilidad en la muestra es baja y la construye él mismo, sobre todo en {ownTop} ({fmt(st.platforms[ownTop].propia)} de {fmt(st.propia)} publicaciones). Con {fmt(st.espontanea)} menciones de terceros, la muestra es
            demasiado pequeña para medir percepción: la ausencia de negativos no equivale a una valoración favorable.
          </Takeaway>
        </div>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Qué no alcanza a medir esta muestra">
        <ul className="list-disc space-y-2 pl-5">
          {st.coverageNotes.map((n) => (
            <li key={n}>{n}</li>
          ))}
          <li>
            Facebook reúne el {fmtPct(w.facebookOthersShare)} de las menciones de terceros a las demás figuras; a Wilson lo nombran allí{' '}
            {fmt(st.platforms.Facebook.espontanea)} {st.platforms.Facebook.espontanea === 1 ? 'vez' : 'veces'}.
          </li>
          <li>Las publicaciones propias se registran, pero no los comentarios que reciben: su conversación con la ciudadanía queda fuera de la muestra.</li>
        </ul>
        <p className="text-ink-muted">Ampliar la captura a los comentarios de sus cuentas y a más páginas de Facebook permitiría comparar con las demás figuras.</p>
      </Dialog>
    </Slide>
  );
}
