/**
 * Pruebas de integración sobre el Excel real (carpeta superior). Se omiten si el archivo no está disponible,
 * por ejemplo en GitHub Actions.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseWorkbook } from '../src/lib/excel';
import { buildDataset, datasetToRaw } from '../src/lib/pipeline';
import { applyOverrides, countable } from '../src/lib/overrides';
import { candidateStats, overview } from '../src/lib/metrics';
import { buildConclusions } from '../src/lib/conclusions';
import { topicStats } from '../src/lib/metrics';
import revisiones from '../src/data/revisiones-base.json';
import { anonymize } from '../src/lib/privacy';
import { createHash } from 'node:crypto';
import type { Dataset, Overrides } from '../src/lib/types';

const hash = (a: string) => createHash('sha256').update(a).digest('hex').slice(0, 6);

const dir = resolve(__dirname, '..', '..');
const file = existsSync(dir) ? readdirSync(dir).find((f) => /^Wilson_Ernesto_Toncel.*\.xlsx$/.test(f)) : undefined;

describe.skipIf(!file)('base real', () => {
  const raw = file ? parseWorkbook(readFileSync(resolve(dir, file))) : [];
  const ds = buildDataset(raw, [file ?? '']);
  const active = countable(applyOverrides(ds, revisiones as Overrides));

  it('lee todas las filas y elimina solo duplicados por id', () => {
    expect(raw).toHaveLength(4843);
    expect(ds.audit.duplicateIdRemoved).toBe(194);
    expect(ds.mentions).toHaveLength(4649);
    expect(new Set(ds.mentions.map((m) => m.id)).size).toBe(4649);
  });

  it('todas las revisiones base apuntan a registros existentes', () => {
    const ids = new Set(ds.mentions.map((m) => m.id));
    for (const id of Object.keys(revisiones)) expect(ids.has(id)).toBe(true);
  });

  it('no atribuye al candidato las menciones del exalcalde fallecido', () => {
    const exalcalde = ds.mentions.filter((m) => /13 años sin Campo Elías/i.test(m.content));
    expect(exalcalde.length).toBeGreaterThan(0);
    for (const m of exalcalde) expect(m.cands.find((c) => c.id === 'teran')).toBeUndefined();
  });

  it('las publicaciones de @wtoncel son propias, no espontáneas', () => {
    const own = ds.mentions.filter((m) => /@wtoncel/.test(m.author));
    expect(own.length).toBeGreaterThanOrEqual(25);
    for (const m of own) expect(m.cands.find((c) => c.id === 'toncel')?.rel).toBe('propia');
  });

  it('el sondeo multicandidato no infla las menciones directas', () => {
    const stats = candidateStats(active);
    const morales = stats.find((s) => s.id === 'morales')!;
    expect(morales.contexto).toBeGreaterThan(morales.espontanea * 5);
    expect(morales.coverage).toBe('limitada');
  });

  it('separa la conversación institucional de Óscar Torres', () => {
    const t = candidateStats(active).find((s) => s.id === 'torres')!;
    expect(t.torres!.institucional).toBeGreaterThan(t.torres!.politica);
    expect(t.torres!.politica).toBeGreaterThan(0);
  });

  it('las participaciones suman 100 %', () => {
    const total = candidateStats(active).reduce((a, s) => a + s.share, 0);
    expect(total).toBeCloseTo(100, 5);
  });

  it('genera como máximo cinco conclusiones con cifras', () => {
    const c = buildConclusions({ stats: candidateStats(active), topics: topicStats(active) });
    expect(c.length).toBeGreaterThan(0);
    expect(c.length).toBeLessThanOrEqual(5);
    for (const x of c) expect(x.text).toMatch(/\d/);
    expect(c.map((x) => x.text).join(' ')).not.toMatch(/intenci[oó]n de voto|ganar[aá]|deber[ií]a votar/i);
  });

  it('el panorama cuadra con los registros contables', () => {
    const o = overview(active);
    expect(o.posts + o.comments).toBe(o.total);
    expect(o.byPlatform.reduce((a, p) => a + p.total, 0)).toBe(o.total);
  });
});

describe.skipIf(!file)('anonimización de la base publicada', () => {
  const raw = file ? parseWorkbook(readFileSync(resolve(dir, file))) : [];
  const ds = buildDataset(raw, [file ?? '']);
  const pub = anonymize(ds, (a) => `Usuario ${hash(a)}`);
  const stats = (d: Dataset) => candidateStats(countable(applyOverrides(d, revisiones as Overrides)));

  it('no publica nombres de comentaristas ni de cuentas particulares', () => {
    for (const m of pub.mentions.filter((x) => x.sourceType === 'comentario' || x.sourceType === 'cuenta-social')) {
      if (m.author) expect(m.author).toMatch(/^Usuario [0-9a-f]{6}$/);
    }
  });

  it('conserva las cuentas propias y los medios', () => {
    expect(pub.mentions.filter((m) => /@wtoncel/.test(m.author)).length).toBeGreaterThanOrEqual(25);
    expect(pub.mentions.filter((m) => m.sourceType === 'medio-digital').every((m) => !/^Usuario /.test(m.author))).toBe(true);
  });

  it('no cambia ningún indicador ni el resultado de reprocesar la base', () => {
    expect(stats(pub)).toEqual(stats(ds));
    const key = (d: Dataset) => d.mentions.map((m) => `${m.id}|${m.sourceType}|${m.lowText}|${m.sentiment}|${m.cands.map((c) => c.id + c.rel).join()}`);
    const again = (d: Dataset) => key(buildDataset(datasetToRaw(d), d.audit.sourceFiles));
    expect(again(pub)).toEqual(again(ds));
  });
});

describe('base publicada (public/data/base.json)', () => {
  const pub: Dataset = JSON.parse(readFileSync(resolve(__dirname, '..', 'public', 'data', 'base.json'), 'utf8'));
  it('solo contiene seudónimos para autores particulares', () => {
    const names = pub.mentions.filter((m) => (m.sourceType === 'comentario' || m.sourceType === 'cuenta-social') && m.author && !/^Usuario [0-9a-f]{6}$/.test(m.author));
    expect(names).toHaveLength(0);
  });
});
