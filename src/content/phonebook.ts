// The telephone: who answers at each number, and what they say.
//
// In 1995 you called a house, not a person. A mother answered and asked who
// was calling. The friend had gone out. You left a message and waited.

import { lines, dynamicLine } from './lines';
import { REQUEST_LINE, type Dedication } from './stations';
import { REQUESTABLE, song } from './songs';
import { flags, SCHEDULE } from '../world/flags';
import { bus } from '../world/bus';
import { spokenTime } from '../world/clock';
import { hash } from '../util/rng';
import type { CallApi, CallScript, Choice, Route } from '../objects/calls';

/** What the calls need from the rest of the room. */
export interface PhoneWorld {
  /** Is there anything recorded on the cassette? */
  hasRecordings(): boolean;
  /** Tell the station's cabina about a request. */
  request(songId: string, dedication: Dedication): void;
}

/** The libreta, as written. Numbers are 7 digits, the way Bogotá had them. */
export const LIBRETA = [
  { name: 'Abuelita', number: '2459005' },
  { name: 'Andrés', number: '2483107' },
  { name: 'Angie', number: '2125864', heart: true },
  { name: 'Droguería La Sexta', number: '2176033' },
  { name: 'Gustavo', number: '2369012', crossed: 'se trasteó a Medellín' },
  { name: 'Hora exacta', number: '117' },
];

/** Our own number, written on the card in the middle of the dial. */
export const OWN_NUMBER = '2458712';

export const PIZZERIA = '2482020';

export function formatNumber(n: string): string {
  return n.length === 7 ? `${n[0]} ${n.slice(1, 3)} ${n.slice(3, 5)} ${n.slice(5)}` : n;
}

const who = () => (flags.name ? `${flags.name}, un compañero del colegio` : 'un compañero del colegio');

// ---------------------------------------------------------------------------
// Andrés's house (the TV on in the background)
// ---------------------------------------------------------------------------

const A = lines('llamada.andres', {
  hola: ['mamaAndres', '¿Aló?'],
  deParte: ['mamaAndres', '¿De parte de quién?'],
  quienLo: ['mamaAndres', '¿Quién lo necesita?'],
  noEsta: ['mamaAndres', 'No, Andrés no está. Salió desde temprano con los primos y todavía no ha llegado.'],
  razon: ['mamaAndres', '¿Le dejo la razón?'],
  dondeFue: ['mamaAndres', 'Dijo que iban para Unicentro. Pero con este aguacero, quién sabe dónde estarán.'],
  yoLeDigo: ['mamaAndres', 'Bueno, yo le digo que lo llame apenas llegue.'],
  chao: ['mamaAndres', 'Bueno. Chao, pues.'],
  otraVez: ['mamaAndres', 'Otra vez usted... No, todavía no ha llegado. Yo ya le dejé la razón.'],
  momentico: ['mamaAndres', 'Ah, sí, ya llegó. Un momentico, ya se lo paso.'],
  grita: ['mamaAndres', '¡Andrés! ¡Teléfono!'],
  alo: ['andres', '¿Aló? ¿Quiubo?'],
  meLlamo: ['andres', '¿Quiubo, parce? ¿Me llamó? Mi mamá me dejó la razón.'],
  queMas: ['andres', 'Nada, aquí, mamado. Nos cogió el aguacero en Unicentro y nos tocó esperar como una hora.'],
  grabadora: ['andres', 'Oiga, ¿usted tiene la grabadora buena? A la mía se le enredó la cinta y se tragó el casete.'],
  pedido: ['andres', '¿Me graba «Florecita rockera» de la radio? En Radioactiva la ponen a cada rato.'],
  pilas: ['andres', 'Pero pilas, que el locutor siempre habla encima del principio.'],
  yaGrabo: ['andres', '¿En serio ya grabó? ¡Qué bacano! Me lo presta el lunes en el colegio.'],
  deUna: ['andres', '¡De una! Me lo trae el lunes, pues.'],
  noImporta: ['andres', 'Bueno, no importa. Si puede, me avisa.'],
  chisme: ['andres', 'Ah, y ¿sí supo? Angie va a ir a la fiesta de Diana el otro sábado.'],
  colgar: ['andres', 'Bueno, me toca colgar, que mi mamá necesita el teléfono. ¡Chao, pues!'],
  // early on he calls from a monedero in Unicentro; once he's home, he calls again
  monedero: ['andres', '¿Aló? ¿Quiubo, parce? Habla Andrés. Lo estoy llamando de un monedero, rapidito.'],
  monedas: ['andres', 'Uy, se me están acabando las monedas. Lo llamo cuando llegue a la casa. ¡Chao!'],
  yaLlegue: ['andres', '¿Quiubo, parce? Ya llegué a la casa, todo ensopado.'],
  laGrabo: ['andres', '¿Y qué? ¿Sí me grabó «Florecita rockera»?'],
});

