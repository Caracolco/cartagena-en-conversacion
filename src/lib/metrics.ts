import { CANDIDATES, PLATFORMS, TOPICS } from './config';
import type { ActiveMention } from './overrides';
import type { CandidateId, Platform, Relation, Sentiment, Target, Thread, TopicId } from './types';

export interface Filters {
  from: string;
  to: string;
  cand: CandidateId | '';
  platform: Platform | '';
  sentiment: Sentiment | '';
  topic: TopicId | '';
}

export const EMPTY_FILTERS: Filters = { from: '', to: '', cand: '', platform: '', sentiment: '', topic: '' };

export const counted = (m: ActiveMention) => m.cands.filter((c) => !c.pending);

export function applyFilters(ms: ActiveMention[], f: Filters, opts: { ignoreCand?: boolean } = {}): ActiveMention[] {
  return ms.filter(
    (m) =>
      (!f.from || m.date >= f.from) &&
      (!f.to || m.date <= f.to) &&
      (!f.platform || m.platform === f.platform) &&
      (!f.sentiment || m.sentiment === f.sentiment) &&
      (!f.topic || m.topics.includes(f.topic)) &&
      (opts.ignoreCand || !f.cand || counted(m).some((c) => c.id === f.cand)),
  );
}

// --- Utilidades -------------------------------------------------------------

