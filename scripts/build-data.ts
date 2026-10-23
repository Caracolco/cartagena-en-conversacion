/**
 * Genera public/data/base.json a partir de los Excel de Brand24 ubicados en la carpeta superior
 * (D:\ESCUCHA SOCIAL). Los archivos originales solo se leen.
 *   npm run data                → todos los .xlsx de la carpeta superior
 *   npm run data -- ruta.xlsx   → archivos indicados
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWorkbook } from '../src/lib/excel';
import { buildDataset } from '../src/lib/pipeline';
import { anonymize } from '../src/lib/privacy';
import { createHmac, randomBytes } from 'node:crypto';
import type { RawRow } from '../src/lib/types';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const files = args.length
  ? args.map((a) => resolve(a))
  : readdirSync(resolve(root, '..'))
      .filter((f) => /\.xlsx$/i.test(f) && !f.startsWith('~$'))
      .map((f) => resolve(root, '..', f));

if (!files.length) {
  console.error('No se encontraron archivos .xlsx.');
  process.exit(1);
}

const raw: RawRow[] = [];
for (const f of files) {
  const rows = parseWorkbook(readFileSync(f));
  console.log(`· ${basename(f)}: ${rows.length} filas`);
  raw.push(...rows);
}

const ds = buildDataset(raw, files.map((f) => basename(f)));
// El sitio es público: los autores particulares se publican con seudónimo. La sal se descarta al terminar.
const salt = randomBytes(16);
const pseudonym = (a: string) => `Usuario ${createHmac('sha256', salt).update(a).digest('hex').slice(0, 6)}`;
const out = join(root, 'public', 'data');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'base.json'), JSON.stringify(anonymize(ds, pseudonym)));

const a = ds.audit;
console.log(`Filas originales: ${a.rawRows}`);
console.log(`Duplicados por id eliminados: ${a.duplicateIdRemoved}`);
console.log(`Registros depurados: ${ds.mentions.length}`);
console.log(`Copias probables (marcadas): ${a.probableCopies}`);
console.log(`Sin texto analizable: ${a.lowText}`);
console.log(`Exclusiones por homonimia/identidad: ${a.exclusions.length}`);
console.log(`Vínculos pendientes de validación: ${a.pendingLinks}`);
console.log(`Rango: ${a.dateMin} → ${a.dateMax}`);
