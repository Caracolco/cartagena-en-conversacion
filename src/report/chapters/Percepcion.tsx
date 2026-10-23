import { useState } from 'react';
import { motion } from 'motion/react';
import { fmt, fmtDate, fmtPct } from '../../lib/format';
import { pct } from '../../lib/metrics';
import type { Sentiment } from '../../lib/types';
import type { Evidence, Story } from '../story';
import { Dialog, EASE, LinkButton, Reveal, rise, SENT_FILL, SENT_TEXT, SentimentTag, Slide, SourceLink, Takeaway } from '../ui';

const MAX_CHARS = 200;

/** Recorta en el último espacio para no partir palabras; el texto completo queda en la ventana de detalle. */
export function excerpt(text: string, max = MAX_CHARS): { text: string; cut: boolean } {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return { text: t, cut: false };
  const at = t.lastIndexOf(' ', max);
  return { text: `${t.slice(0, at > max * 0.6 ? at : max)}…`, cut: true };
}

function EvidenceCard({ e, onOpen }: { e: Evidence; onOpen: () => void }) {
  const ex = excerpt(e.text);
  return (
    <motion.article variants={rise} className="flex h-full flex-col rounded-2xl border border-line bg-white p-5" data-evidence={e.id}>
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-[13px] font-semibold text-navy-900">{e.about}</span>
        <SentimentTag s={e.sentiment} />
      </div>
      <blockquote className="mt-2 flex-1">
        <span className="mb-2.5 block h-[3px] w-7 rounded-full bg-accent" aria-hidden />
        <p className="text-[clamp(14px,0.8rem+0.25vw,15.5px)] leading-relaxed text-ink">{ex.text}</p>
      </blockquote>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line pt-3 text-[12.5px] text-ink-muted">
        <span className="min-w-0 truncate">
          {e.isComment ? 'Comentario' : 'Publicación'} en {e.platform}, {fmtDate(e.date)}
        </span>
        <span className="flex items-center gap-3">
          <button type="button" onClick={onOpen} className="font-semibold text-navy-700 hover:text-accent">
            {ex.cut ? 'Leer completo' : 'Detalle'}
          </button>
          <SourceLink href={e.link} />
        </span>
      </div>
    </motion.article>
  );
}

function EvidenceDialog({ e, onClose }: { e: Evidence | null; onClose: () => void }) {
  return (
    <Dialog open={!!e} onClose={onClose} title={e?.about ?? ''}>
      {e && (
        <>
          <p className="whitespace-pre-line">{e.text}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-line pt-3 text-[13.5px]">
            <dt className="text-ink-muted">Autor</dt>
            <dd>{e.author || 'No disponible'}</dd>
            <dt className="text-ink-muted">Plataforma</dt>
            <dd>
              {e.platform}, {fmtDate(e.date)}
            </dd>
            <dt className="text-ink-muted">Sentimiento</dt>
            <dd>{SENT_TEXT[e.sentiment]}</dd>
            <dt className="text-ink-muted">Por qué se eligió</dt>
            <dd>{e.why}</dd>
          </dl>
          <SourceLink href={e.link} />
        </>
      )}
    </Dialog>
  );
}

