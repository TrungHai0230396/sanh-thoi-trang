import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, cleanText, appearanceOf, speechName, wear, DEFAULT_SETTINGS } from '../src/game.js';
import { findLook, fold, showDuration, SHOW, LOOKS, ACCESSORIES } from '../public/js/catalog.js';
import { figureSVG, STYLES } from '../public/js/figure.js';

// A game on mocked time, with a repeatable "random" and every message kept.
function setup(t, settings = {}) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 1_000_000 });
  const events = [];
  const spoken = [];
  const priorities = [];
  let seed = 7;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const game = createGame({
    emit: (type, data) => events.push({ type, data }),
    speak: (line, priority) => {
      spoken.push(line);
      priorities.push(priority);
    },
    settings: { houseWalkSeconds: 0, ...settings },
    random,
  });
  t.after(() => game.stop());
  const of = (type) => events.filter((e) => e.type === type).map((e) => e.data);
  const user = (id, name = id) => ({ id, name });
  // In small steps: one long tick fires an interval only once.
  const tick = (ms) => {
    for (let left = ms; left > 0; left -= 500) t.mock.timers.tick(Math.min(500, left));
  };
  return { game, events, spoken, priorities, of, user, tick };
}

test('a comment asks for a look by its words, accents or not, whole words only', () => {
  assert.equal(findLook('Cho xem ÁO DÀI đi')?.id, 'ao-dai');
  assert.equal(findLook('ao dai di chi oi')?.id, 'ao-dai');
  assert.equal(findLook('vest!!')?.id, 'vest');
  assert.equal(findLook('mặc đồ đi biển nè')?.id, 'he');
  assert.equal(findLook('không biết nữa'), null); // "khong" is not "hong"
  assert.equal(findLook('trang phục đẹp'), null);
  assert.equal(fold('Đầm Dạ Hội!'), 'dam da hoi');
});

test('text from a stranger loses control and direction characters and is cut short', () => {
  assert.equal(cleanText('  Mai‮ Anh\u0007 \n ', 24), 'Mai Anh');
  assert.equal(cleanText('a'.repeat(30), 10), `${'a'.repeat(9)}…`);
  assert.equal(cleanText(null, 5), '');
});

test('the same person always looks the same', () => {
  assert.deepEqual(appearanceOf('mai'), appearanceOf('mai'));
  const { look } = appearanceOf('huy');
  assert.ok(look.top.style && look.bottom.style && look.shoes.style);
});

test('a comment brings someone into the hall once, with their words', (t) => {
  const { game, of, user, spoken } = setup(t);
  game.handle({ kind: 'chat', user: user('mai', 'Mai'), text: 'Xin chào' });
  game.handle({ kind: 'chat', user: user('mai', 'Mai'), text: 'Đẹp quá' });
  assert.equal(of('hall:enter').length, 1);
  assert.deepEqual(of('say').map((s) => s.text), ['Xin chào', 'Đẹp quá']);
  assert.equal(spoken.length, 1);
  assert.match(spoken[0], /Mai/);
});

test('a small gift adds a piece; the board counts every coin of a combo once', (t) => {
  const { game, of, user } = setup(t);
  const mai = user('mai', 'Mai');
  game.handle({ kind: 'gift', user: mai, giftName: 'Hoa hồng', coins: 1, repeat: 2, streaking: true });
  game.handle({ kind: 'gift', user: mai, giftName: 'Hoa hồng', coins: 1, repeat: 5, streaking: true });
  assert.equal(of('hall:look').length, 0);
  game.handle({ kind: 'gift', user: mai, giftName: 'Hoa hồng', coins: 1, repeat: 5 });
  assert.equal(of('hall:look').length, 1);
  assert.equal(of('show:start').length, 0);
  assert.equal(game.snapshot().board[0].points, 5);
});

