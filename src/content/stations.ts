// The radio dial of Bogotá, Saturday 28 October 1995, 5:30 p.m.
//
// Real station names and frequencies (see docs/v0.md, fact-check list); the
// DJs, listeners, shops and ads are invented. News items are real events of
// that week, reported without invented quotes.

import { lines, dynamicLine, type Line } from './lines';
import { clockParts, spanishNumber, spokenTime } from '../world/clock';
import type { Style } from '../audio/music';

export type FormatSlot = 'id' | 'song' | 'talk' | 'ads' | 'news' | 'time' | 'request';

export interface StationDef {
  id: string;
  name: string;
  band: 'FM' | 'AM';
  /** MHz for FM, kHz for AM. */
  freq: number;
  label: string;
  catalog: string[];
  /** Songs that come around more often (the new releases). */
  heavy?: string[];
  jingle: Style;
  bed: Style;
  format: FormatSlot[];
  ids: Line[][];
  talks: Line[][];
  ads: Line[][];
  news?: Line[][];
  intros: Record<string, Line[]>;
  genericIntros: Line[][];
  timeCheck: (t: number) => Line[];
  /** The number the DJ gives out for requests, and the talk that announces it. */
  requestLine?: { number: string; announce: Line[] };
  /** DJ pace for subtitles without recordings (characters per second). */
  pace: number;
  seed: number;
}

/** "las cinco y cuarenta y dos", the way a DJ says it. */
function djTime(t: number): string {
  const { hour, minute } = clockParts(t);
  const h12 = ((hour + 11) % 12) + 1;
  const h = h12 === 1 ? 'la una' : `las ${spanishNumber(h12)}`;
  if (minute === 0) return `${h} en punto`;
  if (minute === 30) return `${h} y media`;
  if (minute === 15) return `${h} y cuarto`;
  const m = minute === 21 ? 'veintiún' : spanishNumber(minute).replace(/ uno$/, ' un');
  return `${h} y ${m}`;
}

// ---------------------------------------------------------------------------
// Radioactiva 97.9 FM — Caracol. Rock and pop (it went all-rock, and took its
// "k", in 1997: Radioacktiva, el Planeta Rock).
// ---------------------------------------------------------------------------