async function passToAndres(call: CallApi, world: PhoneWorld): Promise<void> {
  await call.say(A.momentico);
  await call.pause(0.6);
  await call.say(A.grita);
  await call.pause(3.5);
  call.click();
  await andresTalks(call, world, 'answers');
}

/** The aguacero in Unicentro, then the favor: his grabadora chewed the tape, would you tape «Florecita rockera» off Radioactiva? */
async function andresAsks(call: CallApi, world: PhoneWorld): Promise<void> {
  if (!flags.andresToldRain) {
    flags.andresToldRain = true;
    await call.say(A.queMas);
  }
  await call.say(A.grabadora);
  await call.say(A.pedido);
  await call.say(A.pilas);
  flags.andresAsked = true;
  bus.emit('story:andres', { step: 'asked' });
  const options: Choice<boolean | null>[] = [{ text: 'Sí, de una. Yo se la grabo.', value: false }];
  if (world.hasRecordings()) options.push({ text: 'Ya tengo algo grabado de hoy, ¿quiere?', value: true });
  options.push({ text: 'Uy, no sé si alcance...', value: null });
  const already = await call.choose(options);
  if (already === true) await call.say(A.yaGrabo);
  else if (already === false) await call.say(A.deUna);
  else await call.say(A.noImporta);
}

/** Back home, he wants to know: did you tape it? */
async function andresChecks(call: CallApi, world: PhoneWorld): Promise<void> {
  await call.say(A.laGrabo);
  const options: Choice<boolean>[] = [];
  if (world.hasRecordings()) options.push({ text: 'Sí, ya la tengo en el casete.', value: true });
  options.push({ text: 'Todavía no la han puesto.', value: false });
  const taped = await call.choose(options);
  bus.emit('story:andres', { step: taped ? 'taped' : 'not-taped' });
  await call.say(taped ? A.yaGrabo : A.noImporta);
}

/**
 * Andrés on the phone, at home: when you call him and he comes to the phone,
 * when he calls back because you left a message, or when he calls as he
 * promised from the monedero.
 */
export async function andresTalks(call: CallApi, world: PhoneWorld, how: 'answers' | 'message' | 'promised'): Promise<void> {
  flags.andresTalked = true;
  flags.andresTalkedHome = true;
  await call.say(how === 'answers' ? A.alo : how === 'message' ? A.meLlamo : A.yaLlegue);
  if (flags.andresToldRain) {
    // you've heard about Unicentro already
    await call.choose([
      { text: '¡Quiubo! ¿Llegó bien?', value: 1 },
      { text: 'Quiubo, parce.', value: 2 },
    ]);
  } else if (how === 'answers') {
    await call.choose([
      { text: '¿Quiubo, Andrés? ¿Dónde estaba metido?', value: 1 },
      { text: 'Quiubo, parce. Lo estaba llamando hace rato.', value: 2 },
    ]);
  } else {
    await call.choose([
      { text: 'Sí, ¿qué más? ¿Dónde estaba?', value: 1 },
      { text: 'Quiubo, parce. Nada, era para saber qué hacía.', value: 2 },
    ]);
  }
  if (flags.andresAsked) await andresChecks(call, world);
  else await andresAsks(call, world);
  await call.say(A.chisme);
  await call.choose([
    { text: '¿En serio? ¿Con quién va a ir?', value: 1 },
    { text: 'Ah... bueno. ¿Y a mí qué?', value: 2 },
  ]);
  await call.say(A.colgar);
  await call.hangUp();
}

/** Early on, stuck in Unicentro by the rain, Andrés calls from a monedero with a favor to ask, and his coins run out. */
export const andresFromMonedero =
  (world: PhoneWorld): CallScript =>
  async (call) => {
    call.ambience('street');
    call.coins();
    flags.andresTalked = true;
    bus.emit('story:andres', { step: 'answered' });
    await call.pause(0.6);
    await call.say(A.monedero);
    await call.choose([
      { text: '¿Quiubo, Andrés? ¿Dónde está?', value: 1 },
      { text: 'Quiubo, parce. ¿Qué más?', value: 2 },
    ]);
    await andresAsks(call, world);
    await call.say(A.monedas);
    await call.hangUp();
  };

