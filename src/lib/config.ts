import type { CandidateId, Platform, TopicId } from './types';

export interface CandidateDef {
  id: CandidateId;
  name: string;
  short: string;
  /** Patrón inequívoco (nombre completo). Se evalúa sobre texto normalizado. */
  strong: RegExp;
  /** Forma corta: solo cuenta dentro de un hilo que ya trata sobre la figura o con contexto local. */
  weak?: RegExp;
  /** Usuarios/handles de cuentas propias (normalizado). */
  accounts: RegExp[];
  focus?: boolean;
  /** Nota de identidad que se muestra en el sitio. */
  identityNote?: string;
}

export const CANDIDATES: CandidateDef[] = [
  {
    id: 'toncel',
    name: 'Wilson Toncel',
    short: 'Toncel',
    strong: /\btoncel\b/,
    accounts: [/@wtoncel\b/, /@wilson_toncel\b/],
    focus: true,
    identityNote: 'Wilson Ernesto Toncel Ochoa, concejal de Cartagena.',
  },
  {
    id: 'bejarano',
    name: 'Javier Julio Bejarano',
    short: 'Bejarano',
    strong: /\bjavier julio bejarano\b|\bjulio bejarano\b|@javierjuliob\b/,
    weak: /\bbejarano\b|\bjavier julio\b/,
    accounts: [/@javierjuliob\b/],
  },
  {
    id: 'hernandez',
    name: 'Bruno Hernández',
    short: 'B. Hernández',
    strong: /\bbruno hernandez\b|\bhernandez ramos\b|@brunohdezramos\b/,
    weak: /\bbruno\b/,
    accounts: [/@brunohdezramos\b/],
  },
  {
    id: 'torres',
    name: 'Óscar Torres',
    short: 'Ó. Torres',
    strong: /\boscar torres\b|\btorres yarzagaray\b|@ostoyar\b/,
    accounts: [/@ostoyar\b/],
    identityNote:
      'Óscar Torres Yarzagaray, expresidente de la ANI. Se separa la conversación institucional (ANI, vías, peajes) de la política o electoral.',
  },
  {
    id: 'benedetti',
    name: 'Jorge Benedetti',
    short: 'Benedetti',
    strong: /\bjorge (e\.? )?benedetti\b|\byoyo benedetti\b|\bel yoyo\b/,
    weak: /\bbenedetti\b|\byoyo\b/,
    accounts: [],
    identityNote: 'Jorge E. Benedetti ("el Yoyo"). Se excluyen menciones a Armando Benedetti.',
  },
  {
    id: 'morales',
    name: 'Rey Morales',
    short: 'R. Morales',
    strong: /\brey morales\b|\bluis raimundo morales\b/,
    accounts: [],
  },
  {
    id: 'teran',
    name: 'Campo Elías Terán',
    short: 'C. E. Terán',
    strong: /\bcampo elias (teran|teheran|theran)\b/,
    weak: /\bcampo elias\b/,
    accounts: [],
    identityNote:
      'Las fuentes nombran a dos personas: Campo Elías Terán Humánez (director del IDER, citado como posible aspirante) y Campo Elías Teherán Dix (exalcalde, fallecido). Solo se cuentan registros con identidad verificable; los ambiguos quedan pendientes.',
  },
];

export const CAND_BY_ID = Object.fromEntries(CANDIDATES.map((c) => [c.id, c])) as Record<CandidateId, CandidateDef>;

/** Orden de presentación: Wilson primero, luego el resto. */
export const CAND_ORDER: CandidateId[] = CANDIDATES.map((c) => c.id);

export const PLATFORMS: Platform[] = ['Facebook', 'Instagram', 'TikTok', 'X', 'YouTube', 'Sitios web'];

