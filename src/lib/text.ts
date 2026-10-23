const ENTITIES: Record<string, string> = { '&quot;': '"', '&apos;': "'", '&amp;': '&', '&lt;': '<', '&gt;': '>', '&#39;': "'" };

export function decodeEntities(s: string): string {
  return s.replace(/&(quot|apos|amp|lt|gt|#39);/g, (m) => ENTITIES[m] ?? m);
}

/** Minúsculas, sin tildes y con espacios simples. Conserva emojis. */
export function norm(s: unknown): string {
  return decodeEntities(String(s ?? ''))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Texto sin URLs, menciones ni ids numéricos, útil para medir si hay contenido real. */
export function letters(s: string): string {
  return s
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-zñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

/** Caption vacío típico de reels de Facebook: "01:00 https://… nombre 1234…". */
export function isCaptionless(ctx: string): boolean {
  const t = norm(ctx);
  if (!t) return true;
  const stripped = letters(t.replace(/^\d\d:\d\d/, '')).split(' ').filter((w) => w.length > 2);
  return stripped.length < 8 && /^\d\d:\d\d https?:/.test(t);
}