function SentimentBar({ counts, total }: { counts: Record<Sentiment, number>; total: number }) {
  const order: Sentiment[] = ['positivo', 'neutral', 'negativo'];
  return (
    <div>
      <div className="flex h-[clamp(2.25rem,6vh,3.5rem)] w-full gap-[2px] overflow-hidden rounded-[6px]">
        {order.map((k, i) => (
          <motion.div
            key={k}
            style={{ background: SENT_FILL[k] }}
            initial={{ width: 0 }}
            animate={{ width: `${pct(counts[k], total)}%` }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.25 + i * 0.12 }}
            title={`${SENT_TEXT[k]}: ${fmt(counts[k])}`}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-4">
        {order.map((k) => (
          <div key={k}>
            <p className={`figure-num text-[clamp(2rem,min(1.6rem+2vw,7vh),3.6rem)] ${k === 'negativo' ? 'text-accent' : 'text-navy-900'}`}>{fmtPct(pct(counts[k], total))}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[13.5px] text-ink-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: SENT_FILL[k] }} aria-hidden />
              {SENT_TEXT[k]}, {fmt(counts[k])} registros
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tono({ s }: { s: Story }) {
  const [open, setOpen] = useState<Evidence | null>(null);
  const { counts, total, ratio, negToFigures, posToFigures } = s.sentiment;
  return (
    <Slide headline={<>El tono dominante es neutral, y los mensajes positivos {ratio} a los negativos</>}>
      <div className="flex min-h-0 flex-1 flex-col gap-[clamp(1rem,3vh,1.75rem)]">
        <div className="grid items-end gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-10">
          <Reveal>
            <SentimentBar counts={counts} total={total} />
          </Reveal>
          <Takeaway>
            El {fmtPct(negToFigures)} de la crítica se dirige a figuras o candidaturas; el resto apunta a la gestión de la ciudad y al Gobierno nacional. También el{' '}
            {fmtPct(posToFigures)} de los mensajes positivos habla de una figura: la valoración se personaliza en ambos sentidos.
          </Takeaway>
        </div>
        <motion.div variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.4 } } }} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-3">
          {s.evidence.percepcion.map((e) => (
            <EvidenceCard key={e.id} e={e} onOpen={() => setOpen(e)} />
          ))}
        </motion.div>
      </div>
      <EvidenceDialog e={open} onClose={() => setOpen(null)} />
    </Slide>
  );
}

function Voces({ group }: { group: { headline: string; items: Evidence[] } }) {
  const [open, setOpen] = useState<Evidence | null>(null);
  return (
    <Slide
      headline={group.headline}
      lead="Publicaciones y comentarios reales, sin editar. Se eligieron por representar un tema o una figura, no por ser los más extremos."
    >
      <motion.div variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-3">
        {group.items.map((e) => (
          <EvidenceCard key={e.id} e={e} onOpen={() => setOpen(e)} />
        ))}
      </motion.div>
      <EvidenceDialog e={open} onClose={() => setOpen(null)} />
    </Slide>
  );
}

function Conclusiones({ s }: { s: Story }) {
  const [open, setOpen] = useState(false);
  return (
    <Slide
      headline={
        s.figures.top2Share >= 60
          ? 'La conversación tiene dos protagonistas; la visibilidad de Wilson Toncel depende de su propia voz'
          : 'Cinco hallazgos sobre la conversación digital y la visibilidad de Wilson Toncel'
      }
    >
      <ol className="grid gap-x-10 border-t border-line md:grid-cols-2" aria-label="Conclusiones">
        {s.conclusions.map((c, i) => (
          <motion.li
            key={c.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.2 + i * 0.09 }}
            className={`border-b border-line py-[clamp(0.7rem,2vh,1.1rem)] ${i === 0 ? 'md:col-span-2' : ''}`}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <p className={`figure-num text-[clamp(1.8rem,min(1.3rem+1.4vw,5vh),2.8rem)] ${i === 0 ? 'text-accent' : 'text-navy-900'}`}>{c.figure}</p>
              <p className="max-w-[36ch] text-[12.5px] leading-snug text-ink-muted">{c.figureLabel}</p>
            </div>
            <h3 className="mt-1.5 text-[15.5px] font-bold leading-snug text-navy-900">{c.title}</h3>
            <p className="mt-0.5 max-w-[84ch] text-[13.5px] leading-normal text-ink">{c.text}</p>
          </motion.li>
        ))}
      </ol>
      <Reveal className="mt-4">
        <p className="max-w-[90ch] text-[12.5px] leading-relaxed text-ink-muted">
          Mide la conversación digital registrada por Brand24; no mide audiencias de prensa, radio o televisión ni intención de voto, y no contiene
          recomendaciones electorales. <LinkButton onClick={() => setOpen(true)}>Cómo se depuró la base</LinkButton>
        </p>
      </Reveal>
      <Dialog open={open} onClose={() => setOpen(false)} title="Cómo se depuró la base">
        <p>
          Brand24 capturó {fmt(s.rawRows)} filas. Se eliminaron los duplicados por identificador y quedaron {fmt(s.cleaned)} registros depurados; {fmt(s.copies)}{' '}
          copias probables se apartan del conteo, así que el informe analiza {fmt(s.analyzed)}.
        </p>
        <p>
          Se excluyeron homónimos (Armando Benedetti, el exalcalde Campo Elías Teherán) y los casos de identidad dudosa quedan pendientes de validación. La
          conversación de Óscar Torres se separa entre institucional (ANI, vías, peajes) y política.
        </p>
        <p>
          Sentimiento y temas se clasifican con reglas en español que consideran negaciones, ironía básica y a quién se dirige la crítica. Cualquier registro puede
          revisarse en la sección <a className="font-semibold text-navy-700 underline" href="#/admin">Datos y revisión</a>.
        </p>
      </Dialog>
    </Slide>
  );
}

export default function Percepcion({ s, step }: { s: Story; step: number }) {
  if (step === 1) return <Voces group={s.evidence.ciudad} />;
  if (step === 2) return <Voces group={s.evidence.figuras} />;
  if (step === 3) return <Conclusiones s={s} />;
  return <Tono s={s} />;
}
