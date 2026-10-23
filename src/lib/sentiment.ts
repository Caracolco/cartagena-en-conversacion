import type { Sentiment, Target } from './types';
import { letters } from './text';

// Léxicos sobre texto normalizado (sin tildes, minúsculas). Peso 2 = expresión inequívoca.
const POS: [RegExp, number][] = [
  [/\bexcelente|\bexcelentisim/, 2],
  [/\bfelicit/, 2],
  [/\bapoyo\b|\bapoyamos\b|\brespald/, 2],
  [/\bvamos (con|por|pa|para)\b|\bvamos firmes\b|\bcon toda\b|\bcuenta conmigo|\bcuente conmigo/, 2],
  [/\bes el alcalde\b|\bsera el (proximo )?alcalde\b|\bproximo alcalde\b|\bnuestro alcalde\b|\bmi alcalde\b|\bsera alcalde\b/, 2],
  [/\bmi voto\b|\bvotare por\b|\bvoto por\b|\bme la juego\b|\bmi candidato\b/, 2],
  [/\bla mejor opcion\b|\bel mejor\b|\bla mejor\b|\bmuy bueno\b|\bbuen trabajo\b|\bgran trabajo\b|\bgran gestion\b|\bbuena gestion\b/, 2],
  [/\bgracias\b|\bbendicion|\bdios (lo|la|te|los) bendiga|\bbravo\b|\borgullo/, 1],
  [/\bbuen[oa]?s?\b|\bbien\b|\bgran(de)?\b|\bhonest|\btrabajador|\bcapaz\b|\bpreparad|\bseri[oa]\b|\bdecente|\bexito|\badelante\b|\bfuerza\b|\bde acuerdo\b|\btiene razon\b|\bme gusta|\bhermos|\bmaravill|\blider\b|\bcumpl(e|io)\b/, 1],
  [/👏|💪|❤|♥|🙌|👍|✅|🥰|😍|🤝|🇨🇴/u, 1],
];

const NEG: [RegExp, number][] = [
  [/\bcorrupt|\bladron|\bratero|\bratas?\b|🐀|\bmafia|\bdelincuent|\bcriminal|\bsaque|\bestaf|\bsinverguenz|\bdescarad/, 2],
  [/\brob(o|an|aron|ando|ado)\b/, 2],
  [/\bmentir|\bmentiros|\bpayas|\bbasura\b|\bporqueria|\bverguenza|\bpesim|\bnefast|\binutil|\bincompetent|\bmediocr|\bdesastre|\bcaos\b|\babandon|\basco\b|\bhorrible|\bpopulis|\blambon|\bhp\b|\bhpta|\bmalparid|\bgonorrea|\bcare (verga|monda)|\bjodid/, 2],
  [/\bpor ninguno\b|^ninguno\b|\bni por\b|\bnunca votaria|\bno votare|\bjamas votar|\bfuera\b(?! de)|\bque se vaya|\bno sirve|\bno sirven|\bno hace nada|\bno ha hecho nada/, 2],
  [/\bmal[oa]?s?\b|\bpeor\b|\btriste\b|\bshow\b|\bengan|\bpolitiqueria|\bmermelada|\bfalso\b|\bnunca se (ha )?visto|\bculpa\b|\bvergonzos|\bburla|\bno (es|son) (bueno|capaz)/, 1],
  [/👎|🤮|🤡|💩|😡|🤬|😠|🖕/u, 1],
];

const NEGATION = /\b(no|nunca|jamas|ni|nada|menos)\s+(es\s+|son\s+|fue\s+|esta\s+|me\s+)?$/;

function score(t: string, lex: [RegExp, number][]): number {
  let s = 0;
  for (const [re, w] of lex) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    for (const m of t.matchAll(g)) {
      const before = t.slice(Math.max(0, (m.index ?? 0) - 14), m.index);
      // Un término negado («no ratas», «no es bueno») no suma en ninguna dirección.
      if (!NEGATION.test(before)) s += w;
    }
  }
  return s;
}

