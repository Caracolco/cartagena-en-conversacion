import { ATL_AUTHORS, ATL_DOMAINS, ATL_TEXT_REF, CANDIDATES, DIGITAL_MEDIA_AUTHORS, TOPICS, type CandidateDef } from './config';
import { classifySentiment, classifyTarget } from './sentiment';
import { isCaptionless, letters, norm, truncate, decodeEntities } from './text';
import type {
  Audit,
  CandidateId,
  CandLink,
  Dataset,
  Exclusion,
  Mention,
  Platform,
  RawRow,
  SourceType,
  Thread,
  TopicId,
} from './types';

const CONTENT_MAX = 2500;
const THREAD_MAX = 3000;

export function mapPlatform(group: string, domain: string): Platform {
  const g = group.toLowerCase();
  if (g.includes('facebook')) return 'Facebook';
  if (g.includes('instagram')) return 'Instagram';
  if (g.includes('tiktok')) return 'TikTok';
  if (g.includes('twitter') || g === 'x') return 'X';
  if (g === 'video' || domain.includes('youtube')) return 'YouTube';
  return 'Sitios web';
}

export function detectTopics(t: string): TopicId[] {
  return TOPICS.filter((tp) => tp.re.test(t)).map((tp) => tp.id);
}

const POLL = /votarias|por quien votar|si las elecciones fueran|apoyarias|quien (crees que )?(sera|seria) el proximo|pregunta del dia|sondeo|nombres que (comienzan a )?suenan|comienzan a sonar|empiezan a sonar|nombres que se mencionan/;

// --- Identidad y alcance -------------------------------------------------

const TERAN_OTHER = /exalcalde|ex alcalde|fallec|anos sin campo|desperto a cartagena|q\.?e\.?p\.?d|\bmurio\b|teheran di[xz]\b|dejo huella en la radio/;
const TERAN_IDER = /\bider\b|idercartagena|instituto distrital de deporte|teran humanez|deporte y recreacion|jaime moron|estadio|templo de(l)? futbol/;

export function teranIdentity(own: string, parent: string): 'ider' | 'otra' | 'ambigua' {
  if (TERAN_IDER.test(own)) return 'ider';
  if (TERAN_OTHER.test(own)) return 'otra';
  if (TERAN_OTHER.test(parent) && !TERAN_IDER.test(parent)) return 'otra';
  if (TERAN_IDER.test(parent)) return 'ider';
  return 'ambigua';
}

const TORRES_POL = /alcald|candidat|aspira|eleccion|electoral|campana politica|\bvotar|\bvoto\b|precandidat|\b2027\b|\bpolitic|gobernacion|\bpartido|renunci|\bcurul|\bsenado|\bcamara de representantes/;
const TORRES_INST = /\bani\b|agencia nacional de infraestructura|\bpeajes?\b|concesion|invias|canal del dique|aeropuerto|\bvias?\b|corredor|malecon|infraestructura/;
const TORRES_EX = /hasta hace|expresidente|exdirector|ex presidente|dejo la ani|salida de la ani|renuncio a la ani/;

export function torresScope(t: string): 'institucional' | 'politica' | 'otra' {
  const pol = TORRES_POL.test(t);
  const inst = TORRES_INST.test(t);
  if (pol && (!inst || TORRES_EX.test(t))) return 'politica';
  if (inst) return 'institucional';
  return 'otra';
}

// --- Detección de figuras --------------------------------------------------

interface DetectInput {
  isComment: boolean;
  own: string; // título + contenido normalizado
  author: string; // normalizado
  parent: string; // texto del hilo normalizado
  parentCaptionless: boolean;
  keywords: string; // normalizado
  threadOwner?: CandidateId;
}

const LOCAL = /cartagena|concej|alcald|candidat|bolivar|dumek|heroica/;

