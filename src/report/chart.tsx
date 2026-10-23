import { useEffect, useRef, useState } from 'react';

/** Ancho real del contenedor, para dibujar el SVG en píxeles sin deformar el texto. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Escala "bonita" para el eje: 0, paso, 2 pasos… cubriendo el máximo. */
export function niceTicks(max: number, count = 3): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

const MONTH_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const monthLong = (ym: string) => MONTH_LONG[Number(ym.slice(5, 7)) - 1];

export function Legend({ items }: { items: { label: string; color: string; kind?: 'line' | 'area' | 'dot' }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-ink-muted">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-2">
          {i.kind === 'line' ? (
            <span className="h-[2px] w-4 rounded-full" style={{ background: i.color }} />
          ) : (
            <span className={`h-2.5 w-2.5 ${i.kind === 'dot' ? 'rounded-full' : 'rounded-[3px]'}`} style={{ background: i.color }} />
          )}
          {i.label}
        </li>
      ))}
    </ul>
  );
}
