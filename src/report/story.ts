/**
 * Cifras del informe ejecutivo. Todo se deriva de la base depurada (con revisiones aplicadas); los titulares
 * se arman con estas cifras para que cambien si la base se actualiza.
 */
import { CAND_BY_ID, TOPIC_LABEL } from '../lib/config';
import { buildConclusions, dominantThreadAuthor, ratioPhrase, topicsByNegativity, type Conclusion } from '../lib/conclusions';
import { candidateStats, concentration, counted, median, month, overview, pct, targetStats, topicStats, weekStart, type CandStats } from '../lib/metrics';
import type { ActiveMention } from '../lib/overrides';
import type { CandidateId, Dataset, Platform, Sentiment, TopicId } from '../lib/types';
import curated from '../data/evidencias.json';

export const FOCUS: CandidateId = 'toncel';

export interface FigureRow {
  id: CandidateId;
  name: string;
  direct: number;
  propia: number;
  espontanea: number;
  contexto: number;
  share: number;
  limited: boolean;
  notes: string[];
  identity?: string;
}

/** Evidencia seleccionada: todos los campos salen del registro original; solo `about` y `why` son editoriales. */
export interface Evidence {
  id: string;
  about: string;
  why: string;
  text: string;
  author: string;
  platform: Platform;
  date: string;
  link: string;
  sentiment: Sentiment;
  isComment: boolean;
  interactions: number;
}

type CuratedItem = { id: string; about: string; why: string };

export function pickEvidence(items: CuratedItem[], ms: ActiveMention[]): Evidence[] {
  const byId = new Map(ms.map((m) => [m.id, m]));
  return items.flatMap((c) => {
    const m = byId.get(c.id);
    if (!m) return [];
    return [
      {
        id: m.id,
        about: c.about,
        why: c.why,
        text: (m.content || m.title).trim(),
        author: m.outlet || m.author,
        platform: m.platform,
        date: m.date,
        link: m.link,
        sentiment: m.sentiment,
        isComment: m.isComment,
        interactions: m.interactions,
      },
    ];
  });
}

export interface Story {
  period: { from: string; to: string };
  cleaned: number;
  analyzed: number;
  copies: number;
  rawRows: number;
  panorama: {
    posts: number;
    comments: number;
    threads: number;
    direct: number;
    weekly: { week: string; total: number; directas: number }[];
    peak: { week: string; total: number; thread?: { author: string; text: string; count: number } };
    recent: { months: string[]; share: number };
    concentration: number;
    dominant: { author: string; count: number; of: number };
  };
  figures: {
    rows: FigureRow[];
    totalSpont: number;
    top2Share: number;
    multiFigure: number;
    leader: FigureRow;
  };
  wilson: {
    s: CandStats;
    rank: number;
    othersMedian: number;
    monthly: { month: string; propia: number; terceros: number }[];
    topics: { id: TopicId; label: string; n: number }[];
    sentiment: Record<Sentiment, number>;
    facebookOthersShare: number;
  };
  topics: {
    rows: { id: TopicId; label: string; total: number; negativo: number; negRate: number }[];
    critical: { label: string; negRate: number }[];
  };
  sentiment: {
    counts: Record<Sentiment, number>;
    total: number;
    ratio: string;
    negToFigures: number;
    posToFigures: number;
  };
  evidence: {
    percepcion: Evidence[];
    ciudad: { headline: string; items: Evidence[] };
    figuras: { headline: string; items: Evidence[] };
  };
  conclusions: Conclusion[];
}

const isDirect = (m: ActiveMention, id?: CandidateId) => counted(m).some((c) => c.rel !== 'contexto' && (!id || c.id === id));