export interface SentimentContext {
  /** El comentario está en un hilo tipo sondeo ("¿votarías por…?"). */
  pollThread: boolean;
  /** El texto nombra a alguna de las siete figuras. */
  namesCandidate: boolean;
}

/** Autopromoción de páginas ("Súmate a…", "Síguenos…"): no expresa opinión. */
const PROMO = /\bsumate a\b|\bsiguenos\b|\bsuscrib|\bunete a nuestr|canal de whatsapp|\bdale like\b/;
/** Expresión de preferencia o rechazo electoral: la valoración recae en candidaturas. */
const ELECTORAL = /proximo alcalde|es el alcalde|sera (el )?alcalde|\bmi voto\b|\bvotar|\bvoto (por|para)\b|candidat|\bapoyo a\b|\baspira|\bnuestro alcalde/;

const NATIONAL = /\bpetro\b|gobierno nacional|\bel presidente\b|\binvias\b|\bministr|\bcongreso\b|socialis|izquierd|pacto historico|\bcepeda\b|\buribe\b|\bpetrismo|\bel gobierno\b/;
const CITY = /\bcartagena\b|\bciudad\b|alcaldia|\bdumek|\bbarrios?\b|\bcalles?\b|\bvias?\b|inundac|transcaribe|\bbasura|servicio|\bagua\b|\bla luz\b|\benergia\b|afinia|insegur|\bhuecos?\b|trafico|\bplaya|\bconcejo\b/;

/** Comentario que solo nombra a una figura (o la proclama) dentro de un sondeo: expresa preferencia. */
export function isNameOnlyPollAnswer(t: string): boolean {
  const l = letters(t)
    .replace(/\b(javier|julio|bejarano|bruno|hernandez|ramos|jorge|benedetti|yoyo|rey|morales|wilson|toncel|ochoa|oscar|torres|campo|elias|teran|el|la|es|y|por|con|para|alcalde|que|de|e)\b/g, ' ')
    .trim();
  return l.length <= 4;
}

export function classifySentiment(t: string, ctx: SentimentContext): { sentiment: Sentiment; score: number } {
  if (!letters(t) && !/[👏💪❤👍👎🤮🤡💩😡🤬🐀🙌]/u.test(t)) return { sentiment: 'neutral', score: 0 };
  if (PROMO.test(t)) return { sentiment: 'neutral', score: 0 };
  const pos = score(t, POS);
  const neg = score(t, NEG);
  let s = pos - neg;
  // Mensajes mixtos («excelente… pero es mal presidente») solo se polarizan con margen claro.
  if (pos > 0 && neg > 0 && Math.abs(s) < 2) s = 0;
  // Risa junto a un elogio suele ser ironía: se neutraliza el elogio.
  if (/\bja(ja)+|\bjsjs|😂|🤣/.test(t) && s > 0) s = Math.min(s, 0.5);
  if (ctx.pollThread && ctx.namesCandidate && isNameOnlyPollAnswer(t) && s >= 0) s = Math.max(s, 2);
  if (ctx.pollThread && /^(por )?ningun[oa]\b|^nadie\b|\bninguno de (esos|ellos|los)/.test(t)) s = Math.min(s, -2);
  const sentiment: Sentiment = s >= 1.5 ? 'positivo' : s <= -1.5 ? 'negativo' : s >= 1 && !/[?¿]/.test(t) ? 'positivo' : s <= -1 ? 'negativo' : 'neutral';
  return { sentiment, score: s };
}

export function classifyTarget(t: string, sentiment: Sentiment, ctx: SentimentContext & { candidateThread: boolean }): Target {
  if (sentiment === 'neutral') return 'ninguno';
  if (ctx.namesCandidate) return 'candidato';
  if (ctx.pollThread && /ningun|nadie|todos (son|esos)|esos (son|personajes)/.test(t)) return 'candidato';
  if (ELECTORAL.test(t)) return 'candidato';
  const nat = NATIONAL.test(t);
  const city = CITY.test(t);
  if (nat && !city) return 'nacional';
  if (city) return 'ciudad';
  if (nat) return 'nacional';
  if (ctx.candidateThread) return 'candidato';
  return 'otro';
}
