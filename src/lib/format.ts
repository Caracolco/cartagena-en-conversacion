const nf = new Intl.NumberFormat('es-CO');

export const fmt = (n: number) => nf.format(Math.round(n));

export const fmtPct = (n: number, digits = 0) =>
  `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n)} %`;

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const fmtMonth = (ym: string) => {
  const [y, m] = ym.split('-');
  return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
};

export const fmtDay = (d: string) => {
  const [, m, day] = d.split('-');
  return `${Number(day)} ${MONTHS[Number(m) - 1]}`;
};

export const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${Number(day)} ${MONTHS[Number(m) - 1]} ${y}`;
};