const RA = lines('radioactiva', {
  saludo1: ['locutorRadioactiva', '¡Muy buenas tardes, Bogotá! Radioactiva, noventa y siete nueve. Sábado por la tarde y cayendo un aguacero de los buenos.'],
  saludo2: ['locutorRadioactiva', 'Si no tiene nada que hacer, quédese en la casa, prenda la grabadora y súbale, que aquí le tenemos la mejor música.'],
  transito1: ['locutorRadioactiva', 'Reporte de tráfico, parceros: la Caracas está pegada desde la setenta y dos hasta la cuarenta y cinco.'],
  transito2: ['locutorRadioactiva', 'Y en la Séptima, con esta lluvia, las busetas van a paso de tortuga. Paciencia.'],
  dorado1: ['locutorRadioactiva', 'Ya está en las tiendas lo nuevo de los Aterciopelados: El Dorado. Salió el martes.'],
  dorado2: ['locutorRadioactiva', 'Andrea Echeverri y Héctor Buitrago, orgullo bogotano. Aquí en la cabina no lo hemos dejado de poner.'],
  rap1: ['locutorRadioactiva', '¿Quién fue a Rock al Parque en mayo? Más de ochenta mil personas en el Simón Bolívar, ¡gratis!'],
  rap2: ['locutorRadioactiva', 'Ojalá lo repitan el otro año. Nosotros ya estamos contando los días.'],
  zanahoria1: ['locutorRadioactiva', 'Y los que van de rumba esta noche, pilas: con la hora zanahoria, a la una de la mañana se acaba la fiesta.'],
  zanahoria2: ['locutorRadioactiva', 'Así que arranquen temprano. Y si se toman unos tragos, no manejen.'],
  higuita1: ['locutorRadioactiva', 'Yo todavía no supero el escorpión de Higuita en Wembley. ¿Ustedes lo vieron?'],
  higuita2: ['locutorRadioactiva', 'Los ingleses no lo podían creer. ¡Eso es un arquero colombiano, señores!'],
  saludos1: ['locutorRadioactiva', 'Van saludos para Diana, en Galerías, de parte de Mauricio, que dice que la extraña mucho.'],
  saludos2: ['locutorRadioactiva', 'Y para todos los de décimo B, que el lunes tienen examen de química. ¡Ánimo, muchachos!'],
  lluvia1: ['locutorRadioactiva', 'Mire cómo está esa lluvia... En Bogotá uno sale con sol y vuelve empapado.'],
  lluvia2: ['locutorRadioactiva', 'Pero para eso está la radio. Aquí seguimos acompañándolo.'],
  linea1: ['locutorRadioactiva', 'La línea de la cabina está abierta: pida su canción y mande su saludo.'],
  linea2: ['locutorRadioactiva', 'Llámenos al dos, ochenta y cinco, noventa y siete, noventa y siete. Otra vez: dos, ochenta y cinco, noventa y siete, noventa y siete.'],
  id1: ['locutorRadioactiva', 'Radioactiva... ¡noventa y siete nueve!'],
  id2: ['locutorRadioactiva', 'Rock y pop. Radioactiva.'],
  introBolero: ['locutorRadioactiva', '¡Uy, esta sí! Aterciopelados, del disco nuevo: «Bolero falaz».'],
  introFlorecita: ['locutorRadioactiva', 'Seguimos con los Aterciopelados, que están en todas partes: «Florecita rockera».'],
  introSoda: ['locutorRadioactiva', 'Directo desde Buenos Aires, lo nuevo de Soda Stereo: «Ella usó mi cabeza como un revólver».'],
  introMatador: ['locutorRadioactiva', '¡Súbale, súbale! Los Fabulosos Cadillacs: «Matador».'],
  introLamento: ['locutorRadioactiva', 'Una que todos nos sabemos: Enanitos Verdes, «Lamento boliviano».'],
  introAfuera: ['locutorRadioactiva', 'Caifanes, «Afuera». Para oír con la ventana abierta... bueno, con esta lluvia, mejor cerrada.'],
  introZombie: ['locutorRadioactiva', 'Desde Irlanda, The Cranberries: «Zombie». ¡Súbale el volumen!'],
  introGuns: ['locutorRadioactiva', '¡Aquí nadie se queda quieto! Guns N\' Roses: «You Could Be Mine».'],
  generico1: ['locutorRadioactiva', 'Radioactiva, noventa y siete nueve. ¡Aquí va otra!'],
  generico2: ['locutorRadioactiva', 'Seguimos con más música, sin tanta habladera.'],
});

const ADS = lines('cunas', {
  tocadiscos: ['cunas', '¿Ya tiene El Dorado de los Aterciopelados? En Discos El Tocadiscos lo tenemos en casete y en compact disc. Y casetes vírgenes de sesenta minutos, ¡a precio de locura! Discos El Tocadiscos: Carrera Séptima con sesenta.'],
  pizzeria: ['cunas', '¿Llueve y no quiere salir? Pizzería La Toscana le lleva la pizza calientica hasta la puerta de su casa. Domicilios en Chapinero: dos, cuarenta y ocho, veinte, veinte.'],
  cebra: ['cunas', 'Bogotanos: el peatón tiene prelación. Respete la cebra. Un mensaje de la Alcaldía Mayor de Santa Fe de Bogotá.'],
  ingles: ['cunas', 'Academia de inglés Say Yes: hable inglés en seis meses, o le devolvemos su plata. Calle cincuenta y tres con Caracas.'],
  sanandresito: ['cunas', 'En el San Andresito de la Treinta y Ocho: grabadoras, walkman, televisores y videojuegos, ¡a los mejores precios de Bogotá!'],
  optica: ['cunas', 'Óptica Visión Clara, en Unicentro: montura y lentes en una hora. ¡Páguelos en tres cuotas!'],
  ganador: ['cunas', 'Almacén El Ganador, en San Victorino: ollas, vajillas, cobijas y todo para el hogar. ¡Baratísimo!'],
  salsoteca: ['cunas', 'Salsoteca La Rumba Brava, en la calle ochenta y cinco: este sábado, orquesta en vivo. ¡Entrada libre para las damas!'],
  dental: ['cunas', 'Clínica Dental Sonrisa, calle cuarenta y cinco con Caracas. Tratamientos a crédito, con la tranquilidad de siempre.'],
});

export const REQUEST_LINE = '2859797';