test('a medium gift sends the giver down the runway in the look they asked for', (t) => {
  const { game, of, user, spoken, priorities } = setup(t);
  game.handle({ kind: 'chat', user: user('mai', 'Mai'), text: 'cho mình mặc áo dài nha' });
  game.handle({ kind: 'gift', user: user('mai', 'Mai'), giftName: 'Donut', coins: 30 });
  const [show] = of('show:start');
  assert.equal(show.tier, 'medium');
  assert.equal(show.lookId, 'ao-dai');
  assert.equal(show.viewer.name, 'Mai');
  assert.ok(show.spot !== null);
  const line = spoken.at(-1);
  assert.ok(line.includes('Mai') && line.includes('Áo dài đỏ'), line);
  assert.equal(priorities.at(-1), 2); // a show's line is never dropped
  assert.equal(priorities[0], 1); // a greeting may be
  assert.equal(game.snapshot().hall[show.spot].look.dress.style, 'aodai');
});

test('tiers follow the settings', (t) => {
  const { game, of, user } = setup(t, { mediumCoins: 50, largeCoins: 500 });
  game.handle({ kind: 'gift', user: user('a'), coins: 30 });
  assert.equal(of('show:start').length, 0);
  game.handle({ kind: 'gift', user: user('b'), coins: 500 });
  assert.equal(of('show:start')[0].tier, 'large');
});

test('shows take turns; a second gift from someone waiting makes their show bigger', (t) => {
  const { game, of, user, tick } = setup(t);
  game.handle({ kind: 'gift', user: user('a'), coins: 30 });
  game.handle({ kind: 'gift', user: user('b'), coins: 30 });
  game.handle({ kind: 'gift', user: user('b'), coins: 200 });
  assert.equal(of('show:start').length, 1);
  assert.equal(game.snapshot().queue, 1);
  tick(showDuration('medium'));
  assert.equal(of('show:end').length, 1);
  tick(SHOW.gap);
  const second = of('show:start')[1];
  assert.equal(second.viewer.id, 'b');
  assert.equal(second.tier, 'large');
  assert.equal(game.snapshot().queue, 0);
});

test("the hall's own model walks when nothing else has, after viewers' shows", (t) => {
  const { game, of, user, tick } = setup(t, { houseWalkSeconds: 30 });
  tick(10_000);
  assert.equal(of('show:start')[0].viewer, null);
  game.handle({ kind: 'gift', user: user('a'), coins: 30 });
  assert.equal(game.command('house-walk'), true);
  assert.equal(game.command('house-walk'), false); // one waiting at a time
  tick(showDuration('house') + SHOW.gap);
  assert.equal(of('show:start')[1].viewer.id, 'a');
});

test('a full hall: chatters wait for someone idle, gifters move out whoever gave less', (t) => {
  const { game, of, user, tick } = setup(t, { hallSize: 6 });
  for (let i = 1; i <= 6; i += 1) game.handle({ kind: 'chat', user: user(`p${i}`), text: 'hi' });
  game.handle({ kind: 'gift', user: user('p1'), coins: 1 }); // p1 now gave something
  game.handle({ kind: 'chat', user: user('late'), text: 'hi' });
  assert.equal(of('hall:enter').length, 6);
  tick(46_000);
  game.handle({ kind: 'chat', user: user('late'), text: 'hi again' });
  assert.equal(of('hall:enter').length, 7);
  const out = of('hall:leave')[0].id;
  assert.notEqual(out, 'p1');
  game.handle({ kind: 'gift', user: user('rich'), coins: 5 });
  assert.equal(of('hall:enter').length, 8);
  const hall = game.snapshot().hall.map((v) => v?.id);
  assert.ok(hall.includes('p1') && hall.includes('rich') && hall.includes('late'));
});