export function buildStory(ds: Dataset, ms: ActiveMention[]): Story {
  const o = overview(ms);
  const stats = candidateStats(ms);

  // Panorama
  const months = [...new Set(ms.map((m) => month(m.date)))].sort();
  const recentMonths = months.slice(-2);
  const recentShare = pct(ms.filter((m) => recentMonths.includes(month(m.date))).length, ms.length);
  const peak = o.weekly.reduce((a, b) => (b.total > a.total ? b : a), o.weekly[0] ?? { week: '', total: 0, directas: 0 });
  const peakThreads = new Map<string, number>();
  for (const m of ms) if (o.weekly.length && weekStart(m.date) === peak.week) peakThreads.set(m.thread, (peakThreads.get(m.thread) ?? 0) + 1);
  const [peakThreadId, peakCount] = [...peakThreads.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  const peakThread = peakThreadId ? ds.threads[peakThreadId] : undefined;

  // Figuras
  const rows: FigureRow[] = stats
    .map((s) => ({
      id: s.id,
      name: s.name,
      direct: s.direct,
      propia: s.propia,
      espontanea: s.espontanea,
      contexto: s.contexto,
      share: s.share,
      limited: s.coverage === 'limitada',
      notes: s.coverageNotes,
      identity: CAND_BY_ID[s.id].identityNote,
    }))
    .sort((a, b) => b.direct - a.direct);
  const totalSpont = stats.reduce((a, s) => a + s.espontanea, 0);
  const bySpont = [...rows].sort((a, b) => b.espontanea - a.espontanea);

  // Wilson
  const w = stats.find((s) => s.id === FOCUS)!;
  const others = stats.filter((s) => s.id !== FOCUS);
  const wDirect = ms.filter((m) => isDirect(m, FOCUS));
  const wTopics = new Map<TopicId, number>();
  for (const m of wDirect) for (const t of m.topics) wTopics.set(t, (wTopics.get(t) ?? 0) + 1);
  const wSent: Record<Sentiment, number> = { positivo: 0, negativo: 0, neutral: 0 };
  for (const m of wDirect) wSent[m.sentiment]++;

  // Temas y sentimiento
  const topicRows = topicStats(ms)
    .filter((t) => t.total > 0)
    .map((t) => ({ id: t.id, label: t.label, total: t.total, negativo: t.negativo, negRate: pct(t.negativo, t.total) }));
  const counts = o.sentiment;
  const neg = targetStats(ms, 'negativo');
  const pos = targetStats(ms, 'positivo');

  return {
    period: { from: o.dateMin, to: o.dateMax },
    cleaned: ds.mentions.length,
    analyzed: ms.length,
    copies: ds.audit.probableCopies,
    rawRows: ds.audit.rawRows,
    panorama: {
      posts: o.posts,
      comments: o.comments,
      threads: o.threads,
      direct: o.direct,
      weekly: o.weekly,
      peak: {
        week: peak.week,
        total: peak.total,
        thread: peakThread ? { author: peakThread.author, text: peakThread.text, count: peakCount } : undefined,
      },
      recent: { months: recentMonths, share: recentShare },
      concentration: concentration(ms).share,
      dominant: dominantThreadAuthor(ms, ds.threads),
    },
    figures: {
      rows,
      totalSpont,
      top2Share: pct(bySpont[0].espontanea + bySpont[1].espontanea, totalSpont),
      multiFigure: ms.filter((m) => counted(m).filter((c) => c.rel !== 'contexto').length > 1).length,
      leader: bySpont[0],
    },
    wilson: {
      s: w,
      rank: [...stats].sort((a, b) => b.espontanea - a.espontanea).findIndex((s) => s.id === FOCUS) + 1,
      othersMedian: median(others.map((s) => s.espontanea)),
      monthly: months.map((mo) => ({ month: mo, propia: w.monthly[mo]?.propia ?? 0, terceros: w.monthly[mo]?.espontanea ?? 0 })),
      topics: [...wTopics.entries()].map(([id, n]) => ({ id, label: TOPIC_LABEL[id], n })).sort((a, b) => b.n - a.n),
      sentiment: wSent,
      facebookOthersShare: pct(
        others.reduce((a, s) => a + s.platforms.Facebook.espontanea, 0),
        others.reduce((a, s) => a + s.espontanea, 0),
      ),
    },
    topics: { rows: topicRows, critical: topicsByNegativity(ms).slice(0, 2) },
    sentiment: {
      counts,
      total: ms.length,
      ratio: ratioPhrase(counts.positivo, counts.negativo),
      negToFigures: pct(neg.candidato, counts.negativo),
      posToFigures: pct(pos.candidato, counts.positivo),
    },
    evidence: {
      percepcion: pickEvidence(curated.percepcion.items, ms),
      ciudad: { headline: curated.ciudad.headline, items: pickEvidence(curated.ciudad.items, ms) },
      figuras: { headline: curated.figuras.headline, items: pickEvidence(curated.figuras.items, ms) },
    },
    conclusions: buildConclusions(ms, ds.threads, FOCUS),
  };
}
