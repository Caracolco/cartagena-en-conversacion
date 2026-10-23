// @vitest-environment jsdom
/**
 * Informe ejecutivo sobre la base publicada: cifras coherentes entre capítulos, evidencias verificables
 * y navegación tipo presentación.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import { applyOverrides, countable } from '../src/lib/overrides';
import { candidateStats, counted } from '../src/lib/metrics';
import revisiones from '../src/data/revisiones-base.json';
import curated from '../src/data/evidencias.json';
import { buildStory } from '../src/report/story';
import Report, { CHAPTERS } from '../src/report/Report';
import Percepcion, { excerpt } from '../src/report/chapters/Percepcion';
import type { Dataset, Overrides } from '../src/lib/types';

const ds: Dataset = JSON.parse(readFileSync(resolve(__dirname, '..', 'public', 'data', 'base.json'), 'utf8'));
const ms = countable(applyOverrides(ds, revisiones as Overrides));
const story = buildStory(ds, ms);

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('cifras del informe', () => {
  it('conserva los registros depurados y analiza los contables', () => {
    expect(story.cleaned).toBe(ds.mentions.length);
    expect(story.analyzed).toBe(ms.length);
    expect(story.cleaned - story.analyzed).toBe(story.copies);
  });

  it('las cifras de figuras cuadran con las métricas por candidato', () => {
    const stats = candidateStats(ms);
    for (const r of story.figures.rows) {
      const s = stats.find((x) => x.id === r.id)!;
      expect(r.direct).toBe(s.propia + s.espontanea);
      expect(r.contexto).toBe(s.contexto);
    }
    expect(story.figures.totalSpont).toBe(stats.reduce((a, s) => a + s.espontanea, 0));
  });

  it('Wilson: propias + terceros = directas, y la evolución mensual suma lo mismo', () => {
    const w = story.wilson;
    expect(w.s.propia + w.s.espontanea).toBe(w.s.direct);
    expect(w.monthly.reduce((a, m) => a + m.propia + m.terceros, 0)).toBe(w.s.direct);
    const sent = w.sentiment.positivo + w.sentiment.negativo + w.sentiment.neutral;
    expect(sent).toBe(ms.filter((m) => counted(m).some((c) => c.id === 'toncel' && c.rel !== 'contexto')).length);
  });

  it('el sentimiento suma el total analizado', () => {
    const c = story.sentiment.counts;
    expect(c.positivo + c.negativo + c.neutral).toBe(story.analyzed);
  });

  it('máximo cinco conclusiones, con cifras y sin recomendaciones electorales', () => {
    expect(story.conclusions.length).toBeGreaterThan(0);
    expect(story.conclusions.length).toBeLessThanOrEqual(5);
    const text = story.conclusions.map((c) => `${c.title} ${c.text}`).join(' ');
    for (const c of story.conclusions) expect(c.text).toMatch(/\d/);
    expect(text).not.toMatch(/intenci[oó]n de voto|ganar[aá]|deber[ií]a votar|vote por/i);
  });
});

describe('evidencias', () => {
  const all = [...story.evidence.percepcion, ...story.evidence.ciudad.items, ...story.evidence.figuras.items];

  it('entre seis y nueve, todas presentes en la base', () => {
    expect(all.length).toBe(curated.percepcion.items.length + curated.ciudad.items.length + curated.figuras.items.length);
    expect(all.length).toBeGreaterThanOrEqual(6);
    expect(all.length).toBeLessThanOrEqual(9);
  });

  it('el texto, la fecha, la plataforma y el enlace son los del registro original', () => {
    for (const e of all) {
      const m = ms.find((x) => x.id === e.id)!;
      expect(e.text).toBe((m.content || m.title).trim());
      expect(e.date).toBe(m.date);
      expect(e.platform).toBe(m.platform);
      expect(e.link).toBe(m.link);
      expect(e.link).toMatch(/^https?:\/\//);
      expect(e.sentiment).toBe(m.sentiment);
    }
  });

  it('cubre positivo, negativo y neutral', () => {
    expect(new Set(story.evidence.percepcion.map((e) => e.sentiment))).toEqual(new Set(['positivo', 'negativo', 'neutral']));
  });

  it('el extracto no altera el texto: es un prefijo del original', () => {
    for (const e of all) {
      const x = excerpt(e.text);
      const original = e.text.replace(/\s+/g, ' ').trim();
      expect(original.startsWith(x.text.replace(/…$/, ''))).toBe(true);
    }
  });

  it('cada tarjeta muestra figura o tema, sentimiento, plataforma, fecha y enlace', () => {
    render(<Percepcion s={story} step={1} />);
    const cards = document.querySelectorAll('[data-evidence]');
    expect(cards.length).toBe(story.evidence.ciudad.items.length);
    for (const c of cards) {
      expect(c.querySelector('a[href^="http"]')).not.toBeNull();
      expect(c.textContent).toMatch(/Positivo|Negativo|Neutral/);
      expect(c.textContent).toMatch(/(Facebook|Instagram|TikTok|X|YouTube|Sitios web), \d{1,2} [a-z]{3} 20\d\d/);
    }
  });
});

describe('navegación', () => {
  it('seis capítulos, sin numeración visible', () => {
    expect(CHAPTERS).toHaveLength(6);
    render(<Report ds={ds} ms={ms} />);
    const nav = screen.getByRole('navigation', { name: 'Capítulos' });
    expect(nav.textContent).not.toMatch(/\d/);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Cartagena en Conversación');
  });

  it('las flechas del teclado avanzan y retroceden entre capítulos', async () => {
    render(<Report ds={ds} ms={ms} />);
    await act(async () => {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
    });
    expect(await screen.findByRole('region', { name: 'Panorama de conversación' })).toBeTruthy();
    expect(window.location.hash).toBe('#/panorama');
    await act(async () => {
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
    });
    expect(await screen.findByRole('heading', { level: 1 })).toBeTruthy();
  });

  it('el último capítulo recorre tono, voces y conclusiones', async () => {
    window.location.hash = '#/percepcion';
    render(<Report ds={ds} ms={ms} />);
    expect(await screen.findByRole('region', { name: 'Percepción y conclusiones: Tono' })).toBeTruthy();
    await act(async () => {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
    });
    expect(await screen.findByRole('region', { name: 'Percepción y conclusiones: Voces de la ciudad' })).toBeTruthy();
    await act(async () => {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
    });
    expect(await screen.findByRole('region', { name: 'Percepción y conclusiones: Voces sobre las figuras' })).toBeTruthy();
    expect(window.location.hash).toBe('#/percepcion/2');
    await act(async () => {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
    });
    const list = await screen.findByRole('list', { name: 'Conclusiones' });
    expect(list.querySelectorAll('li').length).toBe(story.conclusions.length);
  });
});
