import { useMemo } from 'react';
import { buildConclusions } from '../lib/conclusions';
import { candidateStats, topicStats } from '../lib/metrics';
import { fmtDate } from '../lib/format';
import { Section } from '../components/ui';
import type { View } from './view';

export default function Conclusiones({ v }: { v: View }) {
  // Las conclusiones se calculan sobre la base completa para que no cambien con los filtros.
  const items = useMemo(() => buildConclusions({ stats: candidateStats(v.base), topics: topicStats(v.base) }), [v.base]);
  const dates = v.base.map((m) => m.date).sort();

  return (
    <Section
      id="conclusiones"
      kicker="Para la reunión"
      title="Conclusiones"
      lead={
        <>
          Calculadas sobre la base completa ({fmtDate(dates[0])} – {fmtDate(dates[dates.length - 1])}). Describen presencia registrada, no intención de voto.
        </>
      }
    >
      <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {items.map((c, i) => (
          <li key={c.id} className={`card flex flex-col p-5 ${i === 0 ? 'border-navy-900 bg-navy-900 text-white' : ''}`}>
            <p className={`text-[13px] font-semibold leading-snug ${i === 0 ? 'text-white' : 'text-navy-900'}`}>{c.title}</p>
            <p className={`mt-3 font-display leading-none ${c.figure.length > 8 ? 'text-[28px]' : 'text-[38px]'} ${i === 0 ? 'text-white' : 'text-accent'}`}>{c.figure}</p>
            <p className={`mt-1 text-[11.5px] ${i === 0 ? 'text-navy-300' : 'text-ink-muted'}`}>{c.figureLabel}</p>
            <p className={`mt-4 border-t pt-3 text-[13px] leading-snug ${i === 0 ? 'border-white/15 text-navy-100' : 'border-line text-ink'}`}>{c.text}</p>
          </li>
        ))}
      </ol>
      <p className="mt-5 max-w-4xl text-xs leading-relaxed text-ink-muted">
        Alcance: conversación digital capturada por Brand24 entre enero y octubre de 2026. Las brechas reflejan lo registrado y la forma de captura (por ejemplo,
        hilos de medios con muchos comentarios); no son una recomendación electoral ni una medición de audiencias de prensa, radio o televisión.
      </p>
    </Section>
  );
}