export const RADIOACTIVA: StationDef = {
  id: 'radioactiva',
  name: 'Radioactiva',
  band: 'FM',
  freq: 97.9,
  label: 'Radioactiva 97.9',
  catalog: ['bolero-falaz', 'florecita-rockera', 'ella-uso-mi-cabeza', 'matador', 'lamento-boliviano', 'afuera', 'zombie', 'you-could-be-mine'],
  heavy: ['bolero-falaz', 'florecita-rockera'],
  jingle: 'rock',
  bed: 'rock',
  format: ['id', 'song', 'request', 'song', 'ads', 'time', 'song', 'talk', 'song', 'ads', 'request', 'song', 'talk', 'song', 'ads', 'talk'],
  ids: [[RA.id1], [RA.id2]],
  talks: [
    [RA.saludo1, RA.saludo2],
    [RA.dorado1, RA.dorado2],
    [RA.transito1, RA.transito2],
    [RA.rap1, RA.rap2],
    [RA.zanahoria1, RA.zanahoria2],
    [RA.higuita1, RA.higuita2],
    [RA.saludos1, RA.saludos2],
    [RA.lluvia1, RA.lluvia2],
  ],
  ads: [[ADS.tocadiscos], [ADS.pizzeria], [ADS.cebra], [ADS.ingles], [ADS.sanandresito]],
  intros: {
    'bolero-falaz': [RA.introBolero],
    'florecita-rockera': [RA.introFlorecita],
    'ella-uso-mi-cabeza': [RA.introSoda],
    matador: [RA.introMatador],
    'lamento-boliviano': [RA.introLamento],
    afuera: [RA.introAfuera],
    zombie: [RA.introZombie],
    'you-could-be-mine': [RA.introGuns],
  },
  genericIntros: [[RA.generico1], [RA.generico2]],
  timeCheck: (t) => [dynamicLine('locutorRadioactiva', `Son ${djTime(t)} en Bogotá, doce grados, y sigue lloviendo.`)],
  requestLine: { number: REQUEST_LINE, announce: [RA.linea1, RA.linea2] },
  pace: 15.5,
  seed: 979,
};

/** What the DJ says over the intro of a song somebody requested on the phone. */
export const REQUEST_LINES = lines('radioactiva.pedidos', {
  dedCarolina: ['locutorRadioactiva', 'Y esta va para Carolina, de parte de un admirador secreto en Chapinero. ¡Uy, qué romántico!'],
  dedColegio: ['locutorRadioactiva', 'Esta va para todos los del colegio, de parte de un oyente de Chapinero. ¡Que viva el sábado!'],
  dedAbuelita: ['locutorRadioactiva', 'Y esta va para la abuelita de un oyente de Chapinero. ¡Un saludo, abuelita!'],
  'florecita-rockera': ['locutorRadioactiva', 'Complaciendo a los oyentes: Aterciopelados, «Florecita rockera».'],
  'bolero-falaz': ['locutorRadioactiva', 'Complaciendo a los oyentes: Aterciopelados, «Bolero falaz».'],
  'ella-uso-mi-cabeza': ['locutorRadioactiva', 'Complaciendo a los oyentes: Soda Stereo, «Ella usó mi cabeza como un revólver».'],
  matador: ['locutorRadioactiva', 'Complaciendo a los oyentes: Los Fabulosos Cadillacs, «Matador».'],
});

export type Dedication = 'carolina' | 'colegio' | 'abuelita' | null;

export function requestIntro(songId: string, dedication: Dedication): Line[] {
  const ded =
    dedication === 'carolina'
      ? REQUEST_LINES.dedCarolina
      : dedication === 'colegio'
        ? REQUEST_LINES.dedColegio
        : dedication === 'abuelita'
          ? REQUEST_LINES.dedAbuelita
          : null;
  const announce = (REQUEST_LINES as Record<string, Line>)[songId];
  return [ded, announce].filter((l): l is Line => !!l);
}

// ---------------------------------------------------------------------------
// Súper Estación 88.9 FM — pop in Spanish and English.
// ---------------------------------------------------------------------------

