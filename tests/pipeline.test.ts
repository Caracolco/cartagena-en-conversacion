import { describe, expect, it } from 'vitest';
import { buildDataset, detectCandidates, teranIdentity, torresScope } from '../src/lib/pipeline';
import { classifySentiment, classifyTarget } from '../src/lib/sentiment';
import { applyOverrides, countable } from '../src/lib/overrides';
import { norm, isCaptionless } from '../src/lib/text';
import type { RawRow } from '../src/lib/types';

const row = (p: Partial<RawRow>): RawRow => ({
  id: 'x',
  type: 'Comment',
  title: '',
  author: '',
  content: '',
  created: '2026-05-01 10:00:00',
  context: '',
  link: 'https://fb.com/p/1',
  domain: 'www.facebook.com',
  group: 'Facebook',
  sentiment: 'NEUTRAL',
  keywords: '',
  interactions: 0,
  views: 0,
  country: 'co',
  threadId: '',
  ...p,
});

const base = { isComment: true, author: '', parent: '', parentCaptionless: false, keywords: '' };

describe('normalización', () => {
  it('quita tildes y entidades', () => {
    expect(norm('Óscar &quot;Torres&quot;  Campo Elías')).toBe('oscar "torres" campo elias');
  });
  it('detecta reels sin texto', () => {
    expect(isCaptionless('01:00 https://www.facebook.com/reel/155/ visor caribe noticias 1021 1021 155')).toBe(true);
    expect(isCaptionless('01:48 javier julio bejarano renuncia a su curul en el concejo de cartagena con emotivas palabras')).toBe(false);
  });
});

describe('atribución de figuras', () => {
  it('separa mención directa de conversación de contexto', () => {
    const d = detectCandidates({ ...base, own: 'que buen lider', parent: 'votarias por javier julio bejarano' });
    expect(d.links).toEqual([{ id: 'bejarano', rel: 'contexto', via: 'hilo' }]);
    const e = detectCandidates({ ...base, own: 'bejarano es el alcalde', parent: 'votarias por javier julio bejarano' });
    expect(e.links[0]).toMatchObject({ id: 'bejarano', rel: 'espontanea', via: 'texto' });
  });

  it('reconoce publicaciones propias por la cuenta', () => {
    const d = detectCandidates({ ...base, isComment: false, own: 'feliz ano nuevo', author: norm('Wilson Toncel Ochoa (@wtoncel)') });
    expect(d.links).toEqual([{ id: 'toncel', rel: 'propia', via: 'autor' }]);
  });

  it('excluye a Armando Benedetti', () => {
    const d = detectCandidates({ ...base, own: 'armando benedetti viste como dumek puso transcaribe' });
    expect(d.links.find((l) => l.id === 'benedetti')).toBeUndefined();
    expect(d.exclusions[0]).toMatchObject({ cand: 'benedetti' });
  });

  it('deja pendiente el apellido Benedetti fuera de un hilo sobre Jorge Benedetti', () => {
    const d = detectCandidates({ ...base, own: 'me la juego con benedetti' });
    expect(d.links[0]).toMatchObject({ id: 'benedetti', pending: expect.any(String) });
  });

  it('no confunde el nombre del comentarista con una mención', () => {
    const d = detectCandidates({ ...base, own: 'oscar torres cartagena yo jamas compro en esas plataformas', parent: 'comercio local' });
    expect(d.links).toHaveLength(0);
    expect(d.exclusions[0].cand).toBe('torres');
  });

  it('marca como pendiente lo atribuido solo por palabra clave', () => {
    const d = detectCandidates({ ...base, own: 'que video', parent: '00:29 https://fb.com/reel/1 cali al dia', parentCaptionless: true, keywords: 'cartagena bruno hernandez' });
    expect(d.links[0]).toMatchObject({ id: 'hernandez', via: 'palabra-clave', pending: expect.any(String) });
  });
});

describe('identidad de Campo Elías', () => {
  it('separa al director del IDER del exalcalde fallecido', () => {
    expect(teranIdentity('campo elias teheran, director del ider', '')).toBe('ider');
    expect(teranIdentity('13 anos sin campo elias teheran: la voz que desperto a cartagena', '')).toBe('otra');
    expect(teranIdentity('campo elias teheran dix, ex alcalde de la ciudad', '')).toBe('otra');
    expect(teranIdentity('suenan bruno hernandez, campo elias teran y gissela roman', '')).toBe('ambigua');
  });
  it('excluye al exalcalde y deja pendiente lo ambiguo', () => {
    const a = detectCandidates({ ...base, isComment: false, own: '13 anos sin campo elias teheran: la voz que desperto a cartagena' });
    expect(a.links).toHaveLength(0);
    expect(a.exclusions[0].cand).toBe('teran');
    const b = detectCandidates({ ...base, isComment: false, own: 'en la baraja estarian bruno hernandez y campo elias teran' });
    expect(b.links.find((l) => l.id === 'teran')?.pending).toBeTruthy();
  });
});

