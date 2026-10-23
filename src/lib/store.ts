import type { Dataset, Overrides } from './types';

const DB = 'cartagena-en-conversacion';
const STORE = 'kv';
const OVERRIDES_KEY = 'cec.revisiones.v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    if (value === undefined) tx.objectStore(STORE).delete(key);
    else tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export type DataOrigin = 'publicada' | 'importada';

/** Base importada en este navegador, o la publicada con el sitio. */
export async function loadDataset(): Promise<{ ds: Dataset; origin: DataOrigin }> {
  try {
    const local = await idbGet<Dataset>('dataset');
    if (local?.version === 1) return { ds: local, origin: 'importada' };
  } catch {
    /* IndexedDB no disponible: se usa la base publicada */
  }
  const res = await fetch(`${import.meta.env.BASE_URL}data/base.json`);
  if (!res.ok) throw new Error(`No se pudo cargar la base (${res.status}).`);
  return { ds: (await res.json()) as Dataset, origin: 'publicada' };
}

export async function saveImported(ds: Dataset | undefined): Promise<void> {
  try {
    await idbSet('dataset', ds);
  } catch {
    /* sin persistencia: la base vive solo en esta sesión */
  }
}

export function loadOverrides(): Overrides {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? '{}') as Overrides;
  } catch {
    return {};
  }
}

export function saveOverrides(o: Overrides): void {
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o));
  } catch {
    /* almacenamiento bloqueado */
  }
}

export function download(name: string, data: BlobPart, type: string): void {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
