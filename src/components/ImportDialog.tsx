import { useState } from 'react';
import { FileSpreadsheet, Loader2, X } from 'lucide-react';
import { buildDataset, datasetToRaw } from '../lib/pipeline';
import { fmt, fmtDate } from '../lib/format';
import type { DataOrigin } from '../lib/store';
import type { Dataset, RawRow } from '../lib/types';

interface Props {
  current: Dataset;
  origin: DataOrigin;
  onClose: () => void;
  onApply: (ds: Dataset | null) => Promise<void>;
}

export default function ImportDialog({ current, origin, onClose, onApply }: Props) {
  const [mode, setMode] = useState<'agregar' | 'reemplazar'>('agregar');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ ds: Dataset; files: string[]; read: number; added: number } | null>(null);

  const process = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError('');
    setPreview(null);
    try {
      const { parseWorkbook } = await import('../lib/excel');
      const raw: RawRow[] = [];
      for (const f of Array.from(files)) raw.push(...parseWorkbook(new Uint8Array(await f.arrayBuffer())));
      const names = Array.from(files).map((f) => f.name);
      const input = mode === 'agregar' ? [...datasetToRaw(current), ...raw] : raw;
      const sources = mode === 'agregar' ? [...new Set([...current.audit.sourceFiles, ...names])] : names;
      const ds = buildDataset(input, sources);
      if (mode === 'agregar') ds.audit.rawRows = current.audit.rawRows + raw.length;
      setPreview({ ds, files: names, read: raw.length, added: ds.mentions.length - (mode === 'agregar' ? current.mentions.length : 0) });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Importar Excel">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="kicker">Actualizar la base</p>
            <h3 className="font-display text-xl text-navy-900">Importar Excel de Brand24</h3>
          </div>
          <button className="btn-ghost h-8 px-2" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </header>
        <div className="space-y-4 px-5 py-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['agregar', 'Agregar a la base actual', 'Combina y elimina duplicados por id'],
                ['reemplazar', 'Reemplazar la base', 'Usa solo los archivos nuevos'],
              ] as const
            ).map(([id, label, hint]) => (
              <button
                key={id}
                onClick={() => {
                  setMode(id);
                  setPreview(null);
                }}
                className={`rounded-lg border p-3 text-left ${mode === id ? 'border-navy-900 ring-1 ring-navy-900' : 'border-line hover:bg-navy-50'}`}
              >
                <b className="block text-navy-900">{label}</b>
                <span className="text-xs text-ink-muted">{hint}</span>
              </button>
            ))}
          </div>

          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line p-6 text-center hover:border-navy-600 hover:bg-navy-50/50">
            {busy ? <Loader2 className="animate-spin text-navy-700" /> : <FileSpreadsheet className="text-navy-700" />}
            <span className="font-medium text-navy-900">{busy ? 'Procesando…' : 'Seleccionar uno o varios .xlsx'}</span>
            <span className="text-xs text-ink-muted">Se procesa en este navegador; el archivo no se envía a ningún servidor.</span>
            <input type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={(e) => process(e.target.files)} disabled={busy} />
          </label>

          {error && <p className="rounded-lg bg-accent-soft p-3 text-xs text-accent-dark">{error}</p>}

          {preview && (
            <div className="rounded-lg bg-navy-50 p-3 text-xs leading-relaxed">
              <p className="font-semibold text-navy-900">{preview.files.join(', ')}</p>
              <p>
                {fmt(preview.read)} filas leídas · {fmt(preview.ds.audit.duplicateIdRemoved)} duplicados eliminados ·{' '}
                <b>{fmt(Math.max(0, preview.added))} registros nuevos</b>
              </p>
              <p>
                Base resultante: {fmt(preview.ds.mentions.length)} registros, {fmtDate(preview.ds.audit.dateMin)} – {fmtDate(preview.ds.audit.dateMax)} ·{' '}
                {fmt(preview.ds.audit.pendingLinks)} vínculos por validar
              </p>
            </div>
          )}
        </div>
        <footer className="flex items-center justify-between border-t border-line px-5 py-3">
          {origin === 'importada' ? (
            <button
              className="btn-ghost text-xs"
              onClick={async () => {
                await onApply(null);
                onClose();
              }}
            >
              Restaurar base publicada
            </button>
          ) : (
            <span className="text-xs text-ink-faint">Las revisiones manuales se conservan.</span>
          )}
          <button
            className="btn-accent"
            disabled={!preview}
            onClick={async () => {
              if (!preview) return;
              await onApply(preview.ds);
              onClose();
            }}
          >
            Actualizar indicadores
          </button>
        </footer>
      </div>
    </div>
  );
}
