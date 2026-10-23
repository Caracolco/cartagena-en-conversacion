import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ExternalLink, MessageSquareOff } from 'lucide-react';
import { PLATFORMS, TOPICS } from '../lib/config';
import { candidateStats, counted, median, month, pct } from '../lib/metrics';
import { fmt, fmtDate, fmtMonth, fmtPct } from '../lib/format';
import { Card, Empty, Kpi, Legend, Section, SentimentChip, TooltipBox } from '../components/ui';
import { C, REL_COLOR, SOURCE_LABEL, axisProps } from '../components/theme';
import type { ActiveMention } from '../lib/overrides';
import type { View } from './view';

const isW = (m: ActiveMention, rel?: 'propia' | 'espontanea') => counted(m).some((c) => c.id === 'toncel' && (!rel || c.rel === rel));

export default function Wilson({ v }: { v: View }) {
  const stats = useMemo(() => candidateStats(v.noCand), [v.noCand]);
  const w = stats.find((s) => s.id === 'toncel')!;
  const others = stats.filter((s) => s.id !== 'toncel');
  const rank = [...stats].sort((a, b) => b.espontanea - a.espontanea).findIndex((s) => s.id === 'toncel') + 1;

  const own = useMemo(() => v.noCand.filter((m) => isW(m, 'propia')), [v.noCand]);
  const spont = useMemo(() => v.noCand.filter((m) => isW(m, 'espontanea')).sort((a, b) => (a.date < b.date ? 1 : -1)), [v.noCand]);
  const ownInteractions = own.reduce((s, m) => s + m.interactions, 0);
  const othersSpontMedian = median(others.map((s) => s.espontanea));

  const months = useMemo(() => [...new Set(v.noCand.map((m) => month(m.date)))].sort(), [v.noCand]);
  const monthly = months.map((m) => ({ m, propia: w.monthly[m]?.propia ?? 0, espontanea: w.monthly[m]?.espontanea ?? 0 }));

  const othersDirect = PLATFORMS.map((p) => others.reduce((a, s) => a + s.platforms[p].propia + s.platforms[p].espontanea, 0));
  const othersDirectTotal = othersDirect.reduce((a, b) => a + b, 0);
  const platforms = PLATFORMS.map((p, i) => ({
    p,
    wilson: pct(w.platforms[p].propia + w.platforms[p].espontanea, w.direct),
    otras: pct(othersDirect[i], othersDirectTotal),
    wn: w.platforms[p].propia + w.platforms[p].espontanea,
    on: othersDirect[i],
  }));

  const topics = TOPICS.map((t) => ({
    label: t.label,
    propias: own.filter((m) => m.topics.includes(t.id)).length,
    terceros: spont.filter((m) => m.topics.includes(t.id)).length,
  }))
    .filter((t) => t.propias + t.terceros > 0)
    .sort((a, b) => b.propias + b.terceros - (a.propias + a.terceros));

  const topOwn = [...own].sort((a, b) => b.interactions - a.interactions).slice(0, 4);

  return (
    <Section
      id="wilson"
      kicker="Figura en foco"
      title="Wilson Toncel"
      lead={
        <>
          Su presencia registrada es sobre todo voz propia: {fmt(w.propia)} publicaciones suyas frente a {fmt(w.espontanea)} menciones de terceros.
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.1fr_2fr]">
        <div className="relative overflow-hidden rounded-xl bg-navy-900 p-6 text-white">
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-accent/25 blur-2xl" aria-hidden />
          <p className="kicker text-red-300">Brecha de visibilidad</p>
          <p className="mt-3 font-display text-[64px] leading-none">{fmt(w.espontanea)}</p>
          <p className="mt-1 text-sm text-navy-100">menciones espontáneas · puesto {rank} de 7</p>
          <div className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between border-t border-white/10 pt-2">
              <span className="text-navy-300">Mediana de las demás figuras</span>
              <b>{fmt(othersSpontMedian)}</b>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2">
              <span className="text-navy-300">Participación en lo espontáneo</span>
              <b>{fmtPct(w.share, 1)}</b>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2">
              <span className="text-navy-300">Conversación de contexto</span>
              <b>{fmt(w.contexto)}</b>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 content-start gap-3 md:grid-cols-4">
          <Kpi label="Publicaciones propias" value={fmt(w.propia)} sub="Instagram @wtoncel y TikTok @wilson_toncel" />
          <Kpi label="Interacciones" value={fmt(ownInteractions)} sub="en sus publicaciones" />
          <Kpi label="Medios que lo nombran" value={fmt(w.mediaOutlets)} sub={`${fmt(w.mediaItems)} piezas informativas`} />
          <Kpi tone="accent" label="Comentarios capturados" value={fmt(w.ownCommentsCaptured)} sub="en sus publicaciones" />
          <div className="col-span-2 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] leading-snug text-amber-900 md:col-span-4">
            <MessageSquareOff size={18} className="mt-0.5 shrink-0" />
            <p>
              Sus publicaciones suman {fmt(ownInteractions)} interacciones, pero el Excel no trae el texto de ningún comentario en ellas. Para las demás
              figuras sí hay miles de comentarios en hilos de medios. Parte de la brecha se debe a cómo se hizo la captura y no solo a cuánto se habla de él.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card
          title="Evolución mensual"
          subtitle="Publicaciones propias y menciones de terceros"
          action={
            <Legend
              items={[
                { label: 'Propias', color: REL_COLOR.propia },
                { label: 'Terceros', color: C.accent },
              ]}
            />
          }
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barGap={2}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis dataKey="m" tickFormatter={(x: string) => fmtMonth(x).slice(0, 3)} {...axisProps} interval={0} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: C.grid }}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <TooltipBox
                      title={fmtMonth(String(payload[0].payload.m))}
                      rows={[
                        { label: 'Propias', value: fmt(Number(payload[0].payload.propia)), color: REL_COLOR.propia },
                        { label: 'Terceros', value: fmt(Number(payload[0].payload.espontanea)), color: C.accent },
                      ]}
                    />
                  ) : null
                }
              />
              <Bar isAnimationActive={false} dataKey="propia" fill={REL_COLOR.propia} radius={[4, 4, 0, 0]} barSize={9} />
              <Bar isAnimationActive={false} dataKey="espontanea" fill={C.accent} radius={[4, 4, 0, 0]} barSize={9} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title="Plataformas frente a las demás figuras"
          subtitle="% de la presencia directa (propia + espontánea) en cada canal"
          action={
            <Legend
              items={[
                { label: 'Wilson', color: C.accent },
                { label: 'Demás figuras', color: C.navy2 },
              ]}
            />
          }
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={platforms} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }} barGap={2}>
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis type="category" dataKey="p" width={76} {...axisProps} />
              <Tooltip
                cursor={{ fill: C.grid }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof platforms)[number];
                  return (
                    <TooltipBox
                      title={d.p}
                      rows={[
                        { label: 'Wilson', value: `${fmtPct(d.wilson)} · ${fmt(d.wn)}`, color: C.accent },
                        { label: 'Demás figuras', value: `${fmtPct(d.otras)} · ${fmt(d.on)}`, color: C.navy2 },
                      ]}
                    />
                  );
                }}
              />
              <Bar isAnimationActive={false} dataKey="wilson" fill={C.accent} radius={[0, 4, 4, 0]} barSize={8} />
              <Bar isAnimationActive={false} dataKey="otras" fill={C.navy2} radius={[0, 4, 4, 0]} barSize={8} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Temas asociados" subtitle="Temas en sus publicaciones y en lo que dicen terceros" action={<Legend items={[{ label: 'Propias', color: REL_COLOR.propia }, { label: 'Terceros', color: C.accent }]} />}>
          {topics.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topics.slice(0, 7)} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }} barGap={2}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={112} {...axisProps} />
                <Tooltip
                  cursor={{ fill: C.grid }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <TooltipBox
                        title={String(payload[0].payload.label)}
                        rows={[
                          { label: 'Propias', value: fmt(Number(payload[0].payload.propias)), color: REL_COLOR.propia },
                          { label: 'Terceros', value: fmt(Number(payload[0].payload.terceros)), color: C.accent },
                        ]}
                      />
                    ) : null
                  }
                />
                <Bar isAnimationActive={false} dataKey="propias" fill={REL_COLOR.propia} radius={[0, 4, 4, 0]} barSize={8} />
                <Bar isAnimationActive={false} dataKey="terceros" fill={C.accent} radius={[0, 4, 4, 0]} barSize={8} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card title="Lo que dicen terceros" subtitle={`${fmt(spont.length)} menciones espontáneas con enlace original`}>
          {spont.length ? (
            <ul className="grid gap-2 md:grid-cols-2">
              {spont.map((m) => (
                <EvidenceCard key={m.id} m={m} onReview={() => v.openReview(m.id)} />
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Card>
        <Card title="Sus publicaciones con más interacción" subtitle="Publicaciones propias registradas">
          <ul className="space-y-2">
            {topOwn.map((m) => (
              <li key={m.id} className="rounded-lg border border-line p-3">
                <div className="flex items-center justify-between text-[11px] text-ink-muted">
                  <span>
                    {fmtDate(m.date)} · {m.platform}
                  </span>
                  <b className="text-navy-900">{fmt(m.interactions)} interacciones</b>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug">{m.content || m.title || '(sin texto)'}</p>
                <a className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-accent" href={m.link} target="_blank" rel="noreferrer">
                  Ver original <ExternalLink size={11} />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Section>
  );
}

export function EvidenceCard({ m, onReview }: { m: ActiveMention; onReview: () => void }) {
  return (
    <li className="flex flex-col rounded-lg border border-line p-3">
      <div className="flex items-center justify-between gap-2 text-[11px] text-ink-muted">
        <span className="truncate">
          {fmtDate(m.date)} · {m.platform} · {m.outlet || m.author || SOURCE_LABEL[m.sourceType]}
        </span>
        <SentimentChip s={m.sentiment} />
      </div>
      <p className="mt-1.5 line-clamp-3 flex-1 text-[13px] leading-snug">{m.title ? <b>{m.title}. </b> : null}{m.content}</p>
      <div className="mt-2 flex items-center gap-3 text-xs">
        <a className="inline-flex items-center gap-1 font-medium text-navy-700 hover:text-accent" href={m.link} target="_blank" rel="noreferrer">
          Ver original <ExternalLink size={11} />
        </a>
        <button className="text-ink-muted hover:text-navy-900" onClick={onReview}>
          {m.reviewed ? 'Revisado · editar' : 'Revisar'}
        </button>
      </div>
    </li>
  );
}
