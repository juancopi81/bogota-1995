import './styles.css';
import { stage } from './scene/stage';
import { room } from './scene/room';
import { addLightOverlays } from './scene/light';
import { closeups } from './scene/closeups';
import { mountGrain } from './ui/grain';
import { subtitles } from './ui/subtitles';
import { startLoop, onTick } from './world/loop';
import { clock } from './world/clock';
import { AudioEngine } from './audio/engine';
import { library } from './audio/library';
import { voices } from './audio/voices';
import { Grabadora } from './objects/grabadora';
import { Phone } from './objects/phone';
import { mountHouse } from './objects/house';
import { dialogue } from './ui/dialogue';
import { flags } from './world/flags';
import { bus } from './world/bus';
import { ROOM } from './art/room';

const params = new URLSearchParams(location.search);

const app = document.getElementById('app')!;
stage.mount(app);

const scene = room();
stage.el.appendChild(scene.el);
addLightOverlays(scene.el, { x: 1184, y: 380 });

const engine = new AudioEngine();
library.init(engine.ctx);
closeups.mount(engine);

// the objects
const grabadora = new Grabadora(engine);
grabadora.bindRoom(scene.wall);
closeups.register('grabadora', { el: grabadora.el, rect: ROOM.grabadora, focus: 'radio' });
addLightOverlays(grabadora.el, { x: 1500, y: 100 }, 0.4);

const phone = new Phone(engine, {
  hasRecordings: () => [grabadora.deck.cassette, ...grabadora.deck.desk].some((c) => c && c.keys().size > 0),
  request: (songId, dedication) => grabadora.radio.station('radioactiva').request(clock.now(), songId, dedication),
});
phone.bindRoom(scene.phoneLayer);
closeups.register('phone', { el: phone.el, rect: ROOM.phone, focus: 'phone' });
addLightOverlays(phone.el, { x: 1700, y: -200 }, 0.3);
bus.on('radio:request-aired', () => (flags.requestAiredAt = clock.now()));
mountHouse(engine);

subtitles.mount(stage.el);
dialogue.mount();
mountGrain(stage.el);

onTick((dt, t) => {
  if (!clock.started) return;
  grabadora.tick(dt, t);
  phone.tick(dt, t);
});

function titleCard(onEnter: () => void): void {
  const title = document.createElement('div');
  title.id = 'title';
  title.innerHTML = `
    <div class="place">Bogotá</div>
    <div class="date">Sábado 28 de octubre de 1995 · 5:30 p.m.</div>
    <div class="hint">Póngase audífonos. Toque para entrar.</div>`;
  stage.el.appendChild(title);
  const enter = () => {
    title.removeEventListener('pointerdown', enter);
    title.classList.add('gone');
    setTimeout(() => title.remove(), 2400);
    onEnter();
  };
  title.addEventListener('pointerdown', enter);
}

const ready = Promise.all([library.loadSaved(), voices.loadSaved(engine.ctx), grabadora.init()]);

async function enter(): Promise<void> {
  await engine.unlock();
  await ready;
  clock.start(engine.ctx);
  const skipTo = Number(params.get('t') ?? 0);
  if (skipTo > 0) clock.skip(skipTo);
  const open = params.get('open');
  if (open === 'grabadora' || open === 'phone') closeups.open(open);
}

// for poking at the room from the browser console while developing
if (import.meta.env.DEV) Object.assign(window, { room1995: { grabadora, phone, clock, engine, closeups, library, flags } });

startLoop();
if (params.has('skip')) {
  void enter();
} else {
  titleCard(() => void enter());
}
