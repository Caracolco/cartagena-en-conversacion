/** Resumen en consola de los indicadores calculados sobre public/data/base.json. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyOverrides, countable } from '../src/lib/overrides';
import { candidateStats, overview, topicStats } from '../src/lib/metrics';
import { buildConclusions } from '../src/lib/conclusions';
import revisiones from '../src/data/revisiones-base.json';
import type { Dataset, Overrides } from '../src/lib/types';

const ds: Dataset = JSON.parse(readFileSync(resolve(process.cwd(), 'public', 'data', 'base.json'), 'utf8'));
const ms = countable(applyOverrides(ds, revisiones as Overrides));
const o = overview(ms);
console.log({ total: o.total, posts: o.posts, comments: o.comments, threads: o.threads, direct: o.direct, sentiment: o.sentiment });
console.table(
  candidateStats(ms).map((s) => ({
    figura: s.name,
    propia: s.propia,
    espont: s.espontanea,
    contexto: s.contexto,
    pend: s.pending,
    share: s.share.toFixed(1),
    growth: s.growth?.toFixed(0) ?? '-',
    pos: s.sentiment.positivo,
    neg: s.sentiment.negativo,
    medios: s.mediaItems,
    atl: s.atlItems,
    cobertura: s.coverage,
  })),
);
console.table(topicStats(ms).map((t) => ({ tema: t.label, total: t.total, neg: t.negativo })));
for (const c of buildConclusions(ms, ds.threads)) console.log(`\n■ ${c.title}\n  ${c.figure} — ${c.figureLabel}\n  ${c.text}`);