/** Andrés calls back once he's home (or your mother answers it in the kitchen first). */
export const andresCallsBack =
  (world: PhoneWorld): CallScript =>
  async (call) => {
    call.ambience('tv');
    await andresTalks(call, world, flags.andresMessageAt !== null ? 'message' : 'promised');
  };

const andres =
  (world: PhoneWorld): CallScript =>
  async (call) => {
    call.ambience('tv');
    flags.andresCalls++;
    await call.say(A.hola);
    const home = call.now() >= SCHEDULE.andresHome;
    if (flags.andresMessageAt !== null && !home) {
      await call.choose([{ text: 'Buenas tardes, señora. ¿Ya llegó Andrés?', value: 1 }]);
      await call.say(A.otraVez);
      await call.say(A.chao);
      return call.hangUp();
    }
    const polite = await call.choose([
      { text: 'Buenas tardes, señora. ¿Me hace el favor con Andrés?', value: true },
      { text: '¿Está Andrés?', value: false },
    ]);
    await call.say(polite ? A.deParte : A.quienLo);
    await call.choose([{ text: `De parte de ${who()}.`, value: 1 }]);
    if (home) return passToAndres(call, world);
    await call.say(A.noEsta);
    await call.say(A.razon);
    let asked = false;
    for (;;) {
      const options: Choice<'si' | 'no' | 'donde'>[] = [
        { text: 'Sí, señora, que me llame, por favor.', value: 'si' },
        { text: 'No, gracias. Yo lo llamo más tarde.', value: 'no' },
      ];
      if (!asked) options.push({ text: '¿Y sabe para dónde se fue?', value: 'donde' });
      const answer = await call.choose(options);
      if (answer === 'donde') {
        asked = true;
        await call.say(A.dondeFue);
        await call.say(A.razon);
        continue;
      }
      if (answer === 'si') {
        flags.andresMessageAt = call.now();
        await call.say(A.yoLeDigo);
      }
      await call.say(A.chao);
      return call.hangUp();
    }
  };

// ---------------------------------------------------------------------------
// Angie's house (her father guards the phone)
// ---------------------------------------------------------------------------

const C = lines('llamada.angie', {
  alo: ['papaAngie', '¿Aló?'],
  conQuien: ['papaAngie', '¿Con quién desea hablar?'],
  deParte: ['papaAngie', '¿Y de parte de quién?'],
  tareas: ['papaAngie', 'Angie está haciendo tareas. ¿Es algo del colegio?'],
  unMomento: ['papaAngie', 'Un momento.'],
  grita: ['papaAngie', '¡Angie! ¡Al teléfono! ¡Que es para una tarea!'],
  noPuede: ['papaAngie', 'Ella ahora no puede pasar. Llame otro día.'],
  hola: ['angie', '¿Aló? Ah... hola. ¿Qué más?'],
  tarea: ['angie', '¿La tarea de sociales? Es para el martes, ¿no? Yo todavía no he empezado.'],
  dedicatoria: ['angie', 'Oye... lo de la dedicatoria en Radioactiva, ¿fuiste tú?'],
  pena: ['angie', '¡Jajaja! Me dio mucha pena... pero me gustó.'],
  radio: ['angie', 'Sí, estoy oyendo Radioactiva mientras hago las tareas. Pusieron lo nuevo de los Aterciopelados.'],
  papa: ['angie', 'Bueno, me tengo que ir, que mi papá necesita el teléfono. Chao.'],
});

