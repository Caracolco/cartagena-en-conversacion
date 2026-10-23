export type CandidateId =
  | 'bejarano'
  | 'teran'
  | 'hernandez'
  | 'torres'
  | 'benedetti'
  | 'morales'
  | 'toncel';

export type Platform = 'Facebook' | 'Instagram' | 'TikTok' | 'X' | 'YouTube' | 'Sitios web';

export type Sentiment = 'positivo' | 'negativo' | 'neutral';

/** A quién se dirige la valoración del mensaje. */
export type Target = 'candidato' | 'ciudad' | 'nacional' | 'otro' | 'ninguno';

export type TopicId =
  | 'seguridad'
  | 'movilidad'
  | 'infraestructura'
  | 'salud'
  | 'empleo'
  | 'servicios'
  | 'gestion'
  | 'elecciones'
  | 'cultura'
  | 'ambiente';

/**
 * propia: publicada por una cuenta de la figura.
 * espontanea: otra persona o medio la nombra en el texto.
 * contexto: comentario dentro de un hilo sobre la figura que no la nombra.
 */
export type Relation = 'propia' | 'espontanea' | 'contexto';

/** Cómo se estableció el vínculo. */
export type LinkVia = 'autor' | 'texto' | 'hilo' | 'publicacion-propia' | 'palabra-clave';

export interface CandLink {
  id: CandidateId;
  rel: Relation;
  via: LinkVia;
  /** Óscar Torres: alcance de la mención. */
  scope?: 'institucional' | 'politica' | 'otra';
  /** Vínculo que requiere validación humana; no cuenta en los indicadores hasta confirmarse. */
  pending?: string;
}

export type SourceType = 'propia' | 'medio-tradicional' | 'medio-digital' | 'cuenta-social' | 'comentario';

/** Fila de entrada normalizada (independiente del proveedor). */
export interface RawRow {
  id: string;
  type: string;
  title: string;
  author: string;
  content: string;
  created: string; // 'YYYY-MM-DD HH:mm:ss'
  context: string;
  link: string;
  domain: string;
  group: string;
  sentiment: string;
  keywords: string;
  interactions: number;
  views: number;
  country: string;
  threadId: string;
}

export interface Mention {
  id: string;
  type: string;
  isComment: boolean;
  platform: Platform;
  domain: string;
  author: string;
  created: string;
  date: string; // YYYY-MM-DD
  link: string;
  thread: string; // clave del hilo (link)
  title: string;
  content: string;
  keywords: string;
  interactions: number;
  views: number;
  country: string;
  sourceType: SourceType;
  outlet?: string;
  /** Referencia explícita a radio, prensa o TV en el texto. */
  atlRef: boolean;
  sentimentOrig: string;
  sentiment: Sentiment;
  target: Target;
  topics: TopicId[];
  topicSource: 'texto' | 'hilo' | 'ninguno';
  cands: CandLink[];
  /** Texto sin contenido analizable (solo emojis, etiquetas a personas…). */
  lowText: boolean;
  /** id del registro del que probablemente es copia. */
  dupOf?: string;
  reviewed?: boolean;
  note?: string;
}

export interface Thread {
  id: string;
  platform: Platform;
  author: string;
  text: string;
  link: string;
  date: string;
  cands: CandidateId[];
  ownerCand?: CandidateId;
  topics: TopicId[];
  isPoll: boolean;
  size: number;
}

export interface Exclusion {
  id: string;
  cand: CandidateId;
  reason: string;
  snippet: string;
  link: string;
}

export interface Audit {
  sourceFiles: string[];
  rawRows: number;
  duplicateIdRemoved: number;
  probableCopies: number;
  lowText: number;
  sentimentChanged: number;
  sentimentEmptyOrig: number;
  exclusions: Exclusion[];
  pendingLinks: number;
  dateMin: string;
  dateMax: string;
}

export interface Dataset {
  version: 1;
  generatedAt: string;
  audit: Audit;
  mentions: Mention[];
  threads: Record<string, Thread>;
}

export interface Override {
  sentiment?: Sentiment;
  target?: Target;
  topics?: TopicId[];
  exclude?: boolean;
  /** Vínculos pendientes que el revisor confirma. */
  confirm?: CandidateId[];
  /** Vínculos que el revisor descarta. */
  reject?: CandidateId[];
  note?: string;
  by?: string;
  at?: string;
}

export type Overrides = Record<string, Override>;