describe('alcance de Óscar Torres', () => {
  it('distingue lo institucional de lo político', () => {
    expect(torresScope('el presidente de la ani, oscar torres, explico la reversion del peaje')).toBe('institucional');
    expect(torresScope('oscar torres se perfila como aspirante a la alcaldia de cartagena')).toBe('politica');
    expect(torresScope('oscar torres, quien hasta hace pocos dias estuvo al frente de la ani, aspira a la alcaldia')).toBe('politica');
  });
});

describe('sentimiento y objetivo', () => {
  const ctx = { pollThread: false, namesCandidate: false };
  it('clasifica expresiones claras', () => {
    expect(classifySentiment('excelente gestion, felicitaciones', ctx).sentiment).toBe('positivo');
    expect(classifySentiment('son unos corruptos y ladrones', ctx).sentiment).toBe('negativo');
    expect(classifySentiment('a que hora es la reunion?', ctx).sentiment).toBe('neutral');
  });
  it('maneja negaciones y mensajes mixtos', () => {
    expect(classifySentiment('ponga gente idonea, no ratas', ctx).sentiment).not.toBe('positivo');
    expect(classifySentiment('excelente, todavia es mal presidente', ctx).sentiment).toBe('neutral');
  });
  it('interpreta respuestas de sondeo', () => {
    expect(classifySentiment('bejarano', { pollThread: true, namesCandidate: true }).sentiment).toBe('positivo');
    expect(classifySentiment('por ninguno', { pollThread: true, namesCandidate: false }).sentiment).toBe('negativo');
  });
  it('diferencia críticas a la ciudad, al gobierno nacional y a candidatos', () => {
    const c = { pollThread: false, namesCandidate: false, candidateThread: false };
    expect(classifyTarget('las calles de cartagena estan llenas de huecos', 'negativo', c)).toBe('ciudad');
    expect(classifyTarget('petro y su gobierno son un desastre', 'negativo', c)).toBe('nacional');
    expect(classifyTarget('bruno es un mentiroso', 'negativo', { ...c, namesCandidate: true })).toBe('candidato');
    expect(classifyTarget('nada', 'neutral', c)).toBe('ninguno');
  });
});

describe('pipeline', () => {
  const rows: RawRow[] = [
    row({ id: 'p1', type: 'Post', content: '¿Votarías por Bruno Hernández para la Alcaldía de Cartagena?', created: '2026-05-01 09:00:00' }),
    row({ id: 'c1', content: 'Bruno Hernández', context: '¿Votarías por Bruno Hernández para la Alcaldía de Cartagena?' }),
    row({ id: 'c1', content: 'Bruno Hernández', created: '2026-05-03 10:00:00', context: '¿Votarías por Bruno Hernández?' }),
    row({ id: 'c2', content: 'Excelente iniciativa', context: '¿Votarías por Bruno Hernández para la Alcaldía de Cartagena?' }),
    row({ id: 'c3', content: 'Bejarano', context: '¿Votarías por Bruno Hernández para la Alcaldía de Cartagena?' }),
  ];
  const ds = buildDataset(rows, ['prueba.xlsx']);

  it('elimina duplicados reales por id y conserva la captura más temprana', () => {
    expect(ds.audit.duplicateIdRemoved).toBe(1);
    expect(ds.mentions.filter((m) => m.id === 'c1')).toHaveLength(1);
    expect(ds.mentions.find((m) => m.id === 'c1')!.created).toBe('2026-05-01 10:00:00');
  });

  it('no pierde comentarios distintos', () => {
    expect(ds.mentions.map((m) => m.id).sort()).toEqual(['c1', 'c2', 'c3', 'p1']);
  });

  it('hereda la figura del hilo solo como contexto', () => {
    const c2 = ds.mentions.find((m) => m.id === 'c2')!;
    expect(c2.cands).toEqual([{ id: 'hernandez', rel: 'contexto', via: 'hilo' }]);
    const c3 = ds.mentions.find((m) => m.id === 'c3')!;
    expect(c3.cands.map((c) => `${c.id}:${c.rel}`).sort()).toEqual(['bejarano:espontanea', 'hernandez:contexto']);
  });

  it('conserva el enlace original como evidencia', () => {
    expect(ds.mentions.every((m) => m.link.startsWith('https://'))).toBe(true);
  });

  it('aplica revisiones manuales sin mutar el dataset', () => {
    const active = applyOverrides(ds, { c2: { sentiment: 'negativo', note: 'ironía' } }, { c3: { exclude: true } });
    expect(active.find((m) => m.id === 'c2')!.sentiment).toBe('negativo');
    expect(active.find((m) => m.id === 'c2')!.reviewed).toBe(true);
    expect(countable(active).find((m) => m.id === 'c3')).toBeUndefined();
    expect(ds.mentions.find((m) => m.id === 'c2')!.reviewed).toBeUndefined();
  });

  it('confirma o descarta vínculos pendientes', () => {
    const d2 = buildDataset([row({ id: 'z', type: 'Post', content: 'Me la juego con Benedetti' })], []);
    expect(d2.mentions[0].cands[0].pending).toBeTruthy();
    const ok = applyOverrides(d2, { z: { confirm: ['benedetti'] } });
    expect(ok[0].cands[0].pending).toBeUndefined();
    const no = applyOverrides(d2, { z: { reject: ['benedetti'] } });
    expect(no[0].cands).toHaveLength(0);
  });
});
