import type { Dataset, Mention, Override, Overrides } from './types';

export interface ActiveMention extends Mention {
  excluded?: boolean;
}

/** Aplica las revisiones manuales. No muta el dataset original. */
export function applyOverrides(ds: Dataset, ...layers: Overrides[]): ActiveMention[] {
  const merged: Overrides = {};
  for (const layer of layers) {
    for (const [id, o] of Object.entries(layer)) merged[id] = { ...merged[id], ...o };
  }
  return ds.mentions.map((m) => {
    const o: Override | undefined = merged[m.id];
    if (!o) return m;
    const out: ActiveMention = { ...m, reviewed: true, note: o.note ?? m.note };
    if (o.sentiment) out.sentiment = o.sentiment;
    if (o.target) out.target = o.target;
    if (o.topics) {
      out.topics = o.topics;
      out.topicSource = o.topics.length ? 'texto' : 'ninguno';
    }
    if (o.exclude === true) out.excluded = true;
    if (o.exclude === false) out.dupOf = undefined;
    if (o.confirm?.length || o.reject?.length) {
      out.cands = m.cands
        .filter((c) => !o.reject?.includes(c.id))
        .map((c) => (o.confirm?.includes(c.id) ? { ...c, pending: undefined } : c));
    }
    return out;
  });
}

/** Registros que cuentan para los indicadores: sin copias probables ni exclusiones. */
export function countable(ms: ActiveMention[]): ActiveMention[] {
  return ms.filter((m) => !m.dupOf && !m.excluded);
}
