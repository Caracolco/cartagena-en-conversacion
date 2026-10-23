import type { Filters } from '../lib/metrics';
import type { ActiveMention } from '../lib/overrides';
import type { Dataset, Overrides } from '../lib/types';

export interface EvidenceQuery {
  preset?: 'pendientes';
  cand?: string;
}

/** Datos derivados que comparten todas las secciones. */
export interface View {
  ds: Dataset;
  /** Todos los registros con revisiones aplicadas (incluye copias y excluidos). */
  all: ActiveMention[];
  /** Registros contables, sin filtros. */
  base: ActiveMention[];
  /** Registros contables con todos los filtros. */
  filtered: ActiveMention[];
  /** Con filtros salvo el de figura (para comparativos entre las siete). */
  noCand: ActiveMention[];
  filters: Filters;
  overrides: Overrides;
  openReview: (id: string) => void;
  showEvidence: (q: EvidenceQuery) => void;
  evidenceQuery: EvidenceQuery | null;
}
