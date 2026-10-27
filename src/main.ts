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
import { AHEAD, needs } from './audio/needs';
import { STATIONS } from './content/stations';
import { Grabadora } from './objects/grabadora';
import { Phone } from './objects/phone';
import { Tv } from './objects/tv';
import { WindowView } from './objects/window';
import { AlarmClock } from './objects/alarmclock';
import { light, setBulb } from './scene/light';
import { kv } from './world/store';
import { sfx, play } from './audio/sfx';
import { mountHouse } from './objects/house';
import { dialogue } from './ui/dialogue';
import { Backstage } from './ui/backstage';
import { flags } from './world/flags';
import { bus } from './world/bus';
import { ROOM } from './art/room';
import { Study } from './research/study';
import { CONSENT } from './research/screens';
import type { Snapshot } from './research/log';

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

const tv = new Tv(engine);
tv.bindRoom(scene.wall, scene.tvCanvas);
closeups.register('tv', { el: tv.el, rect: ROOM.tv, focus: 'tv' });
addLightOverlays(tv.el, { x: 640, y: 480 }, 0.25);

const windowView = new WindowView(engine);
windowView.bindRoom(scene.wall);
closeups.register('window', { el: windowView.el, rect: ROOM.window, focus: 'window' });
addLightOverlays(windowView.el, { x: 1700, y: 900 }, 0.2);

const alarmClock = new AlarmClock(engine);
alarmClock.bindRoom(scene.wall);
const { cx, cy } = ROOM.clock;
closeups.register('clock', { el: alarmClock.el, rect: { x: cx - 40, y: cy - 30, w: 80, h: 60 }, focus: null });
addLightOverlays(alarmClock.el, { x: -200, y: 300 }, 0.3);

// the light switch by the door
const toggle = scene.wall.querySelector<SVGRectElement>('.switch-toggle')!;
const showSwitch = () => toggle.setAttribute('y', light.bulb ? '366' : '374');
setBulb(kv.get('bulb', false));
showSwitch();
scene.onHot('switch', () => {
  setBulb(!light.bulb);
  showSwitch();
  play(engine.ctx, sfx.click(engine.ctx), engine.channel('room').input, { gain: 0.9, rate: 0.8 });
});
mountHouse(engine);

subtitles.mount(stage.el);
dialogue.mount();
new Backstage(engine.ctx, grabadora.deck).mount();
mountGrain(stage.el);

onTick((dt, t) => {
  if (!clock.started) return;
  grabadora.tick(dt, t);
  phone.tick(dt, t);
  tv.tick(dt, t);
  windowView.tick(dt, t);
  alarmClock.tick(t);
});

/**
 * The card over the room, still and dimmed. Its button opens the door (it has
 * the focus, so Enter does too); in the test, that button is the visitor's yes,
 * and "Más detalles" says what taking part means.
 */
function titleCard(onEnter: () => void): void {
  const title = document.createElement('div');
  title.id = 'title';
  title.innerHTML = `
    <div class="place">Bogotá</div>
    <div class="date">Sábado 28 de octubre de 1995 · 5:30 p.m.</div>
    <button type="button" class="enter">${study.on ? CONSENT.enter : 'Entrar'}</button>
    ${study.on ? `<div class="consent">${CONSENT.line} <button type="button" class="more">Más detalles</button></div>` : ''}
    <div class="hint">Se recomienda usar audífonos.</div>`;
  stage.el.appendChild(title);
  const button = title.querySelector<HTMLButtonElement>('.enter')!;
  const enter = () => {
    for (const b of title.querySelectorAll('button')) b.disabled = true;
    title.classList.add('gone');
    setTimeout(() => title.remove(), 2400);
    onEnter();
  };
  button.addEventListener('click', enter, { once: true });
  title.querySelector('.more')?.addEventListener('click', async () => {
    if (await study.details()) button.click();
    else button.focus({ preventScroll: true });
  });
  button.focus({ preventScroll: true });
}

