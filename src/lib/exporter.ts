import * as XLSX from 'xlsx';
import { CAND_BY_ID, TOPIC_LABEL } from './config';
import type { ActiveMention } from './overrides';
import type { Dataset } from './types';

const REL_LABEL = { propia: 'Propia', espontanea: 'Espontánea', contexto: 'Contexto' } as const;

/** Libro con los datos depurados, la relación figura–registro y la auditoría. */
export function buildExportWorkbook(ds: Dataset, ms: ActiveMention[]): Uint8Array {
  const menciones = ms.map((m) => ({
    id: m.id,
    fecha: m.created,
    plataforma: m.platform,
    tipo: m.type,
    fuente: m.sourceType,
    autor: m.author,
    titulo: m.title,
    texto: m.content,
    enlace: m.link,
    hilo: m.thread,
    figuras_directas: m.cands.filter((c) => c.rel !== 'contexto' && !c.pending).map((c) => CAND_BY_ID[c.id].name).join('; '),
    figuras_contexto: m.cands.filter((c) => c.rel === 'contexto' && !c.pending).map((c) => CAND_BY_ID[c.id].name).join('; '),
    pendientes: m.cands.filter((c) => c.pending).map((c) => `${CAND_BY_ID[c.id].name}: ${c.pending}`).join('; '),
    sentimiento_brand24: m.sentimentOrig,
    sentimiento_depurado: m.sentiment,
    objetivo: m.target,
    temas: m.topics.map((t) => TOPIC_LABEL[t]).join('; '),
    tema_origen: m.topicSource,
    interacciones: m.interactions,
    copia_probable_de: m.dupOf ?? '',
    excluido: m.excluded ? 'sí' : '',
    revisado: m.reviewed ? 'sí' : '',
    nota: m.note ?? '',
  }));
  const vinculos = ms.flatMap((m) =>
    m.cands.map((c) => ({
      id: m.id,
      fecha: m.date,
      plataforma: m.platform,
      figura: CAND_BY_ID[c.id].name,
      relacion: REL_LABEL[c.rel],
      via: c.via,
      alcance_torres: c.scope ?? '',
      pendiente: c.pending ?? '',
      sentimiento: m.sentiment,
      enlace: m.link,
    })),
  );
  const a = ds.audit;
  const auditoria = [
    { indicador: 'Archivos fuente', valor: a.sourceFiles.join('; ') },
    { indicador: 'Filas originales', valor: a.rawRows },
    { indicador: 'Duplicados por id eliminados', valor: a.duplicateIdRemoved },
    { indicador: 'Registros depurados', valor: ds.mentions.length },
    { indicador: 'Copias probables (no cuentan)', valor: a.probableCopies },
    { indicador: 'Registros sin texto analizable', valor: a.lowText },
    { indicador: 'Exclusiones por homonimia o identidad', valor: a.exclusions.length },
    { indicador: 'Vínculos pendientes de validación', valor: a.pendingLinks },
    { indicador: 'Rango de fechas', valor: `${a.dateMin} a ${a.dateMax}` },
    { indicador: 'Generado', valor: ds.generatedAt },
  ];
  const excl = a.exclusions.map((e) => ({ id: e.id, figura: CAND_BY_ID[e.cand].name, motivo: e.reason, texto: e.snippet, enlace: e.link }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(menciones), 'Menciones depuradas');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vinculos), 'Figura por registro');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(excl), 'Exclusiones');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(auditoria), 'Auditoría');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}
