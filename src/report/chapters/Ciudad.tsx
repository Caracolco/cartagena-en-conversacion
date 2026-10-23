import { motion } from 'motion/react';
import { fmt, fmtPct } from '../../lib/format';
import type { TopicId } from '../../lib/types';
import type { Story } from '../story';
import { Legend } from '../chart';
import { EASE, Reveal, Slide, Takeaway } from '../ui';

/** Qué abarca cada tema, según las reglas de detección (src/lib/config.ts). */
const TOPIC_SCOPE: Record<TopicId, string> = {
  gestion: 'Concejo, Alcaldía, presupuesto, contratación y denuncias de corrupción',
  elecciones: 'candidaturas, sondeos, votos y campaña',
  infraestructura: 'obras, vías, puentes y construcción',
  seguridad: 'inseguridad, delitos, violencia y Policía',
  movilidad: 'tránsito, Transcaribe, peajes y transporte',
  cultura: 'deporte, fiestas y eventos culturales',
  empleo: 'empleo, comercio, precios e impuestos',
  ambiente: 'árboles, calor, ciénagas, contaminación y animales',
  servicios: 'energía, agua, tarifas, aseo e inundaciones',
  salud: 'hospitales, EPS, enfermedades y urgencias',
};

export default function Ciudad({ s }: { s: Story }) {
  const rows = s.topics.rows;
  const max = rows[0]?.total ?? 1;
  const [t1, t2] = rows;
  const [c1, c2] = s.topics.critical;
  const critical = new Set(s.topics.critical.map((c) => c.label));

  return (
    <Slide
      headline={
        <>
          {t1.label} y {t2.label.toLowerCase()} dominan la conversación; {c1.label.toLowerCase()} y {c2.label.toLowerCase()} concentran la crítica
        </>
      }
      lead="Temas detectados en el propio texto de cada publicación o comentario. Un registro puede tocar varios temas."
    >
      <div className="grid min-h-0 flex-1 gap-8 lg:grid-cols-[2fr_minmax(240px,0.8fr)] lg:gap-12">
        <div className="min-w-0">
          <Reveal className="mb-4">
            <Legend
              items={[
                { label: 'Registros sobre el tema', color: '#13315C' },
                { label: 'De ellos, negativos', color: '#C8102E' },
              ]}
            />
          </Reveal>
          <ul className="flex flex-col gap-2.5">
            {rows.map((t, i) => {
              const hot = critical.has(t.label);
              return (
                <motion.li
                  key={t.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.15 + i * 0.05 }}
                  className="grid grid-cols-[minmax(128px,170px)_1fr_auto] items-center gap-x-4"
                  title={`${t.label}: ${fmt(t.total)} registros, ${fmt(t.negativo)} negativos`}
                >
                  <span className={`truncate text-[15px] ${i < 2 ? 'font-bold text-navy-900' : hot ? 'font-semibold text-navy-900' : 'text-ink'}`}>{t.label}</span>
                  <div className="relative h-[20px] min-w-0">
                    <motion.div
                      className="absolute inset-y-0 left-0 flex gap-[2px] overflow-hidden rounded-r-[4px]"
                      initial={{ width: 0 }}
                      animate={{ width: `${(t.total / max) * 100}%` }}
                      transition={{ duration: 0.9, ease: EASE, delay: 0.25 + i * 0.05 }}
                    >
                      <div className="h-full bg-navy-800" style={{ flex: t.total - t.negativo }} />
                      <div className="h-full bg-accent" style={{ flex: t.negativo }} />
                    </motion.div>
                  </div>
                  <span className="w-[7.5em] text-right text-[13px] text-ink-muted">
                    <b className="figure-num mr-1.5 text-[19px] text-navy-900">{fmt(t.total)}</b>
                    {fmtPct(t.negRate)} neg.
                  </span>
                </motion.li>
              );
            })}
          </ul>
        </div>
        <div className="flex flex-col justify-end gap-6">
          <Reveal>
            <p className="figure-num text-[clamp(2.6rem,1.8rem+2.6vw,4.4rem)] text-navy-900">{fmt(t1.total)}</p>
            <p className="mt-2 text-[14px] leading-snug text-ink-muted">
              registros sobre {t1.label.toLowerCase()}: {TOPIC_SCOPE[t1.id]}.
            </p>
          </Reveal>
          <Takeaway>
            {t1.id === 'gestion' && t2.id === 'elecciones'
              ? 'La ciudadanía discute sobre todo cómo se gobierna Cartagena y quién la gobernará.'
              : `${t1.label} y ${t2.label.toLowerCase()} son los temas con más registros.`}{' '}
            Los temas cotidianos pesan menos en volumen, pero{' '}
            {c1.label.toLowerCase()} ({fmtPct(c1.negRate)} negativos) y {c2.label.toLowerCase()} ({fmtPct(c2.negRate)}) son donde el reclamo es más frecuente.
          </Takeaway>
        </div>
      </div>
    </Slide>
  );
}