test('a new fan walks the runway once, however often they follow again', (t) => {
  const { game, of, user, spoken, priorities, tick } = setup(t);
  game.handle({ kind: 'chat', user: user('lan', 'Lan'), text: 'vest nha' });
  game.handle({ kind: 'follow', user: user('lan', 'Lan') });
  const [show] = of('show:start');
  assert.equal(show.tier, 'follow');
  assert.equal(show.viewer.id, 'lan');
  assert.equal(show.viewer.fan, true);
  assert.equal(show.lookId, 'vest', 'in the look they asked for');
  assert.ok(spoken.at(-1).includes('Lan') && spoken.at(-1).includes(show.lookName), spoken.at(-1));
  assert.equal(priorities.at(-1), 2);
  tick(showDuration('follow') + SHOW.gap);
  game.handle({ kind: 'follow', user: user('lan', 'Lan') }); // unfollowed and followed again
  assert.equal(of('show:start').length, 1);
  assert.equal(game.snapshot().queue, 0);
  assert.equal(game.snapshot().hall.find((v) => v?.id === 'lan').fan, true);
});

test('gifts walk before new fans; past four fans waiting, a fan gets a piece instead', (t) => {
  const { game, of, user, tick } = setup(t);
  game.handle({ kind: 'gift', user: user('a'), coins: 30 }); // walking now
  for (let i = 1; i <= 5; i += 1) game.handle({ kind: 'follow', user: user(`f${i}`) });
  assert.equal(game.snapshot().queue, 4);
  assert.deepEqual(of('hall:look').map((l) => l.id), ['f5']);
  game.handle({ kind: 'gift', user: user('b'), coins: 30 });
  game.handle({ kind: 'gift', user: user('f3'), coins: 30 }); // a waiting fan who gives moves up among the gifts
  tick(80_000);
  const shows = of('show:start');
  assert.deepEqual(shows.map((s) => s.viewer?.id), ['a', 'b', 'f3', 'f1', 'f2', 'f4']);
  assert.deepEqual(shows.map((s) => s.tier), ['medium', 'medium', 'medium', 'follow', 'follow', 'follow']);
});

test('a follow brings a piece, or only thanks, as the settings say', (t) => {
  const { game, of, user, spoken, tick } = setup(t, { followReward: 'item' });
  game.handle({ kind: 'follow', user: user('a', 'An') });
  assert.equal(of('show:start').length, 0);
  assert.equal(of('hall:look').length, 1);
  assert.match(spoken.at(-1), /An/);
  tick(3000); // follows close together share one banner
  game.applySettings({ followReward: 'off' });
  game.handle({ kind: 'follow', user: user('b', 'Bình') });
  assert.equal(of('hall:look').length, 1);
  assert.equal(of('show:start').length, 0);
  assert.match(spoken.at(-1), /Bình/);
  assert.match(of('banner').at(-1).parts.map((p) => p.v).join(''), /Bình đã theo dõi kênh/);
});

test('now and then the MC asks people to follow, but not while they vote', (t) => {
  const { game, of, spoken, tick } = setup(t, { followReminderMinutes: 2, pollSeconds: 600 });
  tick(118_000);
  assert.equal(of('remind').length, 0);
  tick(4000);
  assert.deepEqual(of('remind'), [{ reward: 'show' }]);
  assert.match(spoken.at(-1), /theo dõi/);
  game.command('poll-start');
  tick(200_000);
  assert.equal(of('remind').length, 1, 'not during a poll');
  game.applySettings({ followReminderMinutes: 0 });
  game.command('poll-end');
  tick(400_000);
  assert.equal(of('remind').length, 1, 'switched off');
  assert.equal(game.command('remind-follow'), true, 'the host can still ask');
  assert.equal(of('remind').length, 2);
});

test('a poll counts one vote a viewer and the winning look walks', (t) => {
  const { game, of, user, tick } = setup(t, { pollSeconds: 30 });
  game.command('poll-start');
  const [opened] = of('poll');
  game.handle({ kind: 'chat', user: user('a'), text: '1' });
  game.handle({ kind: 'chat', user: user('b'), text: '2 nha' });
  game.handle({ kind: 'chat', user: user('c'), text: '2' });
  game.handle({ kind: 'chat', user: user('a'), text: '2' }); // changed their mind
  game.handle({ kind: 'chat', user: user('d'), text: '12 người đẹp' }); // not a vote
  tick(30_000);
  const closed = of('poll').at(-1);
  assert.deepEqual(closed.counts, [0, 3]);
  assert.equal(closed.winner, 1);
  const show = of('show:start').at(-1);
  assert.equal(show.reason, 'poll');
  assert.equal(show.lookId, opened.options[1].id);
  tick(6000);
  assert.equal(of('poll').at(-1), null);
});

