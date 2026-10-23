import type { Relation, Sentiment, Target } from '../lib/types';

// Paleta validada con el script de la guía de visualización (divergente azul–rojo, rampa navy secuencial).
export const C = {
  navy: '#0B1F3A',
  navy2: '#13315C',
  navyMid: '#3B6AA8',
  navyLight: '#C3D0E3',
  accent: '#C8102E',
  grid: '#E9EDF3',
  axis: '#8A94A6',
  muted: '#5B6678',
};

export const SENT_COLOR: Record<Sentiment, string> = {
  positivo: '#2E6BB0',
  neutral: '#B8C2D0',
  negativo: '#C8102E',
};

export const SENT_LABEL: Record<Sentiment, string> = { positivo: 'Positivo', neutral: 'Neutral', negativo: 'Negativo' };

export const REL_COLOR: Record<Relation, string> = { propia: C.navy, espontanea: C.navyMid, contexto: C.navyLight };

export const REL_LABEL: Record<Relation, string> = {
  propia: 'Publicación propia',
  espontanea: 'Mención espontánea',
  contexto: 'Conversación de contexto',
};

export const TARGET_LABEL: Record<Target, string> = {
  candidato: 'Figuras y candidaturas',
  ciudad: 'Ciudad y gestión distrital',
  nacional: 'Gobierno y política nacional',
  otro: 'Otro destinatario',
  ninguno: 'Sin valoración',
};

export const SOURCE_LABEL = {
  propia: 'Cuenta propia',
  'medio-tradicional': 'Medio tradicional (digital)',
  'medio-digital': 'Medio digital',
  'cuenta-social': 'Cuenta en redes',
  comentario: 'Comentario',
} as const;

export const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 11, fill: C.muted },
} as const;
