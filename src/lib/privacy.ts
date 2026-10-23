import { isTagOnly } from './pipeline';
import type { Dataset, SourceType } from './types';

/** Fuentes públicas cuyo nombre se conserva: cuentas de las figuras y medios. */
const PUBLIC_SOURCES: SourceType[] = ['propia', 'medio-tradicional', 'medio-digital'];

/**
 * Prepara la base para publicarla: reemplaza los nombres de personas particulares (comentaristas y cuentas
 * sociales) por un seudónimo y vacía los comentarios que solo etiquetan a otra persona. `pseudonym` debe ser
 * estable dentro de la base (el mismo autor recibe el mismo seudónimo) para que la detección de copias no cambie.
 */
export function anonymize(ds: Dataset, pseudonym: (author: string) => string): Dataset {
  const alias = (a: string) => (a ? pseudonym(a) : '');
  const publicAuthors = new Set(ds.mentions.filter((m) => PUBLIC_SOURCES.includes(m.sourceType)).map((m) => m.author));

  const mentions = ds.mentions.map((m) => {
    if (PUBLIC_SOURCES.includes(m.sourceType)) return m;
    const author = alias(m.author);
    return {
      ...m,
      author,
      outlet: m.outlet ? author : undefined,
      content: m.isComment && m.lowText && isTagOnly(m.content) ? '' : m.content,
    };
  });

  const threads = Object.fromEntries(
    Object.entries(ds.threads).map(([k, t]) => [
      k,
      t.ownerCand || publicAuthors.has(t.author) ? t : { ...t, author: alias(t.author) },
    ]),
  );

  return { ...ds, mentions, threads };
}