const SU = lines('superestacion', {
  hola1: ['locutorSuper', 'Súper Estación, ochenta y ocho nueve. La música que a usted le gusta, toda la tarde.'],
  hola2: ['locutorSuper', 'Una tarde perfecta para quedarse en la casa con una taza de chocolate y buena música.'],
  shakira1: ['locutorSuper', 'La barranquillera Shakira acaba de sacar su nuevo disco, «Pies descalzos».'],
  shakira2: ['locutorSuper', 'Y «Estoy aquí» está sonando en todas partes. Esa niña va a llegar lejos.'],
  tareas1: ['locutorSuper', 'Para los que están haciendo tareas este sábado: descansen un ratico, que el cerebro también necesita música.'],
  id1: ['locutorSuper', 'Súper Estación... ochenta y ocho nueve.'],
  introShakira: ['locutorSuper', 'Número uno en la Súper Estación: Shakira, «Estoy aquí».'],
  introIngrata: ['locutorSuper', 'Desde México, Café Tacvba: «La ingrata».'],
  introMiGeneracion: ['locutorSuper', 'Hecha aquí en Bogotá: Poligamia, «Mi generación».'],
  introDesvanecer: ['locutorSuper', 'Poligamia, «Desvanecer». Para los que andan con el corazón partío.'],
  introSeal: ['locutorSuper', 'Para los enamorados: Seal, «Kiss from a Rose».'],
  introCoolio: ['locutorSuper', 'La que todos están pidiendo: Coolio, «Gangsta\'s Paradise».'],
  generico1: ['locutorSuper', 'Seguimos en la Súper Estación.'],
});

export const SUPERESTACION: StationDef = {
  id: 'superestacion',
  name: 'Súper Estación',
  band: 'FM',
  freq: 88.9,
  label: 'Súper Estación 88.9',
  catalog: ['la-ingrata', 'estoy-aqui', 'kiss-from-a-rose', 'gangstas-paradise', 'mi-generacion', 'desvanecer'],
  heavy: ['estoy-aqui'],
  jingle: 'pop',
  bed: 'pop',
  format: ['id', 'song', 'talk', 'song', 'ads', 'time', 'song', 'song', 'ads', 'talk'],
  ids: [[SU.id1]],
  talks: [[SU.hola1, SU.hola2], [SU.shakira1, SU.shakira2], [SU.tareas1]],
  ads: [[ADS.optica], [ADS.cebra], [ADS.sanandresito], [ADS.ingles]],
  intros: {
    'la-ingrata': [SU.introIngrata],
    'estoy-aqui': [SU.introShakira],
    'mi-generacion': [SU.introMiGeneracion],
    desvanecer: [SU.introDesvanecer],
    'kiss-from-a-rose': [SU.introSeal],
    'gangstas-paradise': [SU.introCoolio],
  },
  genericIntros: [[SU.generico1]],
  timeCheck: (t) => [dynamicLine('locutorSuper', `En la Súper Estación son ${djTime(t)}.`)],
  pace: 14,
  seed: 889,
};

// ---------------------------------------------------------------------------
// Tropicana 102.9 FM — Caracol. Vallenato, salsa, merengue.
// ---------------------------------------------------------------------------

const TR = lines('tropicana', {
  hola1: ['locutorTropicana', '¡Tropicana Estéreo, ciento dos nueve! ¡Pa\' que baile Bogotá, así esté lloviendo!'],
  hola2: ['locutorTropicana', 'Saludos a las señoras que están preparando las onces, y a los que les tocó trabajar este sábado.'],
  rumba1: ['locutorTropicana', 'Y ya saben: esta noche rumba, pero con juicio, que a la una se acaba la fiesta en Bogotá.'],
  id1: ['locutorTropicana', '¡Tropicana! ¡Ciento dos nueve!'],
  introTierra: ['locutorTropicana', '¡El samario Carlos Vives, con «La tierra del olvido»! ¡Qué disco, señores!'],
  introGota: ['locutorTropicana', '¡Uepa! Carlos Vives: «La gota fría».'],
  introCali: ['locutorTropicana', '¡Salsa caleña! Grupo Niche, «Cali pachanguero».'],
  introAventura: ['locutorTropicana', 'Grupo Niche, «Una aventura». ¡Pa\' bailar pegadito!'],
  introRebelion: ['locutorTropicana', '¡El Joe! Joe Arroyo, «Rebelión».'],
  introBurbujas: ['locutorTropicana', 'Juan Luis Guerra y los 4.40: «Burbujas de amor». ¡Pa\' la pareja que está bailando en la sala!'],
  generico1: ['locutorTropicana', '¡Sabroso! Seguimos en Tropicana.'],
});

