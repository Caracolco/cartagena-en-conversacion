import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { CAND_BY_ID } from '../lib/config';
import type { CandLink, Sentiment } from '../lib/types';
import { SENT_COLOR, SENT_LABEL } from './theme';

export function Section({ id, kicker, title, lead, children }: { id: string; kicker: string; title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32 py-10 first:pt-8 border-b border-line last:border-0">
      <header className="mb-6 flex flex-col gap-1.5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div>
          <p className="kicker">{kicker}</p>
          <h2 className="font-display text-[32px] leading-tight text-navy-900">{title}</h2>
        </div>
        {lead && <p className="max-w-xl text-[15px] leading-snug text-ink-muted lg:text-right">{lead}</p>}
      </header>
      {children}
    </section>
  );
}

export function Card({
  title,
  subtitle,
  children,
  note,
  className = '',
  action,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  note?: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`card flex min-w-0 flex-col p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-[15px] font-semibold text-navy-900">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="min-h-0 flex-1">{children}</div>
      {note && (
        <p className="mt-3 flex gap-1.5 border-t border-line pt-2.5 text-[11.5px] leading-snug text-ink-muted">
          <Info size={13} className="mt-px shrink-0 text-ink-faint" aria-hidden />
          <span>{note}</span>
        </p>
      )}
    </div>
  );
}

export function Kpi({ label, value, sub, tone = 'default' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'default' | 'accent' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <div className={`rounded-xl border p-4 ${dark ? 'border-navy-800 bg-navy-900 text-white' : 'border-line bg-white shadow-card'}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wider ${dark ? 'text-navy-300' : 'text-ink-muted'}`}>{label}</p>
      <p className={`mt-1 font-display text-[34px] leading-none ${tone === 'accent' ? 'text-accent' : dark ? 'text-white' : 'text-navy-900'}`}>{value}</p>
      {sub && <p className={`mt-1.5 text-xs leading-snug ${dark ? 'text-navy-300' : 'text-ink-muted'}`}>{sub}</p>}
    </div>
  );
}

export function SentimentChip({ s }: { s: Sentiment }) {
  return (
    <span className="chip border border-line bg-white text-ink">
      <span className="h-2 w-2 rounded-full" style={{ background: SENT_COLOR[s] }} aria-hidden />
      {SENT_LABEL[s]}
    </span>
  );
}

const REL_SHORT = { propia: 'propia', espontanea: 'directa', contexto: 'contexto' } as const;

export function CandChip({ link }: { link: CandLink }) {
  const c = CAND_BY_ID[link.id];
  const focus = c.focus;
  const style = link.pending
    ? 'border border-dashed border-amber-500 bg-amber-50 text-amber-800'
    : link.rel === 'contexto'
      ? 'bg-navy-50 text-navy-700'
      : focus
        ? 'bg-accent-soft text-accent-dark'
        : 'bg-navy-100 text-navy-900';
  return (
    <span className={`chip ${style}`} title={link.pending ?? `${c.name} · ${REL_SHORT[link.rel]} · vía ${link.via}${link.scope ? ` · ${link.scope}` : ''}`}>
      {c.short}
      <span className="opacity-60">· {link.pending ? 'pendiente' : REL_SHORT[link.rel]}</span>
    </span>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} aria-hidden />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function Empty({ children = 'Sin registros con los filtros actuales.' }: { children?: ReactNode }) {
  return <div className="flex h-full min-h-[120px] items-center justify-center text-sm text-ink-faint">{children}</div>;
}

export function TooltipBox({ title, rows }: { title: ReactNode; rows: { label: string; value: ReactNode; color?: string }[] }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-navy-900">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center justify-between gap-4 text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            {r.color && <span className="h-2 w-2 rounded-sm" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="font-semibold tabular-nums text-ink">{r.value}</span>
        </p>
      ))}
    </div>
  );
}