test('enough hearts make the whole hall pose, then the count starts again', (t) => {
  const { game, of, user } = setup(t, { likesForPose: 50 });
  game.handle({ kind: 'like', user: user('a'), count: 30 });
  game.handle({ kind: 'like', user: user('b'), count: 25 });
  assert.equal(of('fx').filter((f) => f.type === 'pose-all').length, 1);
  assert.equal(game.snapshot().likes.toPose, 50);
  assert.equal(game.snapshot().likes.total, 55);
});

test('pretend viewers are marked, kept apart, and leave together', (t) => {
  const { game, of, user, tick } = setup(t);
  game.handle({ kind: 'chat', user: user('mai'), text: 'thật' });
  game.handle({ kind: 'chat', user: user('mai'), text: 'giả', simulated: true });
  game.handle({ kind: 'gift', user: user('huy'), coins: 5, simulated: true });
  assert.equal(of('sim').at(-1).active, true);
  const ids = game.snapshot().hall.filter(Boolean).map((v) => v.id).sort();
  assert.deepEqual(ids, ['mai', 'sim:huy', 'sim:mai']);
  tick(40_000);
  assert.equal(game.snapshot().sim.active, true); // pretend people still in the hall
  game.clearSimulated();
  assert.deepEqual(game.snapshot().hall.filter(Boolean).map((v) => v.id), ['mai']);
  assert.deepEqual(game.snapshot().board, []);
  assert.equal(game.snapshot().sim.active, false);
});

test('settings are checked: text trimmed, numbers kept in range, unknown keys ignored', (t) => {
  const { game, of, user } = setup(t);
  for (let i = 0; i < 10; i += 1) game.handle({ kind: 'chat', user: user(`p${i}`), text: 'hi' });
  game.applySettings({ brand: '  Sảnh của Linh  ', mediumCoins: 80, largeCoins: 20, hallSize: 2, likesForPose: -5, evil: 1, tts: 'yes', voiceEngine: 'robot' });
  const s = game.settings;
  assert.equal(s.voiceEngine, 'vieneu', 'only a known voice engine is taken');
  game.applySettings({ followReward: 'nope', followReminderMinutes: 999 });
  assert.equal(game.settings.followReward, 'show');
  assert.equal(game.settings.followReminderMinutes, 60);
  game.applySettings({ voiceEngine: 'mac', voiceName: '  Ngọc Huyền ' });
  assert.equal(game.settings.voiceEngine, 'mac');
  assert.equal(game.settings.voiceName, 'Ngọc Huyền');
  assert.equal(s.brand, 'Sảnh của Linh');
  assert.equal(s.mediumCoins, 80);
  assert.equal(s.largeCoins, 81);
  assert.equal(s.hallSize, 6);
  assert.equal(s.likesForPose, 10);
  assert.equal(s.tts, DEFAULT_SETTINGS.tts);
  assert.equal('evil' in s, false);
  // A smaller hall keeps as many as fit: those past the new size move into free places first.
  assert.equal(game.snapshot().hall.length, 6);
  assert.equal(game.snapshot().hall.filter(Boolean).length, 6);
  assert.ok(of('hall:leave').length >= 4);
});

test('a figure takes only catalog styles and hex colours', () => {
  const svg = figureSVG({ skin: 'red" onload="x' }, { top: { style: 'tee', color: '#fff" onclick="x' }, hat: { style: '<script>' } });
  assert.equal(svg.includes('onload'), false);
  assert.equal(svg.includes('onclick'), false);
  assert.equal(svg.includes('script'), false);
  for (const look of LOOKS) assert.match(figureSVG({}, look.parts), /<\/svg>$/);
});