export const TROPICANA: StationDef = {
  id: 'tropicana',
  name: 'Tropicana',
  band: 'FM',
  freq: 102.9,
  label: 'Tropicana 102.9',
  catalog: ['tierra-del-olvido', 'gota-fria', 'cali-pachanguero', 'una-aventura', 'rebelion', 'burbujas-de-amor'],
  heavy: ['tierra-del-olvido'],
  jingle: 'tropical',
  bed: 'tropical',
  format: ['id', 'song', 'song', 'talk', 'ads', 'song', 'time', 'song', 'ads', 'talk'],
  ids: [[TR.id1]],
  talks: [[TR.hola1, TR.hola2], [TR.rumba1]],
  ads: [[ADS.ganador], [ADS.salsoteca], [ADS.cebra]],
  intros: {
    'tierra-del-olvido': [TR.introTierra],
    'gota-fria': [TR.introGota],
    'cali-pachanguero': [TR.introCali],
    'una-aventura': [TR.introAventura],
    rebelion: [TR.introRebelion],
    'burbujas-de-amor': [TR.introBurbujas],
  },
  genericIntros: [[TR.generico1]],
  timeCheck: (t) => [dynamicLine('locutorTropicana', `¡Son ${djTime(t)} en Tropicana!`)],
  pace: 15,
  seed: 1029,
};

// ---------------------------------------------------------------------------
// RCN Radio 770 AM — news and talk.
// ---------------------------------------------------------------------------

const RC = lines('rcn', {
  id1: ['locutorRCN', 'RCN Radio. Siete setenta en su dial.'],
  titulares: ['locutorRCN', 'Noticias RCN. Estos son los titulares de esta tarde.'],
  ochomil: ['locutorRCN', 'Continúa en la Comisión de Acusación de la Cámara la investigación al presidente Ernesto Samper por el ingreso de dineros del narcotráfico a su campaña: el llamado proceso ocho mil.'],
  mockus: ['locutorRCN', 'En Bogotá, el alcalde Antanas Mockus defendió la llamada hora zanahoria, que obliga a bares y discotecas a cerrar a la una de la mañana.'],
  himno: ['locutorRCN', 'Y hoy se cumplen setenta y cinco años de la adopción oficial del Himno Nacional, por la Ley treinta y tres de mil novecientos veinte.'],
  clima: ['locutorRCN', 'Las lluvias continuarán durante el fin de semana en la Sabana de Bogotá. Las autoridades recomiendan precaución a los conductores.'],
  shakira: ['locutorRCN', 'En el mundo del espectáculo: la barranquillera Shakira presentó «Pies descalzos», su nuevo trabajo discográfico.'],
  aterciopelados: ['locutorRCN', 'Y el grupo bogotano Aterciopelados lanzó esta semana «El Dorado», su segundo álbum.'],
  comentario1: ['locutorRCN', 'Comentario de la tarde: la ciudad amaneció con huecos nuevos en la Avenida Boyacá. Los conductores piden a la administración distrital una pronta solución.'],
  comentario2: ['locutorRCN', 'Y a los oyentes que nos llaman preguntando: sí, el aguacero va para largo. Paraguas y paciencia.'],
});

export const RCN: StationDef = {
  id: 'rcn',
  name: 'RCN Radio',
  band: 'AM',
  freq: 770,
  label: 'RCN 770 AM',
  catalog: [],
  jingle: 'balada',
  bed: 'balada',
  format: ['id', 'news', 'ads', 'time', 'talk', 'ads', 'news', 'time', 'ads', 'talk'],
  ids: [[RC.id1]],
  talks: [[RC.comentario1], [RC.comentario2]],
  ads: [[ADS.dental], [ADS.ganador], [ADS.cebra]],
  news: [
    [RC.titulares, RC.ochomil, RC.mockus, RC.himno],
    [RC.titulares, RC.clima, RC.shakira, RC.aterciopelados],
  ],
  intros: {},
  genericIntros: [],
  timeCheck: (t) => [dynamicLine('locutorRCN', `RCN Radio. La hora exacta: son ${spokenTime(t)}.`)],
  pace: 14,
  seed: 770,
};

export const STATIONS: StationDef[] = [SUPERESTACION, RADIOACTIVA, TROPICANA, RCN];
