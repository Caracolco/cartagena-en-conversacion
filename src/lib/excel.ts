import * as XLSX from 'xlsx';
import type { RawRow } from './types';

/** Columnas mínimas del export de Brand24 que el pipeline necesita. */
export const REQUIRED_COLUMNS = ['id', 'Specific type', 'Content of posts', 'Created', 'Link to the source', 'Domain group'];

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function toDateString(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 19).replace('T', ' ');
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    const p = (x: number) => String(x).padStart(2, '0');
    return `${d.y}-${p(d.m)}-${p(d.d)} ${p(d.H)}:${p(d.M)}:${p(Math.floor(d.S))}`;
  }
  return str(v).trim();
}

export class ExcelFormatError extends Error {}

export function parseWorkbook(data: ArrayBuffer | Uint8Array): RawRow[] {
  const wb = XLSX.read(data, { type: 'array' });
  const sheetName = wb.SheetNames.includes('Mentions') ? 'Mentions' : wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: '' });
  if (!rows.length) throw new ExcelFormatError('La hoja no contiene registros.');
  const missing = REQUIRED_COLUMNS.filter((c) => !(c in rows[0]));
  if (missing.length) {
    throw new ExcelFormatError(`El archivo no tiene el formato de exportación de Brand24. Faltan columnas: ${missing.join(', ')}.`);
  }
  return rows.map((r) => ({
    id: str(r['id']),
    type: str(r['Specific type']),
    title: str(r['Title']),
    author: str(r['Author']),
    content: str(r['Content of posts']),
    created: toDateString(r['Created']),
    context: str(r['Context']),
    link: str(r['Link to the source']),
    domain: str(r['Domain']),
    group: str(r['Domain group']),
    sentiment: str(r['Sentiment']),
    keywords: str(r['Keywords']),
    interactions: num(r['Total interactions']),
    views: num(r['views']),
    country: str(r['Country']),
    threadId: str(r['Thread ID']),
  }));
}
