import { useMemo } from 'react';
import { Bar, BarChart, Cell, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';
import { CAND_BY_ID } from '../lib/config';
import { candidateStats, month, pct, type CandStats } from '../lib/metrics';
import { fmt, fmtMonth, fmtPct } from '../lib/format';
import { Card, Legend, Section, TooltipBox } from '../components/ui';
import { C, SENT_COLOR, axisProps } from '../components/theme';
import type { View } from './view';

export default function Candidatos({ v }: { v: View }) {
  const stats = useMemo(() => candidateStats(v.noCand), [v.noCand]);
  const months = useMemo(() => [...new Set(v.noCand.map((m) => month(m.date)))].sort(), [v.noCand]);
  const bySpont = [...stats].sort((a, b) => b.espontanea - a.espontanea);
  const leader = bySpont[0];
  const torres = stats.find((s) => s.id === 'torres')!;
  const teran = stats.find((s) => s.id === 'teran')!;
  const limited = stats.filter((s) => s.coverage === 'limitada').length;
  const selected = v.filters.cand;

  const data = bySpont.map((s) => ({ ...s, label: CAND_BY_ID[s.id].name }));

  return (
    <Section
      id="candidatos"
      kicker="Comparativo"
      title="Conversación por candidato"
      lead={
        <>
          Indicador principal: <b className="text-navy-900">menciones espontáneas</b>, cuando un tercero nombra a la figura. {leader.name} concentra el{' '}
          {fmtPct(leader.share)}.
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Menciones espontáneas"
          subtitle="Terceros que nombran a la figura en su texto · participación sobre las siete"
          note="Excluye publicaciones propias y comentarios que no nombran a la figura."
        >
          <CandBars data={data} dataKey="espontanea" color={C.navy2} showShare selected={selected} />
        </Card>
        <Card
          title="Conversación de contexto"
          subtitle="Comentarios en hilos sobre la figura que no la nombran"
          note="Depende de cuántos comentarios capturó Brand24 en cada hilo; no es comparable como participación."
        >
          <CandBars data={data} dataKey="contexto" color={C.navyLight} selected={selected} />
        </Card>
      </div>

      <Card
        className="mt-4"
        title="Tablero comparativo"
        subtitle="Presencia, crecimiento, sentimiento de la conversación espontánea y verificación de cobertura"
        action={
          <span className={`chip ${limited ? 'bg-amber-50 text-amber-800' : 'bg-navy-50 text-navy-800'}`}>
            <AlertTriangle size={12} /> {limited} de 7 con cobertura limitada
          </span>
        }
      >
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-y border-line bg-navy-50/60 text-left text-[11px] uppercase tracking-wider text-ink-muted">
                <th className="py-2 pl-5 font-semibold">Figura</th>
                <th className="py-2 text-right font-semibold">Propias</th>
                <th className="py-2 text-right font-semibold">Espontáneas</th>
                <th className="py-2 text-right font-semibold">Particip.</th>
                <th className="py-2 text-right font-semibold">Contexto</th>
                <th className="py-2 pl-5 font-semibold">Tendencia espontánea</th>
                <th className="py-2 text-right font-semibold">30 días</th>
                <th className="py-2 pl-5 font-semibold">Sentimiento espontáneo</th>
                <th className="py-2 pl-3 pr-5 font-semibold">Cobertura</th>
              </tr>
            </thead>
            <tbody>
              {bySpont.map((s) => (
                <Row key={s.id} s={s} months={months} selected={selected === s.id} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card
          title="Óscar Torres: institucional frente a político"
          subtitle="Menciones directas y de contexto según el alcance del texto"
          note="Las menciones a su gestión en la ANI no se atribuyen a sus aspiraciones políticas."
        >
          <ScopeBar t={torres.torres ?? { institucional: 0, politica: 0, otra: 0 }} />
        </Card>
        <Card
          title="Campo Elías: verificación de identidad"
          subtitle="Solo cuentan los registros con identidad verificable"
          action={
            teran.pending > 0 ? (
              <button className="btn-ghost h-7 py-0 text-xs" onClick={() => v.showEvidence({ preset: 'pendientes', cand: 'teran' })}>
                Revisar pendientes
              </button>
            ) : undefined
          }
        >
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-navy-50 p-3">
              <b className="block font-display text-2xl text-navy-900">{fmt(teran.espontanea + teran.contexto)}</b>
              <span className="text-[11px] text-ink-muted">verificados: Terán Humánez (IDER)</span>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <b className="block font-display text-2xl text-amber-800">{fmt(teran.pending)}</b>
              <span className="text-[11px] text-amber-800">ambiguos, pendientes</span>
            </div>
            <div className="rounded-lg bg-navy-50 p-3">
              <b className="block font-display text-2xl text-navy-900">{fmt(v.ds.audit.exclusions.filter((e) => e.cand === 'teran').length)}</b>
              <span className="text-[11px] text-ink-muted">excluidos: exalcalde fallecido</span>
            </div>
          </div>
          <p className="mt-3 text-xs leading-snug text-ink-muted">{CAND_BY_ID.teran.identityNote} Confirme la identidad del aspirante antes de usar estas cifras.</p>
        </Card>
      </div>
    </Section>
  );
}

type BarDatum = CandStats & { label: string };

function CandBars({ data, dataKey, color, showShare, selected }: { data: BarDatum[]; dataKey: 'espontanea' | 'contexto'; color: string; showShare?: boolean; selected: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 92, left: 0, bottom: 0 }} barCategoryGap={6}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={150}
          {...axisProps}
          tick={({ x, y, payload }) => {
            const focus = payload.value === 'Wilson Toncel';
            return (
              <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} fontWeight={focus ? 700 : 500} fill={focus ? C.accent : '#1B2433'}>
                {payload.value}
              </text>
            );
          }}
        />
        <Tooltip
          cursor={{ fill: C.grid }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as BarDatum;
            return (
              <TooltipBox
                title={d.name}
                rows={[
                  { label: 'Espontáneas', value: fmt(d.espontanea) },
                  { label: 'Participación', value: fmtPct(d.share, 1) },
                  { label: 'Contexto', value: fmt(d.contexto) },
                  { label: 'Propias', value: fmt(d.propia) },
                ]}
              />
            );
          }}
        />
        <Bar isAnimationActive={false} dataKey={dataKey} radius={[0, 4, 4, 0]} barSize={20} minPointSize={2}>
          {data.map((d) => (
            <Cell key={d.id} fill={d.id === 'toncel' ? C.accent : color} fillOpacity={selected && selected !== d.id ? 0.35 : 1} />
          ))}
          <LabelList
            dataKey={dataKey}
            position="right"
            content={({ x, y, width, height, index }) => {
              const d = data[index as number];
              const val = d[dataKey];
              return (
                <text x={Number(x) + Number(width) + 6} y={Number(y) + Number(height) / 2} dy={4} fontSize={12} fill="#1B2433" fontWeight={600}>
                  {fmt(val)}
                  {showShare && <tspan fill={C.muted} fontWeight={400}>{`  ${fmtPct(d.share, 1)}`}</tspan>}
                </text>
              );
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Row({ s, months, selected }: { s: CandStats; months: string[]; selected: boolean }) {
  const def = CAND_BY_ID[s.id];
  const series = months.map((m) => ({ m, n: s.monthly[m]?.espontanea ?? 0 }));
  const sTotal = s.sentiment.positivo + s.sentiment.neutral + s.sentiment.negativo;
  return (
    <tr className={`border-b border-line align-middle ${def.focus ? 'bg-accent-soft/50' : ''} ${selected ? 'outline outline-2 -outline-offset-2 outline-navy-600' : ''}`}>
      <td className="py-2.5 pl-5">
        <span className={`font-semibold ${def.focus ? 'text-accent-dark' : 'text-navy-900'}`}>{def.name}</span>
      </td>
      <td className="py-2.5 text-right tabular-nums">{fmt(s.propia)}</td>
      <td className="py-2.5 text-right font-semibold tabular-nums">{fmt(s.espontanea)}</td>
      <td className="py-2.5 text-right tabular-nums">{fmtPct(s.share, 1)}</td>
      <td className="py-2.5 text-right tabular-nums text-ink-muted">{fmt(s.contexto)}</td>
      <td className="py-1 pl-5">
        <div className="h-8 w-[130px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 4, right: 2, left: 2, bottom: 4 }}>
              <Line type="monotone" dataKey="n" stroke={def.focus ? C.accent : C.navy2} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.length ? <TooltipBox title={fmtMonth(String(payload[0].payload.m))} rows={[{ label: 'Espontáneas', value: fmt(Number(payload[0].value)) }]} /> : null
                }
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </td>
      <td className="py-2.5 text-right tabular-nums">
        {s.growth === null ? (
          <span className="text-xs text-ink-faint" title="Menos de 5 menciones en el periodo previo">
            n. s.
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1 ${s.growth >= 0 ? 'text-navy-700' : 'text-accent'}`}>
            {s.growth >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {s.growth >= 0 ? '+' : ''}
            {fmtPct(s.growth)}
          </span>
        )}
      </td>
      <td className="py-2.5 pl-5">
        {sTotal ? (
          <div className="w-[170px]">
            <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-sm">
              {(['positivo', 'neutral', 'negativo'] as const).map((k) =>
                s.sentiment[k] ? <div key={k} style={{ width: `${pct(s.sentiment[k], sTotal)}%`, background: SENT_COLOR[k] }} /> : null,
              )}
            </div>
            <p className="mt-1 text-[11px] text-ink-muted">
              {fmtPct(pct(s.sentiment.positivo, sTotal))} pos. · {fmtPct(pct(s.sentiment.negativo, sTotal))} neg.{' '}
              <span className={sTotal < 20 ? 'text-amber-700' : 'text-ink-faint'}>(n={sTotal})</span>
            </p>
          </div>
        ) : (
          <span className="text-xs text-ink-faint">sin datos</span>
        )}
      </td>
      <td className="py-2.5 pl-3 pr-5">
        <span
          className={`chip ${s.coverage === 'comparable' ? 'bg-navy-50 text-navy-800' : 'bg-amber-50 text-amber-800'}`}
          title={s.coverageNotes.join('\n') || 'Volumen y diversidad de hilos suficientes.'}
        >
          {s.coverage === 'comparable' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
          {s.coverage === 'comparable' ? 'Comparable' : 'Limitada'}
        </span>
        {s.coverageNotes[0] && <p className="mt-1 max-w-[220px] text-[11px] leading-tight text-ink-muted">{s.coverageNotes[0]}</p>}
      </td>
    </tr>
  );
}

function ScopeBar({ t }: { t: { institucional: number; politica: number; otra: number } }) {
  const total = t.institucional + t.politica + t.otra;
  const rows = [
    { k: 'Institucional (ANI, vías, peajes)', n: t.institucional, color: C.navy2 },
    { k: 'Política o electoral', n: t.politica, color: C.accent },
    { k: 'Otra', n: t.otra, color: C.navyLight },
  ];
  return (
    <div>
      <div className="flex h-6 gap-[2px] overflow-hidden rounded-md">
        {rows.map((r) => (r.n ? <div key={r.k} style={{ width: `${pct(r.n, total)}%`, background: r.color }} title={`${r.k}: ${r.n}`} /> : null))}
      </div>
      <div className="mt-3">
        <Legend items={rows.map((r) => ({ label: `${r.k}: ${fmt(r.n)} (${fmtPct(pct(r.n, total))})`, color: r.color }))} />
      </div>
    </div>
  );
}