test('every look and every small-gift piece is something the figure can draw', () => {
  const seen = new Map();
  for (const look of LOOKS) {
    for (const [slot, part] of Object.entries(look.parts)) {
      assert.ok(STYLES[slot]?.includes(part.style), `${look.id}: ${slot} ${part.style}`);
      if (part.pattern) assert.ok(STYLES.pattern.includes(part.pattern), `${look.id}: ${part.pattern}`);
    }
    for (const kw of look.keywords) {
      assert.equal(kw, fold(kw), `${look.id}: keyword "${kw}" must be folded`);
      assert.equal(seen.get(kw), undefined, `"${kw}" is in ${seen.get(kw)} and ${look.id}`);
      seen.set(kw, look.id);
    }
  }
  for (const item of ACCESSORIES) assert.ok(STYLES[item.slot]?.includes(item.style), `${item.name}: ${item.slot} ${item.style}`);
  assert.ok(LOOKS.length >= 25);
});

test('the most precise look wins: "áo dài trắng" is not just "áo dài"', () => {
  assert.equal(findLook('cho xem áo dài trắng nha')?.id, 'ao-dai-trang');
  assert.equal(findLook('áo dài đi')?.id, 'ao-dai');
  assert.equal(findLook('đầm đen đi')?.id, 'den');
  assert.equal(findLook('đầm đi')?.id, 'da-hoi');
  assert.equal(findLook('váy cưới!!')?.id, 'cuoi');
});

test('the MC reads names without emoji, dots or shouting', () => {
  assert.equal(speechName('🌸Bé Na🌸'), 'Bé Na');
  assert.equal(speechName('mai.anh_99'), 'mai anh 99');
  assert.equal(speechName('RICHARD NGUYỄN'), 'Richard Nguyễn');
  assert.equal(speechName('<b>Huy</b>'), 'Huy');
  assert.equal(speechName('✨✨'), 'bạn');
});

test('the MC does not say the same line twice in a row', (t) => {
  const { game, user, spoken, tick } = setup(t, { followReward: 'off' });
  for (let i = 0; i < 4; i += 1) {
    game.handle({ kind: 'follow', user: user(`f${i}`, 'Lan') });
    tick(11_000);
  }
  assert.equal(spoken.length, 4);
  for (let i = 1; i < spoken.length; i += 1) assert.notEqual(spoken[i], spoken[i - 1]);
});

test('a hat and a piece worn in the hair take each other\'s place', () => {
  const tiara = { slot: 'hair', style: 'tiara', color: '#ffffff' };
  const cap = { slot: 'hat', style: 'cap', color: '#ff0000' };
  const withTiara = wear({ top: { style: 'tee', color: '#000000' } }, tiara);
  assert.equal(withTiara.hair.style, 'tiara');
  const withCap = wear(withTiara, cap);
  assert.equal(withCap.hat.style, 'cap');
  assert.equal('hair' in withCap, false);
  assert.equal('hat' in wear(withCap, tiara), false);
});

test('the cover star wears a crown, a bride keeps her veil', (t) => {
  const { game, of, user, tick } = setup(t);
  game.handle({ kind: 'chat', user: user('a'), text: 'áo dài đỏ nha' });
  game.handle({ kind: 'gift', user: user('a'), coins: 500 });
  const first = of('show:start')[0];
  assert.equal(first.look.hair.style, 'crown');
  assert.equal('hat' in first.look, false); // the nón lá makes way
  tick(showDuration('large') + SHOW.gap);
  game.handle({ kind: 'chat', user: user('b'), text: 'váy cưới' });
  game.handle({ kind: 'gift', user: user('b'), coins: 500 });
  tick(SHOW.gap);
  assert.equal(of('show:start').at(-1).look.hair.style, 'veil');
});
