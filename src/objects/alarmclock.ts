// The alarm clock on the dresser: a wind-up despertador that keeps the
// afternoon's time, in the room and up close, where you can hear it tick.

import { clockSvg } from '../art/clock';
import type { AudioEngine } from '../audio/engine';
import { sfx, play } from '../audio/sfx';
import { closeups } from '../scene/closeups';
import { clockParts } from '../world/clock';
import { setAttr } from '../ui/dom';

export class AlarmClock {
  readonly el: HTMLElement;
  private readonly svg: SVGSVGElement;
  private roomHour: SVGElement | null = null;
  private roomMinute: SVGElement | null = null;
  private lastSecond = -1;

  constructor(private readonly engine: AudioEngine) {
    this.el = document.createElement('div');
    this.el.className = 'closeup';
    this.el.id = 'cu-clock';
    this.el.innerHTML = clockSvg();
    this.svg = this.el.querySelector('svg')!;
  }

  /** The little clock drawn in the room. */
  bindRoom(wall: SVGSVGElement): void {
    this.roomHour = wall.querySelector('.alarm-clock .hand-h');
    this.roomMinute = wall.querySelector('.alarm-clock .hand-m');
  }

  tick(t: number): void {
    const { hour, minute, second } = clockParts(t);
    const minutes = minute + second / 60;
    const hourAngle = ((hour % 12) + minutes / 60) * 30;
    const minuteAngle = minutes * 6;
    setAttr(this.roomHour, 'transform', `rotate(${hourAngle.toFixed(1)})`);
    setAttr(this.roomMinute, 'transform', `rotate(${minuteAngle.toFixed(1)})`);
    if (!closeups.isOpen('clock')) return;
    setAttr(this.svg.querySelector('#c-hour'), 'transform', `rotate(${hourAngle.toFixed(2)})`);
    setAttr(this.svg.querySelector('#c-min'), 'transform', `rotate(${minuteAngle.toFixed(2)})`);
    // a mechanical second hand jumps
    setAttr(this.svg.querySelector('#c-sec'), 'transform', `rotate(${second * 6})`);
    if (second !== this.lastSecond) {
      this.lastSecond = second;
      const ctx = this.engine.ctx;
      play(ctx, sfx.click(ctx), this.engine.channel('room').input, { gain: 0.3, rate: second % 2 ? 2.1 : 1.7 });
    }
  }
}
