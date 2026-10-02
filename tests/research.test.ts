import { afterEach, describe, expect, it, vi } from 'vitest';
import { nostalgiaScore } from '../src/research/questions';
import { VisitRecord, doorFields, exitFields } from '../src/research/record';
import { ActivityLog, type Snapshot } from '../src/research/log';

const mood = (n1: number, n2: number, n3: number) => ({ tranquilo: 4, nostalgico: n1, aburrido: 2, sentimientos: n2, contento: 5, ahora: n3 });

describe('the questions', () => {
  it('scores nostalgia as the mean of its three items, ignoring the mood fillers', () => {
    expect(nostalgiaScore(mood(2, 3, 4))).toBe(3);
    expect(nostalgiaScore(mood(7, 6, 6))).toBe(6.33);
    expect(nostalgiaScore({ nostalgico: 5, sentimientos: 5 })).toBeNull();
  });

  it('turns the answers into one column each, with the change from the door to the exit', () => {
    const door = doorFields({ lived: 'bogota', age: '15-19', mood: mood(2, 2, 2) });
    expect(door).toMatchObject({ lived_1995: 'bogota', age_1995: '15-19', pre_nostalgico: 2, pre_tranquilo: 4, pre_nostalgia: 2 });
    const exit = exitFields(
      {
        mood: mood(5, 6, 4),
        memory: '  El casete que me grabó mi hermano.  ',
        triggers: ['radio', 'grabadora'],
        returnIntent: 'si',
        trait: { often: 3 },
        feedback: '',
      },
      door.pre_nostalgia as number,
    );
    expect(exit).toMatchObject({ post_nostalgia: 5, change: 3, memory: 'El casete que me grabó mi hermano.', triggers: 'radio grabadora', return_intent: 'si', trait_often: 3, trait_prone: null });
  });
});

describe('the visit record', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends the whole record, only when something changed, and caps the free text', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const record = new VisitRecord('');
    record.set({ stage: 'door', memory: 'x'.repeat(5000), skipped: null });
    record.send();
    record.send();
    expect(info).toHaveBeenCalledTimes(1);
    expect(record.last).toMatchObject({ v: 1, visit: record.id, fields: { stage: 'door' } });
    expect((record.last!.fields.memory as string).length).toBe(2000);
    expect('skipped' in record.last!.fields).toBe(false);
    record.set({ stage: 'room' });
    record.send();
    expect(info).toHaveBeenCalledTimes(2);
  });
});

describe('the activity log', () => {
  const at = (s: Partial<Snapshot>): Snapshot => ({ view: 'room', radio: null, tv: null, clip: false, phone: false, tape: null, ...s });

  it('adds up time per view, station, channel, phone and tape', () => {
    const log = new ActivityLog();
    for (let i = 0; i < 30; i++) log.sample(at({ view: 'grabadora', radio: 'radioactiva', tape: 'rec' }), 1);
    for (let i = 0; i < 20; i++) log.sample(at({ tv: 9, clip: true }), 1);
    for (let i = 0; i < 10; i++) log.sample(at({ view: 'phone', tv: 7, phone: true }), 1);
    const f = log.fields();
    expect(f).toMatchObject({ s_total: 60, s_view_grabadora: 30, s_view_room: 20, s_view_phone: 10, s_radio_radioactiva: 30, s_tape_rec: 30, s_tv: 30, s_tv_clip: 20, s_phone: 10 });
    expect(f.tv_channels).toBe('9:20 7:10');
  });

  it('keeps calls, close-ups, the request and what happened', () => {
    const log = new ActivityLog();
    log.dialed('2859797');
    log.dialed('117');
    log.opened('phone');
    log.opened('phone');
    log.opened('tv');
    log.requested('florecita-rockera', 'angie');
    log.count('request_aired');
    log.reached6pm = true;
    expect(log.fields()).toMatchObject({ calls: '2859797 117', n_calls: 2, opens: 'phone:2 tv:1', request_song: 'florecita-rockera', request_dedication: 'angie', n_request: 1, n_request_aired: 1, reached_6pm: true });
  });
});