// the test (docs/test-plan.md): questions at the door and on the way out, and an anonymous log
const study = new Study(params, stage.el, (on) => engine.master.gain.setTargetAtTime(on ? 0.25 : 0.9, engine.ctx.currentTime, 0.4));
// phones get a note asking for a computer instead, and nothing heavy loads
const gated = study.gate(() => {
  params.set('anyway', '');
  location.search = params.toString();
});

// Your own files load first (they're already in this browser, and they take
// priority). Then only what the room opens with downloads: the first half
// minute's lines, and what the grabadora is playing as you walk in (it's on
// from the start), with nothing else competing for the connection. The room
// opens when they're here, or after a few seconds anyway (anything that
// arrives late joins partway through), and the rest follows in the order the
// afternoon needs it.
const OPEN_WITH = 30;
const ready = gated
  ? Promise.resolve()
  : Promise.all([library.loadSaved(), voices.loadSaved(engine.ctx), grabadora.init()]).then(async () => {
      const need = needs(grabadora.radio.ahead(AHEAD), tv.ahead(AHEAD));
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
      voices.init(engine.ctx);
      await Promise.all([voices.ready(need.linesBefore(OPEN_WITH), 8000), Promise.race([onAirAtFirst(), wait(4000)])]);
      void voices.loadBundled(engine.ctx, need.voice);
      void library.loadHouse(need.house);
    });

/** What the grabadora plays as the room opens: asking for it puts it first in line. */
function onAirAtFirst(): Promise<unknown> {
  // nothing has ticked yet, so ask the tuning itself which station comes in
  const radio = grabadora.radio;
  const station = STATIONS.map((def) => radio.station(def.id)).find((st) => radio.power && radio.strength(st) > 0.5);
  if (!station) return Promise.resolve();
  const seg = station.timeline.at(0)?.seg;
  if (seg?.kind === 'song') return library.whenSong(seg.songId, seg.audio ?? null);
  if (seg?.kind === 'talk' || seg?.kind === 'ad') return library.whenBed(station.def.id, station.def.bed);
  return Promise.resolve();
}

/** If the first lines are still on their way, say so, instead of a room that doesn't move. */
async function waitFor(loading: Promise<unknown>): Promise<void> {
  const note = Object.assign(document.createElement('div'), { id: 'waiting', textContent: 'Un momento…' });
  const timer = setTimeout(() => stage.el.appendChild(note), 600);
  await loading;
  clearTimeout(timer);
  note.remove();
}

/** What the room is doing right now, for the test's log. */
function snapshot(): Snapshot {
  const radio = grabadora.radio;
  const deck = grabadora.deck;
  const audible = radio.power && radio.volume > 0.05;
  const dom = audible ? radio.dominant() : null;
  return {
    view: closeups.current ?? 'room',
    radio: !audible ? null : dom && dom.strength > 0.5 ? dom.station.def.id : 'static',
    tv: tv.power ? tv.channel : null,
    clip: tv.playingClip,
    phone: phone.state !== 'idle',
    tape: deck.isRecording ? 'rec' : deck.transport === 'play' && !deck.paused ? 'play' : null,
  };
}

async function enter(): Promise<void> {
  await engine.unlock();
  await waitFor(ready);
  clock.start(engine.ctx);
  performance.mark('room:open');
  const skipTo = Number(params.get('t') ?? 0);
  if (skipTo > 0) clock.skip(skipTo);
  const open = params.get('open');
  if (open === 'grabadora' || open === 'phone' || open === 'tv' || open === 'window' || open === 'clock') closeups.open(open);
  study.inRoom(snapshot);
}

// for poking at the room from the browser console while developing
if (import.meta.env.DEV) Object.assign(window, { room1995: { grabadora, phone, tv, windowView, alarmClock, clock, engine, closeups, library, voices, flags, study } });

startLoop();
if (gated) {
  // the note for phones is up: the room waits for a computer
} else if (params.has('skip')) {
  void enter();
} else {
  titleCard(() => void study.atTheDoor().then(enter));
}