export const TOPICS: { id: TopicId; label: string; re: RegExp }[] = [
  {
    id: 'seguridad',
    label: 'Seguridad',
    re: /\binsegur|\bseguridad\b|delincu|atraco|\bhurto|homicid|asesin|sicari|extorsi|\bpolicia|\bmilitar|ejercito|violencia|\bcrimen|criminal|pandill|microtrafic|\bbalacera|\bhomicidio/,
  },
  {
    id: 'movilidad',
    label: 'Movilidad',
    re: /movilidad|\btransito\b|trancon|trafico|transcaribe|\bpeaje|\bbuses?\b|mototaxi|\bcebra|semaforo|transporte|vehicul|conductor|parqueadero|pico y placa|\btaxi|ciclorruta|accidente/,
  },
  {
    id: 'infraestructura',
    label: 'Infraestructura',
    re: /infraestructura|\bobras?\b|\bvias?\b|carretera|\bpuente|malecon|canal del dique|aeropuerto|pavimenta|construcc|\bani\b|invias|drenaje|\bhuecos?\b|corredor vial|\bconcesion/,
  },
  {
    id: 'salud',
    label: 'Salud',
    re: /\bsalud\b|hospital|clinica|\beps\b|\bmedic|vacun|dengue|enfermedad|paciente|\bips\b|urgencias/,
  },
  {
    id: 'empleo',
    label: 'Empleo y economía',
    re: /\bempleo|desempleo|informalidad|vendedores|comerciantes|economi|\bprecios?\b|costo de vida|impuesto|emprend|salario|\bpobreza|oportunidades laborales/,
  },
  {
    id: 'servicios',
    label: 'Servicios públicos',
    re: /\benergia\b|\bla luz\b|afinia|\bagua\b|acueducto|aguas de cartagena|servicios publicos|\btarifa|inundac|\bbasura|\baseo\b|recoleccion|alcantarillado/,
  },
  {
    id: 'gestion',
    label: 'Gestión pública',
    re: /\bconcejo\b|concejal|alcaldia|\bgestion\b|presupuesto|\bcontrat|corrupc|control fiscal|contraloria|secretari[oa]|administracion|proyecto de acuerdo|rendicion de cuentas|funcionari|clientel|\bdumek/,
  },
  {
    id: 'elecciones',
    label: 'Elecciones',
    re: /eleccion|electoral|candidat|\baspira|\bvotar|\bvoto\b|votaria|votaras|\bcampana\b|encuesta|sondeo|\b2027\b|precandidat|\bconsulta\b|\baval\b|registradur|\burnas?\b|comicios|\bcontienda/,
  },
  {
    id: 'cultura',
    label: 'Deporte y cultura',
    re: /deporte|deportiv|\bider\b|futbol|estadio|torneo|festival|\bfiestas\b|independencia|\bcultura|\bcultural|concierto|semana santa|\bcarrera\b/,
  },
  {
    id: 'ambiente',
    label: 'Medio ambiente',
    re: /\barbol|\bcalor\b|ambient|cienaga|manglar|erosion|contaminac|reciclaj|mascota|\banimales?\b/,
  },
];

export const TOPIC_LABEL = Object.fromEntries(TOPICS.map((t) => [t.id, t.label])) as Record<TopicId, string>;

/** Marcas de medios tradicionales (prensa, radio, TV) presentes en digital. */
export const ATL_DOMAINS =
  /(^|\.)(eltiempo|noticiasrcn|bluradio|elespectador|elcolombiano|vanguardia|radiosantafe|elheraldo|eluniversal|caracol|caracoltv|wradio|rcnradio|lafm|telecaribe|elnortedecastilla|laopiniondemurcia|telecinco|teleamazonas|as)\.(com|es|co|com\.co)$/;

export const ATL_AUTHORS =
  /noticias rcn|caracol|tropicana|canal cnc|\bcnc\b|telecaribe|el universal|blu radio|w radio|rcn radio|la fm\b|olimpica|el tiempo|el heraldo|emisora|\bradio\b|\bfm\b|\btv\b|television/;

export const DIGITAL_MEDIA_AUTHORS =
  /noticia|news|informativ|prensa|diario|periodic|gacetilla|heroica|politica|visor|bolivarense|clan de las|conexion digital|razon|campana|reportero|\bmedio\b|al dia|pluralidad|cuentamelo|checkin|ultima hora|alerta|emisario/;

/** Referencias explícitas a medios tradicionales dentro del texto. */
export const ATL_TEXT_REF =
  /\bemisora|\bradio\b|\bfm\b|television|noticiero|\bperiodico|\bdiario el|\btelecaribe|caracol|\brcn\b|blu radio|el universal|\balerta (cartagena|caribe)|w radio|\bla fm\b/;
