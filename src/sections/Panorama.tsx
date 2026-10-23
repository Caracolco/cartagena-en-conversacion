import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMemo } from 'react';
import { concentration, overview, pct } from '../lib/metrics';
import { fmt, fmtDay, fmtPct } from '../lib/format';
import { Card, Empty, Kpi, Legend, Section, TooltipBox } from '../components/ui';
import { C, SENT_COLOR, SENT_LABEL, axisProps } from '../components/theme';
import type { Sentiment } from '../lib/types';
import type { View } from './view';

export default function Panorama({ v }: { v: View }) {
  const o = useMemo(() => overview(v.filtered), [v.filtered]);
  const conc = useMemo(() => concentration(v.filtered), [v.filtered]);
  const a = v.ds.audit;
  const negPct = pct(o.sentiment.negativo, o.total);

  return (
    <Section
      id="panorama"
      kicker="Visión de conjunto"
      title="Panorama general"
      lead={
        <>
          {fmt(o.total)} registros depurados en {fmt(o.threads)} hilos. El {fmtPct(pct(o.comments, o.total))} son comentarios y la conversación se
          concentra en pocos hilos.
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi tone="dark" label="Registros depurados" value={fmt(o.total)} sub={`de ${fmt(a.rawRows)} filas originales`} />
        <Kpi label="Publicaciones" value={fmt(o.posts)} sub={`${fmt(o.comments)} comentarios`} />
        <Kpi label="Menciones directas" value={fmt(o.direct)} sub="registros únicos; uno puede nombrar a varias figuras" />
        <Kpi label="Concentración" value={fmtPct(conc.share)} sub="del volumen está en los 10 hilos más grandes" tone="accent" />
        <Kpi label="Interacciones" value={fmt(o.interactions)} sub="en publicaciones y notas" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Evolución semanal"
          subtitle="Registros por semana y, dentro de ellos, los que nombran directamente a una figura"
          action={
            <Legend
              items={[
                { label: 'Total', color: C.navyLight },
                { label: 'Menciones directas', color: C.navy },
              ]}
            />
          }
        >
          {o.weekly.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={o.weekly} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={C.grid} />
                <XAxis dataKey="week" tickFormatter={fmtDay} {...axisProps} minTickGap={28} />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <TooltipBox
                        title={`Semana del ${fmtDay(String(payload[0].payload.week))}`}
                        rows={[
                          { label: 'Total', value: fmt(Number(payload[0].payload.total)), color: C.navyLight },
                          { label: 'Directas', value: fmt(Number(payload[0].payload.directas)), color: C.navy },
                        ]}
                      />
                    ) : null
                  }
                />
                <Area isAnimationActive={false} type="monotone" dataKey="total" stroke="#9DB3D1" strokeWidth={2} fill={C.navyLight} fillOpacity={0.55} />
                <Area isAnimationActive={false} type="monotone" dataKey="directas" stroke={C.navy} strokeWidth={2} fill={C.navy} fillOpacity={0.12} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </Card>

        <Card title="Plataformas" subtitle="Registros por red o canal">
          {o.byPlatform.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[...o.byPlatform].sort((x, y) => y.total - x.total)} layout="vertical" margin={{ top: 0, right: 48, left: 4, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="platform" width={78} {...axisProps} />
                <Tooltip
                  cursor={{ fill: C.grid }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <TooltipBox
                        title={String(payload[0].payload.platform)}
                        rows={[{ label: 'Registros', value: `${fmt(Number(payload[0].value))} (${fmtPct(pct(Number(payload[0].value), o.total))})` }]}
                      />
                    ) : null
                  }
                />
                <Bar isAnimationActive={false} dataKey="total" fill={C.navy2} radius={[0, 4, 4, 0]} barSize={18}>
                  <LabelList dataKey="total" position="right" formatter={(x: number) => fmt(x)} className="fill-ink text-[11px]" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Depuración de la base" subtitle="Qué se limpió antes de calcular indicadores">
          <ul className="space-y-2 text-sm">
            {[
              ['Filas en el Excel original', a.rawRows, ''],
              ['Duplicados reales (mismo id) eliminados', -a.duplicateIdRemoved, 'Recapturas del mismo registro'],
              ['Copias probables apartadas', -a.probableCopies, 'Mismo texto, hilo y autor en menos de 1 h'],
              ['Registros contables', v.base.length, ''],
            ].map(([label, n, hint], i) => (
              <li key={i} className={`flex items-baseline justify-between gap-3 ${i === 3 ? 'border-t border-line pt-2 font-semibold text-navy-900' : ''}`}>
                <span>
                  {label}
                  {hint && <span className="block text-[11px] font-normal text-ink-faint">{hint}</span>}
                </span>
                <span className={`tabular-nums ${Number(n) < 0 ? 'text-accent' : ''}`}>{Number(n) < 0 ? `−${fmt(-Number(n))}` : fmt(Number(n))}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-ink-muted">
            <div className="rounded-lg bg-navy-50 p-2">
              <b className="block text-base text-navy-900">{fmt(a.exclusions.length)}</b>homónimos excluidos
            </div>
            <div className="rounded-lg bg-amber-50 p-2">
              <b className="block text-base text-amber-800">{fmt(a.pendingLinks)}</b>vínculos por validar
            </div>
            <div className="rounded-lg bg-navy-50 p-2">
              <b className="block text-base text-navy-900">{fmt(a.lowText)}</b>sin texto analizable
            </div>
          </div>
        </Card>

        <Card title="Sentimiento general" subtitle="Clasificación depurada de todos los registros" note="Los textos sin opinión explícita se clasifican como neutrales.">
          <SentimentBar counts={o.sentiment} />
          <p className="mt-4 text-sm text-ink-muted">
            <b className="font-display text-2xl text-accent">{fmtPct(negPct)}</b> de los registros expresa una valoración negativa.
          </p>
        </Card>

        <Card title="Lectura del volumen" subtitle="Qué mide y qué no mide esta base">
          <ul className="space-y-2.5 text-[13px] leading-snug text-ink">
            <li>
              <b>Cuenta conversación registrada por Brand24</b> en redes y sitios web, no el universo completo.
            </li>
            <li>
              <b>Un comentario no siempre nombra a la figura:</b> si solo responde a un post sobre ella se cuenta como contexto, no como mención.
            </li>
            <li>
              <b>Medios tradicionales:</b> solo se observa lo que publican en sus canales digitales; no hay datos de audiencia de prensa, radio o TV.
            </li>
          </ul>
        </Card>
      </div>
    </Section>
  );
}

export function SentimentBar({ counts, height = 22 }: { counts: Record<Sentiment, number>; height?: number }) {
  const total = counts.positivo + counts.neutral + counts.negativo;
  const order: Sentiment[] = ['positivo', 'neutral', 'negativo'];
  if (!total) return <Empty />;
  return (
    <div>
      <div className="flex w-full gap-[2px] overflow-hidden rounded-md" style={{ height }} role="img" aria-label="Distribución de sentimiento">
        {order.map((s) =>
          counts[s] ? <div key={s} style={{ width: `${pct(counts[s], total)}%`, background: SENT_COLOR[s] }} title={`${SENT_LABEL[s]}: ${fmt(counts[s])}`} /> : null,
        )}
      </div>
      <div className="mt-2 grid grid-cols-3 text-xs">
        {order.map((s) => (
          <div key={s}>
            <span className="inline-flex items-center gap-1.5 text-ink-muted">
              <span className="h-2 w-2 rounded-sm" style={{ background: SENT_COLOR[s] }} />
              {SENT_LABEL[s]}
            </span>
            <b className="block tabular-nums text-ink">
              {fmtPct(pct(counts[s], total))} <span className="font-normal text-ink-faint">· {fmt(counts[s])}</span>
            </b>
          </div>
        ))}
      </div>
    </div>
  );
}