export function detectCandidates(x: DetectInput): { links: CandLink[]; exclusions: { cand: CandidateId; reason: string }[] } {
  const links: CandLink[] = [];
  const exclusions: { cand: CandidateId; reason: string }[] = [];
  for (const c of CANDIDATES) {
    const r = detectOne(c, x);
    if (r && 'reason' in r) exclusions.push({ cand: c.id, reason: r.reason });
    else if (r) links.push(r);
  }
  return { links, exclusions };
}

function detectOne(c: CandidateDef, x: DetectInput): CandLink | { reason: string } | null {
  const isOwn = !x.isComment && c.accounts.some((re) => re.test(x.author));
  if (isOwn) return finalize(c, { id: c.id, rel: 'propia', via: 'autor' }, x.own, x);

  const strongOwn = c.strong.test(x.own);
  const weakOwn = !strongOwn && !!c.weak && c.weak.test(x.own);
  const inThread = c.strong.test(x.parent);

  // Homónimos y falsos positivos conocidos.
  if (c.id === 'benedetti' && /armando benedetti/.test(x.own) && !strongOwn) {
    return { reason: 'Se refiere a Armando Benedetti (homónimo).' };
  }
  if (c.id === 'torres' && x.isComment && /^oscar torres cartagena\b/.test(x.own) && !inThread) {
    return { reason: '"Óscar Torres Cartagena" es el nombre del comentarista, no una mención.' };
  }

  if (strongOwn || (weakOwn && (inThread || (c.id !== 'benedetti' && LOCAL.test(x.own + ' ' + x.parent))))) {
    return finalize(c, { id: c.id, rel: 'espontanea', via: 'texto' }, x.own, x);
  }
  if (weakOwn && c.id === 'benedetti') {
    return finalize(c, { id: c.id, rel: 'espontanea', via: 'texto', pending: 'Solo el apellido "Benedetti": confirmar que se refiere a Jorge Benedetti.' }, x.own, x);
  }
  if (inThread && x.isComment) {
    const via = x.threadOwner === c.id ? 'publicacion-propia' : 'hilo';
    return finalize(c, { id: c.id, rel: 'contexto', via }, x.parent, x);
  }
  if (c.strong.test(x.keywords) && (x.parentCaptionless || !x.isComment) && !inThread) {
    return finalize(
      c,
      { id: c.id, rel: 'contexto', via: 'palabra-clave', pending: 'Atribuida solo por la palabra clave de Brand24; el texto visible no nombra a la figura.' },
      x.parent,
      x,
    );
  }
  return null;
}

function finalize(c: CandidateDef, link: CandLink, basis: string, x: DetectInput): CandLink | { reason: string } {
  if (c.id === 'torres') link.scope = torresScope(basis + (link.rel === 'contexto' ? '' : ' ' + x.parent.slice(0, 600)));
  if (c.id === 'teran') {
    const idn = teranIdentity(link.rel === 'contexto' ? '' : x.own, x.parent);
    if (idn === 'otra') return { reason: 'Se refiere a Campo Elías Teherán, exalcalde fallecido (otra persona).' };
    if (idn === 'ambigua' && !link.pending) link.pending = 'Identidad de Campo Elías no verificable en el texto.';
  }
  return link;
}

// --- Tipo de fuente --------------------------------------------------------

export function sourceTypeOf(r: { isComment: boolean; own: boolean; domain: string; author: string; platform: Platform }): SourceType {
  if (r.isComment) return 'comentario';
  if (r.own) return 'propia';
  const a = norm(r.author);
  if (ATL_DOMAINS.test(r.domain.replace(/^www\./, '')) || ATL_AUTHORS.test(a)) return 'medio-tradicional';
  if (r.platform === 'Sitios web' || DIGITAL_MEDIA_AUTHORS.test(a)) return 'medio-digital';
  return 'cuenta-social';
}

/** Comentario que es solo una etiqueta a otra persona ("Alexis Valerio Parias"). */
export function isTagOnly(content: string): boolean {
  const c = content.trim();
  return /^([A-ZÁÉÍÓÚÑ][a-záéíóúñü]+\s*){2,4}$/.test(c);
}

