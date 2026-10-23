import { fmt, fmtPct } from './format';
import { candidateStats, concentration, countSentiment, median, pct, targetStats, topicStats } from './metrics';
import type { ActiveMention } from './overrides';
import type { CandidateId, Thread } from './types';

export interface Conclusion {
  id: 'visibilidad' | 'voz-propia' | 'temas' | 'percepcion' | 'cobertura';
  title: string;
  figure: string;
  figureLabel: string;
  text: string;
}

/** "más que duplican", "triplican"… para comparar dos cantidades sin decimales. */
export function ratioPhrase(a: number, b: number): string {
  const r = b ? a / b : 0;
  if (r >= 4) return `multiplican por ${Math.floor(r)}`;
  if (r >= 3) return 'triplican';
  if (r >= 2) return 'más que duplican';
  if (r > 1) return 'superan';
  return 'no superan';
}

/** Temas con volumen suficiente ordenados por proporción de registros negativos. */
export function topicsByNegativity(ms: ActiveMention[], minTotal = 100) {
  return topicStats(ms)
    .filter((t) => t.total >= minTotal)
    .map((t) => ({ ...t, negRate: pct(t.negativo, t.total) }))
    .sort((a, b) => b.negRate - a.negRate);
}

/** Autor que más se repite entre los hilos más grandes. */
export function dominantThreadAuthor(ms: ActiveMention[], threads: Record<string, Thread>, topN = 10) {
  const byThread = new Map<string, number>();
  for (const m of ms) byThread.set(m.thread, (byThread.get(m.thread) ?? 0) + 1);
  const top = [...byThread.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN);
  const authors = new Map<string, number>();
  for (const [id] of top) {
    const a = threads[id]?.author;
    if (a) authors.set(a, (authors.get(a) ?? 0) + 1);
  }
  const [author, count] = [...authors.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
  return { author, count, of: top.length };
}

/**
 * Máximo cinco conclusiones, todas derivadas de cifras de la base: visibilidad, voz propia, temas,
 * percepción y brechas de cobertura. No infiere intención de voto ni hace recomendaciones electorales.
 */
export function buildConclusions(ms: ActiveMention[], threads: Record<string, Thread>, focus: CandidateId = 'toncel'): Conclusion[] {
  const stats = candidateStats(ms);
  const w = stats.find((s) => s.id === focus);
  if (!w) return [];
  const others = stats.filter((s) => s.id !== focus);
  const out: Conclusion[] = [];

  // Visibilidad
  const ranked = [...stats].sort((a, b) => b.espontanea - a.espontanea);
  const rank = ranked.findIndex((s) => s.id === focus) + 1;
  const totalSpont = stats.reduce((a, s) => a + s.espontanea, 0);
  const [first, second] = ranked;
  const top2 = pct(first.espontanea + second.espontanea, totalSpont);
  out.push({
    id: 'visibilidad',
    title: 'Dos figuras concentran la conversación espontánea',
    figure: fmtPct(top2),
    figureLabel: `de las menciones de terceros son para ${first.name} y ${second.name}`,
    text:
      `De ${fmt(totalSpont)} menciones de terceros a las siete figuras, ${fmt(w.espontanea)} nombran a Wilson Toncel (${fmtPct(w.share, 1)}), ` +
      `puesto ${rank} de ${stats.length}. La mediana de las otras seis es ${fmt(median(others.map((s) => s.espontanea)))}.`,
  });

  // Voz propia
  const ownShare = pct(w.propia, w.direct);
  const othersOwn = others.reduce((a, s) => a + s.propia, 0);
  const othersDirect = others.reduce((a, s) => a + s.direct, 0);
  out.push({
    id: 'voz-propia',
    title: 'Wilson se escucha más en su voz que en la de otros',
    figure: fmtPct(ownShare),
    figureLabel: 'de su presencia directa son publicaciones propias',
    text:
      `${fmt(w.propia)} de sus ${fmt(w.direct)} registros directos los publicó él; ${fmt(w.espontanea)} vienen de terceros. ` +
      `En las otras seis figuras las publicaciones propias pesan el ${fmtPct(pct(othersOwn, othersDirect))}.`,
  });

  // Temas
  const topics = topicStats(ms).filter((t) => t.total > 0);
  const neg = topicsByNegativity(ms);
  if (topics.length >= 2) {
    const [t1, t2] = topics;
    const critical = neg[0];
    out.push({
      id: 'temas',
      title: 'La gestión de la ciudad domina la discusión',
      figure: fmt(t1.total),
      figureLabel: `registros hablan de ${t1.label.toLowerCase()}`,
      text:
        `${t1.label} (${fmt(t1.total)}) y ${t2.label.toLowerCase()} (${fmt(t2.total)}) encabezan los temas. ` +
        (critical ? `${critical.label} es el tema con más carga negativa: ${fmtPct(critical.negRate)} de sus registros.` : ''),
    });
  }

  // Percepción
  const s = countSentiment(ms);
  const targets = targetStats(ms, 'negativo');
  const wNeg = ms.filter((m) => m.sentiment === 'negativo' && m.cands.some((c) => c.id === focus && !c.pending && c.rel !== 'contexto')).length;
  out.push({
    id: 'percepcion',
    title: 'Tono mayoritariamente neutral; la crítica apunta a las figuras',
    figure: `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(s.negativo ? s.positivo / s.negativo : 0)} a 1`,
    figureLabel: `positivos por cada negativo (${fmt(s.positivo)} y ${fmt(s.negativo)})`,
    text:
      `Los positivos ${ratioPhrase(s.positivo, s.negativo)} a los negativos y el ${fmtPct(pct(s.neutral, ms.length))} es neutral. ` +
      `El ${fmtPct(pct(targets.candidato, s.negativo))} de la crítica se dirige a figuras o candidaturas. ` +
      `En los ${fmt(w.direct)} registros directos de Wilson hay ${fmt(wNeg)} negativos, una muestra demasiado pequeña para generalizar.`,
  });

  // Cobertura
  const conc = concentration(ms);
  const dom = dominantThreadAuthor(ms, threads);
  const fbOthers = pct(
    others.reduce((a, o) => a + o.platforms.Facebook.espontanea, 0),
    others.reduce((a, o) => a + o.espontanea, 0),
  );
  const wFb = w.platforms.Facebook.espontanea;
  out.push({
    id: 'cobertura',
    title: 'Brechas de captura que conviene investigar',
    figure: fmtPct(conc.share),
    figureLabel: 'del volumen está en solo 10 hilos',
    text:
      `${dom.count} de esos ${dom.of} hilos son de ${dom.author}. Facebook reúne el ${fmtPct(fbOthers)} de las menciones de terceros a las demás figuras ` +
      `y solo ${fmt(wFb)} a Wilson; sus publicaciones propias se capturaron sin comentarios. Ampliar fuentes y cuentas permitiría medir su conversación con más certeza.`,
  });

  return out.slice(0, 5);
}
