import { PLATFORMS } from './config';
import { fmt, fmtPct } from './format';
import { median, type CandStats } from './metrics';
import type { CandidateId } from './types';

export interface Conclusion {
  id: string;
  title: string;
  figure: string;
  figureLabel: string;
  text: string;
}

interface Input {
  stats: CandStats[];
  topics: { label: string; total: number; negativo: number }[];
  focus?: CandidateId;
}

/** Máximo cinco conclusiones, todas derivadas de cifras. Sin inferencias de intención de voto. */
export function buildConclusions({ stats, topics, focus = 'toncel' }: Input): Conclusion[] {
  const w = stats.find((s) => s.id === focus);
  if (!w) return [];
  const others = stats.filter((s) => s.id !== focus);
  const out: Conclusion[] = [];

  // 1. Brecha de visibilidad
  const ranked = [...stats].sort((a, b) => b.espontanea - a.espontanea);
  const rank = ranked.findIndex((s) => s.id === focus) + 1;
  const leader = ranked[0];
  const med = median(others.map((s) => s.espontanea));
  out.push({
    id: 'brecha',
    title: 'Brecha de visibilidad espontánea',
    figure: fmt(w.espontanea),
    figureLabel: `menciones espontáneas · puesto ${rank} de ${stats.length}`,
    text:
      `Terceros nombran a Wilson Toncel ${fmt(w.espontanea)} veces (${fmtPct(w.share, 1)} de la conversación espontánea de las siete figuras). ` +
      `La mediana de las demás es ${fmt(med)} y ${leader.id === focus ? 'él lidera' : `${leader.name} lidera con ${fmt(leader.espontanea)}`}.`,
  });

  // 2. Plataformas
  const spontBy = (s: CandStats, p: (typeof PLATFORMS)[number]) => s.platforms[p].espontanea;
  const totalOthersSpont = others.reduce((a, s) => a + s.espontanea, 0) || 1;
  const byPlatform = PLATFORMS.map((p) => {
    const othersN = others.reduce((a, s) => a + spontBy(s, p), 0);
    const wN = spontBy(w, p);
    return { p, w: wN, othersShare: (othersN / totalOthersSpont) * 100, wShare: wN + othersN ? (wN / (wN + othersN)) * 100 : 0 };
  });
  const weak = byPlatform
    .filter((x) => x.othersShare >= 5)
    .sort((a, b) => a.wShare - b.wShare || b.othersShare - a.othersShare)
    .slice(0, 2);
  const ownTop = [...PLATFORMS].sort((a, b) => w.platforms[b].propia - w.platforms[a].propia)[0];
  if (weak.length) {
    out.push({
      id: 'plataformas',
      title: 'Plataformas con menor registro',
      figure: weak.map((x) => fmt(x.w)).join(' · '),
      figureLabel: `menciones de terceros en ${weak.map((x) => x.p).join(' y ')}`,
      text:
        `${weak.map((x) => `${x.p} (${fmtPct(x.othersShare)})`).join(' e ')} concentran la conversación espontánea de las demás figuras. ` +
        `Allí Wilson suma ${weak.map((x) => fmt(x.w)).join(' y ')} menciones de terceros (${weak.map((x) => fmtPct(x.wShare, 1)).join(' y ')} del total del canal). ` +
        (w.platforms[ownTop].propia ? `Sus publicaciones propias se concentran en ${ownTop} (${fmt(w.platforms[ownTop].propia)} de ${fmt(w.propia)}).` : ''),
    });
  }

  // 3. Propia vs. espontánea
  const ownShare = w.direct ? (w.propia / w.direct) * 100 : 0;
  const othersOwn = others.reduce((a, s) => a + s.propia, 0);
  const othersDirect = others.reduce((a, s) => a + s.direct, 0);
  out.push({
    id: 'propia',
    title: 'Más voz propia que conversación de terceros',
    figure: fmtPct(ownShare),
    figureLabel: 'de su presencia directa son publicaciones propias',
    text:
      `De ${fmt(w.direct)} registros directos, ${fmt(w.propia)} los publicó él y ${fmt(w.espontanea)} son de terceros. ` +
      `En las demás figuras las publicaciones propias son el ${fmtPct((othersOwn / (othersDirect || 1)) * 100)}. ` +
      (w.ownCommentsCaptured === 0 && w.propia > 0 ? 'La base no capturó comentarios en sus publicaciones.' : ''),
  });

  // 4. Temas
  const top = topics.filter((t) => t.total > 0).slice(0, 3);
  if (top.length) {
    out.push({
      id: 'temas',
      title: 'Temas que dominan la discusión pública',
      figure: top[0].label,
      figureLabel: `${fmt(top[0].total)} registros con el tema en su propio texto`,
      text:
        `Los temas más mencionados son ${top.map((t) => `${t.label.toLowerCase()} (${fmt(t.total)})`).join(', ')}. ` +
        `En ${top[0].label.toLowerCase()}, el ${fmtPct((top[0].negativo / (top[0].total || 1)) * 100)} de los registros es negativo.`,
    });
  }

  // 5. Medios
  const mediaLeader = [...others].sort((a, b) => b.mediaItems - a.mediaItems)[0];
  out.push({
    id: 'medios',
    title: 'Cobertura en medios digitales',
    figure: fmt(w.mediaItems),
    figureLabel: `notas de medios en ${fmt(w.mediaOutlets)} ${w.mediaOutlets === 1 ? 'fuente' : 'fuentes'}`,
    text:
      `Medios digitales publicaron ${fmt(w.mediaItems)} piezas que nombran a Wilson; ${
        w.atlItems === 0 ? 'ninguna proviene' : w.atlItems === 1 ? '1 proviene' : `${fmt(w.atlItems)} provienen`
      } de marcas de prensa, radio o TV en sus canales digitales` +
      (mediaLeader ? ` (${mediaLeader.name}: ${fmt(mediaLeader.mediaItems)} piezas en ${fmt(mediaLeader.mediaOutlets)} fuentes).` : '.') +
      ' La base no mide audiencias de prensa, radio ni televisión.',
  });

  return out.slice(0, 5);
}