// --- Pipeline -------------------------------------------------------------

export function buildDataset(raw: RawRow[], sourceFiles: string[]): Dataset {
  // 1. Duplicados por id: se conserva la captura más temprana.
  const sorted = [...raw].sort((a, b) => (a.created < b.created ? -1 : a.created > b.created ? 1 : 0));
  const seen = new Set<string>();
  const rows: RawRow[] = [];
  for (const r of sorted) {
    if (!r.id || seen.has(r.id)) continue;
    seen.add(r.id);
    rows.push(r);
  }
  const duplicateIdRemoved = raw.length - rows.length;

  // 2. Hilos.
  const byLink = new Map<string, RawRow[]>();
  for (const r of rows) {
    const k = r.link || r.id;
    if (!byLink.has(k)) byLink.set(k, []);
    byLink.get(k)!.push(r);
  }
  const threads: Record<string, Thread> = {};
  const threadNorm = new Map<string, { text: string; captionless: boolean }>();
  for (const [k, list] of byLink) {
    const root = list.find((r) => r.type !== 'Comment');
    const ctxRow = list.find((r) => r.type === 'Comment' && r.context) ?? list[0];
    const rawText = root ? [root.title, root.content].filter(Boolean).join(' — ') || root.context : ctxRow.context;
    const text = decodeEntities(rawText || '');
    const t = norm(text);
    const captionless = isCaptionless(root ? root.context || text : ctxRow.context);
    const authorN = norm(root?.author ?? '') + ' ' + norm(ctxRow.context);
    const owner = CANDIDATES.find((c) => c.accounts.some((re) => re.test(authorN)))?.id;
    threads[k] = {
      id: k,
      platform: mapPlatform((root ?? list[0]).group, (root ?? list[0]).domain),
      author: root?.author ?? '',
      text: truncate(text, THREAD_MAX),
      link: k,
      date: (root ?? list[0]).created.slice(0, 10),
      cands: CANDIDATES.filter((c) => c.strong.test(t)).map((c) => c.id),
      ownerCand: owner,
      topics: detectTopics(t),
      isPoll: POLL.test(t),
      size: list.length,
    };
    threadNorm.set(k, { text: t, captionless });
  }

  // 3. Registros.
  const exclusions: Exclusion[] = [];
  const mentions: Mention[] = [];
  for (const r of rows) {
    const thread = threads[r.link || r.id];
    const tn = threadNorm.get(r.link || r.id)!;
    const isComment = r.type === 'Comment';
    const ownText = norm([r.title, r.content].filter(Boolean).join(' '));
    const platform = mapPlatform(r.group, r.domain);
    const det = detectCandidates({
      isComment,
      own: ownText,
      author: norm(r.author),
      parent: tn.text,
      parentCaptionless: tn.captionless,
      keywords: norm(r.keywords),
      threadOwner: thread.ownerCand,
    });
    for (const e of det.exclusions) {
      exclusions.push({ id: r.id, cand: e.cand, reason: e.reason, snippet: truncate(decodeEntities(r.content || r.title), 220), link: r.link });
    }
    const own = det.links.some((l) => l.rel === 'propia');
    const lowText = letters(ownText).length < 3 || (isComment && isTagOnly(r.content) && !det.links.some((l) => l.rel !== 'contexto'));
    const namesCandidate = det.links.some((l) => l.rel !== 'contexto');
    const candidateThread = thread.isPoll || CANDIDATES.some((c) => c.strong.test(tn.text.slice(0, 220)));
    const sctx = { pollThread: thread.isPoll && isComment, namesCandidate };
    let { sentiment, score } = lowText ? { sentiment: 'neutral' as const, score: 0 } : classifySentiment(ownText, sctx);
    const sourceType = sourceTypeOf({ isComment, own, domain: r.domain, author: r.author, platform });
    // Las notas de medios son informativas: solo se marcan con señales fuertes.
    if ((sourceType === 'medio-digital' || sourceType === 'medio-tradicional') && Math.abs(score) < 4) sentiment = 'neutral';
    const target = classifyTarget(ownText, sentiment, { ...sctx, candidateThread: candidateThread && isComment });
    let topics = lowText ? [] : detectTopics(ownText);
    let topicSource: Mention['topicSource'] = topics.length ? 'texto' : 'ninguno';
    if (!topics.length && isComment && thread.topics.length) {
      topics = thread.topics;
      topicSource = 'hilo';
    }
    mentions.push({
      id: r.id,
      type: r.type,
      isComment,
      platform,
      domain: r.domain,
      author: r.author,
      created: r.created,
      date: r.created.slice(0, 10),
      link: r.link,
      thread: r.link || r.id,
      title: decodeEntities(r.title),
      content: truncate(decodeEntities(r.content), CONTENT_MAX),
      keywords: r.keywords,
      interactions: r.interactions,
      views: r.views,
      country: r.country,
      sourceType,
      outlet: isComment ? undefined : platform === 'Sitios web' ? r.domain.replace(/^www\./, '') : r.author || undefined,
      atlRef: !isComment && ATL_TEXT_REF.test(ownText),
      sentimentOrig: r.sentiment,
      sentiment,
      target,
      topics,
      topicSource,
      cands: det.links,
      lowText,
    });
  }

  // 4. Copias probables: mismo texto largo en el mismo hilo, mismo autor (o desconocido), en menos de 60 min.
  const groups = new Map<string, Mention[]>();
  for (const m of mentions) {
    const l = letters(norm(m.content));
    if (l.length < 40) continue;
    const k = m.thread + '|' + l;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(m);
  }
  let probableCopies = 0;
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const first = g[0];
    for (const m of g.slice(1)) {
      const sameAuthor = !m.author || !first.author || m.author === first.author;
      const minutes = (Date.parse(m.created.replace(' ', 'T')) - Date.parse(first.created.replace(' ', 'T'))) / 60000;
      if (sameAuthor && minutes <= 60) {
        m.dupOf = first.id;
        probableCopies++;
      }
    }
  }

  const dates = mentions.map((m) => m.date).sort();
  const audit: Audit = {
    sourceFiles,
    rawRows: raw.length,
    duplicateIdRemoved,
    probableCopies,
    lowText: mentions.filter((m) => m.lowText).length,
    sentimentChanged: mentions.filter((m) => m.sentimentOrig && toEs(m.sentimentOrig) !== m.sentiment).length,
    sentimentEmptyOrig: mentions.filter((m) => !m.sentimentOrig).length,
    exclusions,
    pendingLinks: mentions.reduce((s, m) => s + m.cands.filter((c) => c.pending).length, 0),
    dateMin: dates[0] ?? '',
    dateMax: dates[dates.length - 1] ?? '',
  };

  return { version: 1, generatedAt: new Date().toISOString(), audit, mentions, threads };
}

export function toEs(s: string): string {
  const u = s.toUpperCase();
  return u === 'POSITIVE' ? 'positivo' : u === 'NEGATIVE' ? 'negativo' : u === 'NEUTRAL' ? 'neutral' : '';
}

/** Reconstruye filas de entrada desde un dataset procesado (para fusionar con un Excel nuevo). */
export function datasetToRaw(ds: Dataset): RawRow[] {
  return ds.mentions.map((m) => {
    const th = ds.threads[m.thread];
    return {
      id: m.id,
      type: m.type,
      title: m.title,
      author: m.author,
      content: m.content,
      created: m.created,
      context: m.isComment ? th?.text ?? '' : '',
      link: m.link,
      domain: m.domain,
      group: m.platform === 'X' ? 'X (Twitter)' : m.platform === 'Sitios web' ? 'Websites' : m.platform === 'YouTube' ? 'Video' : m.platform,
      sentiment: m.sentimentOrig,
      keywords: m.keywords,
      interactions: m.interactions,
      views: m.views,
      country: m.country,
      threadId: m.thread,
    };
  });
}