const angie: CallScript = async (call) => {
  call.ambience('radio');
  flags.angieCalls++;
  await call.say(C.alo);
  await call.choose([
    { text: 'Buenas noches... digo, buenas tardes, señor. ¿Me hace el favor con Angie?', value: 1 },
    { text: 'Buenas tardes. ¿Está Angie?', value: 2 },
  ]);
  await call.say(C.deParte);
  await call.choose([{ text: `De parte de ${who()}.`, value: 1 }]);
  await call.say(C.tareas);
  const lie = await call.choose([
    { text: 'Sí, señor. Es por una tarea de sociales.', value: true },
    { text: 'No, señor... era para saludarla.', value: false },
  ]);
  if (!lie) {
    await call.say(C.noPuede);
    return call.hangUp();
  }
  await call.say(C.unMomento);
  await call.say(C.grita);
  await call.pause(4);
  call.click();
  flags.angieTalked = true;
  await call.say(C.hola);
  const dedicated = flags.request?.dedication === 'angie' && flags.requestAiredAt !== null;
  if (dedicated) {
    await call.say(C.dedicatoria);
    await call.choose([
      { text: 'Ehh... ¿cuál dedicatoria?', value: 1 },
      { text: 'Sí... fui yo.', value: 2 },
    ]);
    await call.say(C.pena);
  } else {
    await call.choose([
      { text: 'Hola... era por lo de la tarea de sociales.', value: 1 },
      { text: '¿Estás oyendo radio?', value: 2 },
    ]).then(async (v) => call.say(v === 1 ? C.tarea : C.radio));
  }
  await call.choose([
    { text: 'Bueno... nos vemos el lunes.', value: 1 },
    { text: '¿Vas a ir a la fiesta de Diana?', value: 2 },
  ]);
  await call.say(C.papa);
  await call.hangUp();
};

// ---------------------------------------------------------------------------
// The abuelita, who never wants to hang up
// ---------------------------------------------------------------------------

const G = lines('llamada.abuelita', {
  alo: ['abuelita', '¿Aló? ¿Aló? ¿Quién habla?'],
  miAmor: ['abuelita', '¡Ay, mi amor! ¡Qué milagro! ¿Cómo está?'],
  comio: ['abuelita', '¿Ya comió? ¿Sí se está abrigando? Mire que con este frío uno se enferma.'],
  noticias: ['abuelita', '¿Usted vio las noticias? Eso con el presidente es un escándalo... ¡en qué país vivimos, Dios mío!'],
  rodillas: ['abuelita', 'Aquí, con esta lluvia me duelen las rodillas. Pero bueno, Dios es muy grande.'],
  mama: ['abuelita', '¿Y su mamá cómo está? Dígale que me llame, que hace días no sé nada de ella.'],
  cuidese: ['abuelita', 'Bueno, mi amor, cuídese mucho.'],
  otraCosa: ['abuelita', 'Ah, y otra cosa...'],
  domingo: ['abuelita', '¿Van a venir el domingo? Le tengo guardado un pedazo de ponqué.'],
  chao: ['abuelita', 'Bueno, chao, mi vida. Que mi Dios me lo bendiga.'],
  chaoChao: ['abuelita', 'Chao, chao... Salúdeme a todos. Chao.'],
});

const abuelita: CallScript = async (call) => {
  call.ambience('radio');
  await call.say(G.alo);
  await call.choose([{ text: flags.name ? `Hola, abuelita. Soy yo, ${flags.name}.` : 'Hola, abuelita. Soy yo.', value: 1 }]);
  flags.abuelitaTalked = true;
  await call.say(G.miAmor);
  await call.choose([
    { text: 'Bien, abuelita, ¿y usted?', value: 1 },
    { text: 'Bien... aquí, aburrido por la lluvia.', value: 2 },
  ]);
  await call.say(G.rodillas);
  await call.say(G.comio);
  await call.choose([
    { text: 'Sí, abuelita.', value: 1 },
    { text: 'Sí, sí...', value: 2 },
  ]);
  await call.say(G.noticias);
  await call.say(G.mama);
  await call.choose([{ text: 'Sí, abuelita, yo le digo.', value: 1 }]);
  await call.say(G.cuidese);
  await call.choose([{ text: 'Bueno, abuelita, chao.', value: 1 }]);
  await call.say(G.otraCosa);
  await call.say(G.domingo);
  await call.choose([{ text: 'Sí, abuelita, ahí vamos. Chao.', value: 1 }]);
  await call.say(G.chao);
  await call.choose([{ text: 'Chao, abuelita...', value: 1 }]);
  await call.say(G.chaoChao);
  await call.hangUp();
};

// ---------------------------------------------------------------------------
// Shops
// ---------------------------------------------------------------------------

const S = lines('llamada.negocios', {
  drogueria: ['negocio', 'Droguería La Sexta, buenas tardes. ¿A la orden?'],
  mejoral: ['negocio', 'Sí, claro. ¿Se lo mandamos? Hacemos domicilios hasta las ocho.'],
  aLaOrden: ['negocio', 'Bueno. A la orden.'],
  pizzeria: ['negocio', 'Pizzería La Toscana, buenas tardes. ¿Qué desea?'],
  direccion: ['negocio', '¿A qué dirección se la mandamos?'],
  pagar: ['negocio', '¿Y con cuánto va a pagar, para mandarle las vueltas?'],
  bueno: ['negocio', 'Ah, bueno... A la orden.'],
});

