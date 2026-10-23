import { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ExternalLink } from 'lucide-react';
import { CAND_BY_ID } from '../lib/config';
import { month, pct, targetStats, topicMonthly, topicStats, topThreads } from '../lib/metrics';
import { fmt, fmtMonth, fmtPct } from '../lib/format';
import { truncate } from '../lib/text';
import { Card, Empty, Legend, Section, TooltipBox } from '../components/ui';
import { C, SENT_COLOR, SENT_LABEL, TARGET_LABEL, axisProps } from '../components/theme';
import type { Target, TopicId } from '../lib/types';
import type { View } from './view';

export default function Temas({ v }: { v: View }) {
  const topics = useMemo(() => topicStats(v.filtered), [v.filtered]);
  const withTopic = topics.filter((t) => t.total > 0);
  const top6 = withTopic.slice(0, 6).map((t) => t.id as TopicId);
  const monthly = useMemo(() => topicMonthly(v.filtered, top6), [v.filtered, top6.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const months = useMemo(() => [...new Set(v.filtered.map((m) => month(m.date)))].sort(), [v.filtered]);
  const targets = useMemo(() => targetStats(v.filtered, 'negativo'), [v.filtered]);
  const threads = useMemo(() => topThreads(v.filtered, v.ds.threads, 6), [v.filtered, v.ds.threads]);
  const negTotal = Object.values(targets).reduce((a, b) => a + b, 0);
  const targetRows = (['ciudad', 'candidato', 'nacional', 'otro'] as Target[]).map((k) => ({ k, label: TARGET_LABEL[k], n: targets[k] }));
  const mostNeg = [...withTopic].filter((t) => t.total >= 30).sort((a, b) => b.negativo / b.total - a.negativo / a.total)[0];

  return (
    <Section
      id="temas"
      kicker="Agenda de ciudad"
      title="Cartagena: temas de conversación"
      lead={
        withTopic[0] ? (
          <>
            {withTopic[0].label} y {withTopic[1]?.label.toLowerCase()} lideran la discusión.
            {mostNeg && (
              <>
                {' '}
                {mostNeg.label} es el tema con más proporción negativa ({fmtPct(pct(mostNeg.negativo, mostNeg.total))}).
              </>
            )}
          </>
        ) : undefined
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Card
          title="Temas más mencionados"
          subtitle="Registros cuyo propio texto trata el tema, por sentimiento"
          note="Un registro puede tocar varios temas. Los comentarios sin tema propio no se cuentan aquí."
          action={<Legend items={(['positivo', 'neutral', 'negativo'] as const).map((s) => ({ label: SENT_LABEL[s], color: SENT_COLOR[s] }))} />}
        >
          {withTopic.length ? (
            <ResponsiveContainer width="100%" height={330}>
              <BarChart data={withTopic} layout="vertical" margin={{ top: 0, right: 44, left: 4, bottom: 0 }} barCategoryGap={5}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" width={124} {...axisProps} tick={{ fontSize: 12, fill: '#1B2433' }} />
                <Tooltip
                  cursor={{ fill: C.grid }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as (typeof withTopic)[number];
                    return (
                      <TooltipBox
                        title={`${d.label} · ${fmt(d.total)}`}
                        rows={(['positivo', 'neutral', 'negativo'] as const).map((s) => ({
                          label: SENT_LABEL[s],
                          value: `${fmt(d[s])} (${fmtPct(pct(d[s], d.total))})`,
                          color: SENT_COLOR[s],
                        }))}
                      />
                    );
                  }}
                />
                <Bar isAnimationActive={false} dataKey="positivo" stackId="s" fill={SENT_COLOR.positivo} barSize={18} stroke="#fff" strokeWidth={1} />
                <Bar isAnimationActive={false} dataKey="neutral" stackId="s" fill={SENT_COLOR.neutral} stroke="#fff" strokeWidth={1} />
                <Bar isAnimationActive={false} dataKey="negativo" stackId="s" fill={SENT_COLOR.negativo} radius={[0, 4, 4, 0]} stroke="#fff" strokeWidth={1}>
                  <LabelList dataKey="total" position="right" formatter={(x: number) => fmt(x)} className="fill-ink text-[11px] font-semibold" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </Card>

        <Card title="Tendencia de los principales temas" subtitle="Registros por mes, misma escala para cada tema">
          {top6.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {top6.map((t) => {
                const info = withTopic.find((x) => x.id === t)!;
                const data = months.map((m) => ({ m, n: Number(monthly.find((r) => r.month === m)?.[t] ?? 0) }));
                const max = Math.max(...top6.flatMap((tt) => monthly.map((r) => Number(r[tt] ?? 0))), 1);
                return (
                  <div key={t}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-navy-900">{info.label}</span>
                      <span className="text-[11px] tabular-nums text-ink-muted">{fmt(info.total)}</span>
                    </div>
                    <div className="h-14">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                          <YAxis hide domain={[0, max]} />
                          <XAxis dataKey="m" hide />
                          <Tooltip content={({ active, payload }) => (active && payload?.length ? <TooltipBox title={`${info.label} · ${fmtMonth(String(payload[0].payload.m))}`} rows={[{ label: 'Registros', value: fmt(Number(payload[0].value)) }]} /> : null)} />
                          <Area type="monotone" dataKey="n" stroke={C.navy2} strokeWidth={2} fill={C.navy2} fillOpacity={0.12} isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
              <p className="col-span-2 text-[11px] text-ink-faint">
                {months[0] && `${fmtMonth(months[0])} – ${fmtMonth(months[months.length - 1])}`}
              </p>
            </div>
          ) : (
            <Empty />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <Card
          title="¿A quién se dirigen las críticas?"
          subtitle={`${fmt(negTotal)} registros negativos según su destinatario`}
          note="Separa las quejas sobre la ciudad y su gestión de las críticas a figuras o candidaturas."
        >
          <ul className="space-y-3">
            {targetRows.map((r) => (
              <li key={r.k}>
                <div className="flex justify-between text-[13px]">
                  <span>{r.label}</span>
                  <span className="tabular-nums text-ink-muted">
                    <b className="text-ink">{fmt(r.n)}</b> · {fmtPct(pct(r.n, negTotal))}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-navy-50">
                  <div className="h-2 rounded-full" style={{ width: `${pct(r.n, negTotal)}%`, background: r.k === 'candidato' ? C.accent : C.navy2 }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Hilos con más conversación" subtitle="Publicaciones que concentran comentarios en el periodo filtrado">
          {threads.length ? (
            <ul className="divide-y divide-line">
              {threads.map(({ thread, count, neg }) => (
                <li key={thread.id} className="flex items-start gap-3 py-2.5">
                  <span className="w-12 shrink-0 text-right font-display text-xl leading-none text-navy-900">{fmt(count)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13px] leading-snug">{truncate(thread.text.replace(/\s+/g, ' '), 220) || '(publicación sin texto)'}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-muted">
                      <span>
                        {thread.platform} · {thread.author || 'fuente sin nombre'}
                      </span>
                      {thread.cands.length > 0 && <span>· {thread.cands.map((c) => CAND_BY_ID[c].short).join(', ')}</span>}
                      <span>· {fmtPct(pct(neg, count))} negativo</span>
                      <a href={thread.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-navy-700 hover:text-accent">
                        original <ExternalLink size={10} />
                      </a>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Card>
      </div>
    </Section>
  );
}
