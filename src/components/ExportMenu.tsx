import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FileJson, FileSpreadsheet, Upload } from 'lucide-react';
import { download } from '../lib/store';
import type { ActiveMention } from '../lib/overrides';
import type { Dataset, Overrides } from '../lib/types';

interface Props {
  ds: Dataset;
  all: ActiveMention[];
  userOverrides: Overrides;
  onImportOverrides: (o: Overrides) => void;
  children: ReactNode;
}

export default function ExportMenu({ ds, all, userOverrides, onImportOverrides, children }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const stamp = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const exportXlsx = async () => {
    setBusy(true);
    const { buildExportWorkbook } = await import('../lib/exporter');
    download(`cartagena-en-conversacion_depurado_${stamp}.xlsx`, buildExportWorkbook(ds, all), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    setBusy(false);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button className="btn-light" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {children}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-white text-sm text-ink shadow-xl">
          <button className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-navy-50" onClick={exportXlsx} disabled={busy}>
            <FileSpreadsheet size={18} className="mt-0.5 text-navy-700" />
            <span>
              <b className="block">{busy ? 'Generando…' : 'Datos depurados (.xlsx)'}</b>
              <span className="text-xs text-ink-muted">Registros, figura por registro, exclusiones y auditoría</span>
            </span>
          </button>
          <button
            className="flex w-full items-start gap-3 border-t border-line px-4 py-3 text-left hover:bg-navy-50"
            onClick={() => {
              download(`revisiones_${stamp}.json`, JSON.stringify(userOverrides, null, 2), 'application/json');
              setOpen(false);
            }}
          >
            <FileJson size={18} className="mt-0.5 text-navy-700" />
            <span>
              <b className="block">Revisiones manuales (.json)</b>
              <span className="text-xs text-ink-muted">{Object.keys(userOverrides).length} correcciones guardadas en este navegador</span>
            </span>
          </button>
          <label className="flex w-full cursor-pointer items-start gap-3 border-t border-line px-4 py-3 hover:bg-navy-50">
            <Upload size={18} className="mt-0.5 text-navy-700" />
            <span>
              <b className="block">Cargar revisiones (.json)</b>
              <span className="text-xs text-ink-muted">Para compartir correcciones entre equipos</span>
            </span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  onImportOverrides(JSON.parse(await f.text()) as Overrides);
                } catch {
                  alert('El archivo no es un JSON de revisiones válido.');
                }
                setOpen(false);
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