const drogueria: CallScript = async (call) => {
  call.ambience('street');
  await call.say(S.drogueria);
  await call.choose([
    { text: '¿Tienen Mejoral?', value: 1 },
    { text: 'Ehh... perdón, número equivocado.', value: 2 },
  ]).then(async (v) => {
    if (v === 1) {
      await call.say(S.mejoral);
      await call.choose([{ text: 'No, gracias, era para saber.', value: 1 }]);
    }
  });
  await call.say(S.aLaOrden);
  await call.hangUp();
};

const pizzeria: CallScript = async (call) => {
  call.ambience('kitchen');
  await call.say(S.pizzeria);
  await call.choose([
    { text: 'Buenas... una pizza hawaiana mediana, por favor.', value: 1 },
    { text: 'Ehh... nada, gracias.', value: 2 },
  ]).then(async (v) => {
    if (v === 1) {
      await call.say(S.direccion);
      await call.choose([{ text: 'Calle sesenta y tres con novena, apartamento 301.', value: 1 }]);
      await call.say(S.pagar);
      await call.choose([{ text: 'Uy... no, mejor no. Perdón.', value: 1 }]);
    }
  });
  await call.say(S.bueno);
  await call.hangUp();
};

// ---------------------------------------------------------------------------
// 117 — la hora exacta
// ---------------------------------------------------------------------------

const hora: CallScript = async (call) => {
  for (;;) {
    await call.pause(0.6);
    await call.say(dynamicLine('hora117', `Hora exacta: son ${spokenTime(call.now() + 1)}.`));
    await call.pause(2.2);
  }
};

// ---------------------------------------------------------------------------
// The cabina at Radioactiva: song requests
// ---------------------------------------------------------------------------

const R = lines('llamada.cabina', {
  alo: ['cabinaRadioactiva', 'Radioactiva, buenas tardes.'],
  cancion: ['cabinaRadioactiva', '¿Qué canción quiere escuchar?'],
  dedicada: ['cabinaRadioactiva', '¿Y va dedicada a alguien?'],
  barrio: ['cabinaRadioactiva', '¿Desde qué barrio nos llama?'],
  listo: ['cabinaRadioactiva', 'Listo. Quédese pendiente, que ya casi se la ponemos.'],
  yaTenemos: ['cabinaRadioactiva', 'Ya tenemos su pedido anotado. ¡Pilas con el radio!'],
  yaSono: ['cabinaRadioactiva', 'Esa ya se la pusimos, ¿no la oyó? Llame más tarde y pide otra.'],
});

function cabina(world: PhoneWorld): CallScript {
  return async (call) => {
    call.ambience('radio');
    await call.say(R.alo);
    if (flags.request && flags.requestAiredAt === null) {
      await call.say(R.yaTenemos);
      return call.hangUp();
    }
    if (flags.request && flags.requestAiredAt !== null) {
      await call.say(R.yaSono);
      return call.hangUp();
    }
    await call.say(R.cancion);
    const songId = await call.choose(
      REQUESTABLE.map((id) => ({ text: `«${song(id).title}», de ${song(id).artist}.`, value: id })),
    );
    await call.say(R.dedicada);
    const dedication = await call.choose<Dedication>([
      { text: 'Para Angie, de parte de un admirador secreto.', value: 'angie' },
      { text: 'Para todos los del colegio.', value: 'colegio' },
      { text: 'Para mi abuelita.', value: 'abuelita' },
      { text: 'No, sin dedicatoria.', value: null },
    ]);
    await call.say(R.barrio);
    await call.choose([{ text: 'Desde Chapinero.', value: 1 }]);
    // it's on the list now, even if you hang up before they finish talking
    flags.request = { songId, dedication, at: call.now() };
    world.request(songId, dedication);
    await call.say(R.listo);
    await call.hangUp();
  };
}

// ---------------------------------------------------------------------------
// Strangers
// ---------------------------------------------------------------------------

