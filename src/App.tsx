import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { applyOverrides, countable } from './lib/overrides';
import { loadDataset, loadOverrides } from './lib/store';
import type { Dataset, Overrides } from './lib/types';
import revisionesBase from './data/revisiones-base.json';
import Report from './report/Report';

// La vista de trabajo (importación, revisión y exportación) se carga solo si se abre.
const Admin = lazy(() => import('./admin/Admin'));

const isAdmin = () => /^#\/?admin\b/.test(window.location.hash);

function Loading() {
  return (
    <div className="flex h-dvh items-center justify-center gap-2 text-ink-muted">
      <Loader2 className="animate-spin" size={18} /> Cargando conversación…
    </div>
  );
}

/** El informe usa la misma base que la vista de trabajo, con las revisiones guardadas en este navegador. */
function ReportRoute() {
  const [ds, setDs] = useState<Dataset | null>(null);
  const [error, setError] = useState('');
  const [userOverrides] = useState<Overrides>(() => loadOverrides());

  useEffect(() => {
    loadDataset()
      .then((r) => setDs(r.ds))
      .catch((e: Error) => setError(e.message));
  }, []);

  const ms = useMemo(() => (ds ? countable(applyOverrides(ds, revisionesBase as Overrides, userOverrides)) : []), [ds, userOverrides]);

  if (error) return <div className="p-10 text-center text-accent">No se pudo cargar la base: {error}</div>;
  if (!ds) return <Loading />;
  return <Report ds={ds} ms={ms} />;
}

export default function App() {
  const [admin, setAdmin] = useState(isAdmin);
  useEffect(() => {
    const onHash = () => setAdmin(isAdmin());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (admin) {
    return (
      <Suspense fallback={<Loading />}>
        <Admin />
      </Suspense>
    );
  }
  return <ReportRoute />;
}
