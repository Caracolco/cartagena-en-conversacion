// @vitest-environment jsdom
/**
 * Pruebas de interfaz sobre la base publicada (public/data/base.json), para que corran también en CI.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { applyOverrides, countable } from '../src/lib/overrides';
import { applyFilters, EMPTY_FILTERS } from '../src/lib/metrics';
import { buildExportWorkbook } from '../src/lib/exporter';
import revisiones from '../src/data/revisiones-base.json';
import Conclusiones from '../src/sections/Conclusiones';
import Evidencias from '../src/sections/Evidencias';
import type { Dataset, Overrides } from '../src/lib/types';
import type { View } from '../src/sections/view';
import * as XLSX from 'xlsx';

const ds: Dataset = JSON.parse(readFileSync(resolve(__dirname, '..', 'public', 'data', 'base.json'), 'utf8'));

function makeView(filters = EMPTY_FILTERS): View {
  const all = applyOverrides(ds, revisiones as Overrides);
  const base = countable(all);
  return {
    ds,
    all,
    base,
    filtered: applyFilters(base, filters),
    noCand: applyFilters(base, filters, { ignoreCand: true }),
    filters,
    overrides: revisiones as Overrides,
    openReview: vi.fn(),
    showEvidence: vi.fn(),
    evidenceQuery: null,
  };
}

afterEach(cleanup);

describe('Conclusiones', () => {
  it('muestra como máximo cinco conclusiones, sin numeración visible en el título de sección', () => {
    render(<Conclusiones v={makeView()} />);
    const section = document.getElementById('conclusiones')!;
    expect(within(section).getByRole('heading', { level: 2 }).textContent).toBe('Conclusiones');
    expect(section.querySelectorAll('ol > li').length).toBeLessThanOrEqual(5);
    expect(section.textContent).toMatch(/no intención de voto/);
  });
});

describe('Evidencias', () => {
  it('lista registros con enlace al original y permite abrir la revisión', () => {
    const v = makeView();
    render(<Evidencias v={v} />);
    const links = screen.getAllByTitle('Abrir publicación original');
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].getAttribute('href')).toMatch(/^https?:\/\//);
    fireEvent.click(screen.getAllByTitle('Revisar clasificación')[0]);
    expect(v.openReview).toHaveBeenCalledTimes(1);
  });

  it('filtra pendientes de validación', () => {
    render(<Evidencias v={makeView()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pendientes de validación' }));
    expect(screen.getAllByText(/pendiente/).length).toBeGreaterThan(0);
  });
});

describe('Exportación', () => {
  it('genera un libro con datos depurados, vínculos y auditoría', () => {
    const v = makeView();
    const wb = XLSX.read(buildExportWorkbook(ds, v.all), { type: 'array' });
    expect(wb.SheetNames).toEqual(['Menciones depuradas', 'Figura por registro', 'Exclusiones', 'Auditoría']);
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets['Menciones depuradas']);
    expect(rows).toHaveLength(ds.mentions.length);
    expect(rows.every((r) => String(r.enlace).startsWith('http'))).toBe(true);
  });
});