const W = lines('llamada.equivocado', {
  aloSenora: ['equivocado', '¿Aló?'],
  conQuien: ['equivocado', '¿Con quién desea hablar?'],
  noVive: ['equivocado', 'No, aquí no vive nadie con ese nombre. Número equivocado.'],
  aloSenor: ['equivocado', '¿Aló? ¿Sí?'],
  aloAlo: ['equivocado', '¿Aló? ¿Aló? No se oye nada...'],
  panaderia: ['equivocado', '¿Aló? ¿Hablo con la panadería La Espiga?'],
  quePena: ['equivocado', 'Ay, qué pena. Perdone.'],
  roscones: ['equivocado', '¡Ay, qué bueno! ¿Me separa dos roscones y una mantecada? Ya paso por ellos.'],
  gracias: ['equivocado', 'Muchas gracias, muy amable.'],
});

const stranger: CallScript = async (call) => {
  call.ambience('kitchen');
  await call.say(W.aloSenora);
  const reply = await call.choose([
    { text: 'Buenas tardes, ¿está Andrés?', value: 1 },
    { text: '(Quedarse callado)', value: 2 },
    { text: 'Perdón, número equivocado.', value: 3 },
  ]);
  if (reply === 1) {
    await call.say(W.noVive);
  } else if (reply === 2) {
    await call.say(W.aloAlo);
  }
  await call.hangUp();
};

/** The phone rings: a señora looking for the bakery (whose number is almost ours). */
export const wrongNumberIncoming: CallScript = async (call) => {
  call.ambience('street');
  await call.say(W.panaderia);
  const prank = await call.choose([
    { text: 'No, señora, está equivocada.', value: false },
    { text: 'Sí... a la orden.', value: true },
  ]);
  if (!prank) {
    await call.say(W.quePena);
  } else {
    await call.say(W.roscones);
    await call.choose([{ text: 'Eh... claro, señora. Con mucho gusto.', value: 1 }]);
    await call.say(W.gracias);
  }
  await call.hangUp();
};

// ---------------------------------------------------------------------------
// The other extension: your mother and tía Gloria
// ---------------------------------------------------------------------------

export const EXTENSION = lines('extension', {
  m1: ['mama', '...y yo le dije que no, que eso no era así, que primero hablara con el papá.'],
  t1: ['tia', '¡Ay, no! ¿Y ella qué le contestó?'],
  m2: ['mama', 'Nada, se puso a llorar. Usted sabe cómo es ella.'],
  t2: ['tia', 'Ay, Dios mío. Esa muchacha...'],
  m3: ['mama', '¿Aló? ¿Quién levantó el teléfono? ¡Cuelgue, que estoy hablando!'],
  m4: ['mama', '¡Que cuelgue, le digo!'],
  t3: ['tia', 'Déjelo, déjelo... ¿En qué íbamos?'],
});

// ---------------------------------------------------------------------------
// The exchange
// ---------------------------------------------------------------------------

export function route(number: string, t: number, world: PhoneWorld): Route {
  if (number === '117') return { kind: 'service', script: hora };
  if (number === OWN_NUMBER) return { kind: 'busy' };
  if (number === REQUEST_LINE) {
    flags.cabinaCalls++;
    if (flags.cabinaCalls <= SCHEDULE.cabinaBusyTries) return { kind: 'busy' };
    return { kind: 'answer', rings: 3, script: cabina(world) };
  }
  if (number === PIZZERIA) return { kind: 'answer', rings: 2, script: pizzeria };
  const entry = LIBRETA.find((e) => e.number === number);
  if (entry) {
    switch (entry.name) {
      case 'Andrés':
        return { kind: 'answer', rings: 3, script: andres(world) };
      case 'Angie':
        return t < SCHEDULE.angieBusyUntil ? { kind: 'busy' } : { kind: 'answer', rings: 4, script: angie };
      case 'Abuelita':
        return { kind: 'answer', rings: 7, script: abuelita };
      case 'Droguería La Sexta':
        return { kind: 'answer', rings: 2, script: drogueria };
      case 'Gustavo':
        return { kind: 'unassigned' };
    }
  }
  if (number.length !== 7 || number[0] === '0' || number[0] === '1') return { kind: 'unassigned' };
  // any other number: most don't exist, some ring forever, some answer
  const h = hash(number) % 100;
  if (h < 45) return { kind: 'unassigned' };
  if (h < 65) return { kind: 'no-answer' };
  if (h < 80) return { kind: 'busy' };
  return { kind: 'answer', rings: 2 + (h % 4), script: stranger };
}

/** The recording you get when a number doesn't exist. */
export const UNASSIGNED = lines('llamada.grabacion', {
  noExiste: ['hora117', 'El número que usted marcó no está asignado. Por favor, verifíquelo e intente de nuevo.'],
});