export function weekStart(date: string): string {
  const d = new Date(date + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export const month = (date: string) => date.slice(0, 7);

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const k = Math.floor(s.length / 2);
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
}

export function pct(a: number, b: number): number {
  return b ? (a / b) * 100 : 0;
}

function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// --- Panorama ---------------------------------------------------------------

export function overview(ms: ActiveMention[]) {
  const threads = new Set(ms.map((m) => m.thread));
  const posts = ms.filter((m) => !m.isComment);
  const byPlatform = PLATFORMS.map((p) => ({ platform: p, total: ms.filter((m) => m.platform === p).length })).filter((x) => x.total > 0);
  const weeks = new Map<string, { week: string; total: number; directas: number }>();
  for (const m of ms) {
    const w = weekStart(m.date);
    if (!weeks.has(w)) weeks.set(w, { week: w, total: 0, directas: 0 });
    const row = weeks.get(w)!;
    row.total++;
    if (counted(m).some((c) => c.rel !== 'contexto')) row.directas++;
  }
  const sentiment = countSentiment(ms);
  const dates = ms.map((m) => m.date).sort();
  return {
    total: ms.length,
    posts: posts.length,
    comments: ms.length - posts.length,
    threads: threads.size,
    interactions: posts.reduce((s, m) => s + m.interactions, 0),
    direct: ms.filter((m) => counted(m).some((c) => c.rel !== 'contexto')).length,
    byPlatform,
    weekly: [...weeks.values()].sort((a, b) => (a.week < b.week ? -1 : 1)),
    sentiment,
    dateMin: dates[0] ?? '',
    dateMax: dates[dates.length - 1] ?? '',
  };
}

export function countSentiment(ms: ActiveMention[]) {
  const r = { positivo: 0, negativo: 0, neutral: 0 };
  for (const m of ms) r[m.sentiment]++;
  return r;
}

/** Concentración: qué parte del volumen aportan los hilos más grandes. */
export function concentration(ms: ActiveMention[], topN = 10) {
  const byThread = new Map<string, number>();
  for (const m of ms) byThread.set(m.thread, (byThread.get(m.thread) ?? 0) + 1);
  const sizes = [...byThread.values()].sort((a, b) => b - a);
  const top = sizes.slice(0, topN).reduce((s, n) => s + n, 0);
  return { share: pct(top, ms.length), threads: byThread.size };
}

// --- Candidatos ---------------------------------------------------------------

export interface CandStats {
  id: CandidateId;
  name: string;
  propia: number;
  espontanea: number;
  contexto: number;
  pending: number;
  direct: number;
  threads: number;
  share: number; // % de la conversación espontánea entre las siete figuras
  growth: number | null; // % variación espontánea últimos 30 días vs. 30 previos
  last30: number;
  prev30: number;
  sentiment: { positivo: number; negativo: number; neutral: number };
  platforms: Record<Platform, { propia: number; espontanea: number; contexto: number }>;
  monthly: Record<string, { propia: number; espontanea: number; contexto: number }>;
  topThreadShare: number;
  ownCommentsCaptured: number;
  mediaOutlets: number;
  mediaItems: number;
  atlItems: number;
  atlRefs: number;
  topics: Record<TopicId, number>;
  coverage: 'comparable' | 'limitada';
  coverageNotes: string[];
  torres?: { institucional: number; politica: number; otra: number };
}

export function candidateStats(ms: ActiveMention[]): CandStats[] {
  const dates = ms.map((m) => m.date).sort();
  const maxDate = dates[dates.length - 1] ?? '';
  const cut30 = maxDate ? addDays(maxDate, -29) : '';
  const cut60 = maxDate ? addDays(maxDate, -59) : '';

  const stats = CANDIDATES.map((c) => {
    const s: CandStats = {
      id: c.id,
      name: c.name,
      propia: 0,
      espontanea: 0,
      contexto: 0,
      pending: 0,
      direct: 0,
      threads: 0,
      share: 0,
      growth: null,
      last30: 0,
      prev30: 0,
      sentiment: { positivo: 0, negativo: 0, neutral: 0 },
      platforms: Object.fromEntries(PLATFORMS.map((p) => [p, { propia: 0, espontanea: 0, contexto: 0 }])) as CandStats['platforms'],
      monthly: {},
      topThreadShare: 0,
      ownCommentsCaptured: 0,
      mediaOutlets: 0,
      mediaItems: 0,
      atlItems: 0,
      atlRefs: 0,
      topics: Object.fromEntries(TOPICS.map((t) => [t.id, 0])) as Record<TopicId, number>,
      coverage: 'comparable',
      coverageNotes: [],
    };
    const threadCount = new Map<string, number>();
    const outlets = new Set<string>();
    for (const m of ms) {
      for (const l of m.cands) {
        if (l.id !== c.id) continue;
        if (l.pending) {
          s.pending++;
          continue;
        }
        const rel: Relation = l.rel;
        s[rel]++;
        s.platforms[m.platform][rel]++;
        const mo = month(m.date);
        s.monthly[mo] ??= { propia: 0, espontanea: 0, contexto: 0 };
        s.monthly[mo][rel]++;
        threadCount.set(m.thread, (threadCount.get(m.thread) ?? 0) + 1);
        if (l.via === 'publicacion-propia') s.ownCommentsCaptured++;
        if (rel === 'espontanea') {
          s.sentiment[m.sentiment]++;
          for (const t of m.topics) s.topics[t]++;
          if (m.date >= cut30) s.last30++;
          else if (m.date >= cut60) s.prev30++;
          if (m.sourceType === 'medio-digital' || m.sourceType === 'medio-tradicional') {
            s.mediaItems++;
            if (m.outlet) outlets.add(m.outlet.toLowerCase());
          }
          if (m.sourceType === 'medio-tradicional') s.atlItems++;
          if (m.atlRef) s.atlRefs++;
        }
        if (c.id === 'torres' && l.scope) {
          s.torres ??= { institucional: 0, politica: 0, otra: 0 };
          s.torres[l.scope]++;
        }
      }
    }
    s.direct = s.propia + s.espontanea;
    s.threads = threadCount.size;
    const total = s.direct + s.contexto;
    s.topThreadShare = total ? pct(Math.max(0, ...threadCount.values()), total) : 0;
    s.mediaOutlets = outlets.size;
    s.growth = s.prev30 >= 5 ? pct(s.last30 - s.prev30, s.prev30) : null;
    return s;
  });

  const totalSpont = stats.reduce((a, s) => a + s.espontanea, 0);
  for (const s of stats) {
    s.share = pct(s.espontanea, totalSpont);
    // Solo la muestra pequeña y la concentración en un hilo limitan la comparación; el resto son avisos.
    const limits: string[] = [];
    if (s.espontanea < 30) limits.push(`Solo ${s.espontanea} menciones espontáneas: muestra pequeña.`);
    if (s.topThreadShare >= 50) limits.push(`Un solo hilo concentra el ${s.topThreadShare.toFixed(0)} % de su conversación.`);
    s.coverageNotes.push(...limits);
    if (s.propia > 0 && s.ownCommentsCaptured === 0) s.coverageNotes.push('Sus publicaciones propias se capturaron sin comentarios.');
    if (s.pending > 0) s.coverageNotes.push(`${s.pending} registros pendientes de validación de identidad.`);
    if (limits.length) s.coverage = 'limitada';
  }
  return stats;
}

// --- Temas y objetivos ------------------------------------------------------

export function topicStats(ms: ActiveMention[], opts: { includeThread?: boolean } = {}) {
  const rows = TOPICS.map((t) => ({ id: t.id, label: t.label, total: 0, positivo: 0, negativo: 0, neutral: 0 }));
  const idx = Object.fromEntries(rows.map((r, i) => [r.id, i]));
  for (const m of ms) {
    if (m.topicSource === 'hilo' && !opts.includeThread) continue;
    for (const t of m.topics) {
      const r = rows[idx[t]];
      r.total++;
      r[m.sentiment]++;
    }
  }
  return rows.sort((a, b) => b.total - a.total);
}

export function topicMonthly(ms: ActiveMention[], topics: TopicId[]) {
  const map = new Map<string, Record<string, number | string>>();
  for (const m of ms) {
    if (m.topicSource !== 'texto') continue;
    const mo = month(m.date);
    if (!map.has(mo)) map.set(mo, { month: mo, ...Object.fromEntries(topics.map((t) => [t, 0])) });
    const row = map.get(mo)!;
    for (const t of m.topics) if (topics.includes(t)) row[t] = (row[t] as number) + 1;
  }
  return [...map.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
}

export function targetStats(ms: ActiveMention[], sentiment: Sentiment = 'negativo') {
  const r: Record<Target, number> = { candidato: 0, ciudad: 0, nacional: 0, otro: 0, ninguno: 0 };
  for (const m of ms) if (m.sentiment === sentiment) r[m.target]++;
  return r;
}

export function topThreads(ms: ActiveMention[], threads: Record<string, Thread>, n = 8) {
  const count = new Map<string, ActiveMention[]>();
  for (const m of ms) {
    if (!count.has(m.thread)) count.set(m.thread, []);
    count.get(m.thread)!.push(m);
  }
  return [...count.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, n)
    .map(([id, list]) => ({ thread: threads[id], count: list.length, neg: list.filter((m) => m.sentiment === 'negativo').length }));
}

export function sentimentShift(ms: ActiveMention[]) {
  const orig = { positivo: 0, negativo: 0, neutral: 0, 'sin dato': 0 };
  for (const m of ms) {
    const s = m.sentimentOrig.toUpperCase();
    if (s === 'POSITIVE') orig.positivo++;
    else if (s === 'NEGATIVE') orig.negativo++;
    else if (s === 'NEUTRAL') orig.neutral++;
    else orig['sin dato']++;
  }
  return { orig, depurado: countSentiment(ms), reviewed: ms.filter((m) => m.reviewed).length };
}
