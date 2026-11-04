// The hall's rules: who stands in it, what they wear, which show comes next.
// Events come in normalized (from TikTok or the simulator); everything the
// screens need goes out through `emit(type, data)`. The server owns this state,
// so the overlay can reload at any time.

import {
  LOOKS, ACCESSORIES, CASUAL, SKINS, HAIR_COLORS, HAIR_STYLES, COVER_CROWN, NO_JACKET, showDuration, lookById, findLook, SHOW,
} from '../public/js/catalog.js';

export const MAX_HALL = 24;
const BOARD_SIZE = 5;
const MAX_VIEWERS = 3000;
const SIM_BADGE_MS = 30_000;
const CHAT_EVICT_IDLE_MS = 45_000;
const FOLLOW_WAITING_MAX = 4; // new fans waiting to walk; beyond that a fan gets a piece at once
const FANS_KEPT = 50_000;

export const DEFAULT_SETTINGS = {
  brand: 'SẢNH THỜI TRANG',
  tagline: 'LIVE FASHION SHOW',
  mediumCoins: 10,
  largeCoins: 100,
  hallSize: MAX_HALL,
  likesForPose: 300,
  houseWalkSeconds: 50,
  pollSeconds: 45,
  followReward: 'show',
  followReminderMinutes: 5,
  tts: true,
  music: true,
  musicVolume: 0.35,
  sfxVolume: 0.8,
  voiceRate: 185,
  voiceVolume: 1,
  voiceEngine: 'vieneu',
  voiceName: 'Trúc Ly',
  legend: true,
  legendLines: [
    '💬 Bình luận để bước vào sảnh',
    '✨ Gõ phong cách: áo dài, vest, dạ hội…',
    '❤️ Thả tim: đủ tim cả sảnh tạo dáng',
    '🎁 Quà nhỏ thêm phụ kiện, quà lớn lên sàn diễn',
  ],
  camera: false,
  safeArea: false,
};

const RULES = {
  brand: ['text', 28],
  tagline: ['text', 36],
  mediumCoins: ['int', 1, 100_000],
  largeCoins: ['int', 2, 10_000_000],
  hallSize: ['int', 6, MAX_HALL],
  likesForPose: ['int', 10, 10_000_000],
  houseWalkSeconds: ['int', 0, 3600],
  pollSeconds: ['int', 10, 600],
  followReward: ['pick', ['show', 'item', 'off']],
  followReminderMinutes: ['int', 0, 60],
  tts: ['bool'],
  music: ['bool'],
  musicVolume: ['num', 0, 1],
  sfxVolume: ['num', 0, 1],
  voiceRate: ['int', 140, 240],
  voiceVolume: ['num', 0, 1],
  voiceEngine: ['pick', ['vieneu', 'mac']],
  voiceName: ['text', 40],
  legend: ['bool'],
  legendLines: ['lines', 5, 60],
  camera: ['bool'],
  safeArea: ['bool'],
};

// Bodies of the hall's own models, taken in turn.
const HOUSE_BODIES = [
  { skin: SKINS[1], hair: 'long', hairColor: HAIR_COLORS[0], flip: false },
  { skin: SKINS[3], hair: 'short', hairColor: HAIR_COLORS[1], flip: false },
  { skin: SKINS[0], hair: 'bun', hairColor: HAIR_COLORS[2], flip: false },
  { skin: SKINS[2], hair: 'waves', hairColor: HAIR_COLORS[4], flip: false },
];

const TIER_RANK = { house: 0, follow: 1, medium: 2, large: 3 };
// The queue's order: gifts in turn whatever their size, then new fans, then the hall's model.
const LANE = { house: 0, follow: 1, medium: 2, large: 2 };
const SHOW_LINE = { follow: 'followShow', medium: 'medium', large: 'large' };
const REMIND_LINE = { show: 'remindShow', item: 'remindItem', off: 'remindOff' };

// What the MC says, a few ways each so it does not sound like a loop.
// Priority 2 is never dropped when lines pile up; 1 may be.
const LINES = {
  greet: [1, ['Chào {name}!', 'Chào mừng {name} vào sảnh!', '{name} đến rồi, chào bạn nha!']],
  small: [1, ['Cảm ơn {name}, thêm {item} nè!', '{name} vừa có thêm {item}, xinh quá!', 'Cảm ơn {name} nha, {item} hợp lắm!']],
  follow: [1, ['Cảm ơn {name} đã theo dõi!', '{name} vừa theo dõi kênh, cảm ơn bạn nha!']],
  followItem: [1, ['Cảm ơn {name} đã theo dõi kênh, tặng bạn {item} nè!', '{name} vừa theo dõi kênh, thêm {item} cho bạn nha!']],
  followShow: [2, ['Cảm ơn {name} đã theo dõi kênh, mời bạn lên sàn với bộ {look}!', 'Fan mới {name} bước lên sàn diễn với bộ {look}!', 'Cảm ơn {name} đã theo dõi! Mời bạn lên sàn trong bộ {look}.']],
  remindShow: [1, ['Bạn nào chưa theo dõi kênh thì bấm theo dõi nha, được lên sàn diễn liền!', 'Bấm theo dõi kênh là được bước lên sàn diễn đó!']],
  remindItem: [1, ['Bạn nào chưa theo dõi kênh thì bấm theo dõi nha, có thêm phụ kiện liền!', 'Bấm theo dõi kênh là được thêm một món đồ xinh đó!']],
  remindOff: [1, ['Nhớ bấm theo dõi kênh để không bỏ lỡ buổi diễn sau nha!', 'Thích sảnh thì bấm theo dõi kênh nha!']],
  pose: [1, ['Cả sảnh, tạo dáng!', 'Ba, hai, một, tạo dáng nào!', 'Đèn flash đây, cả sảnh tạo dáng!']],
  medium: [2, ['Mời {name} bước lên sàn diễn với bộ {look}!', 'Sàn diễn xin mời {name}, trong bộ {look}!', 'Tiếp theo là {name} với bộ {look}, cả sảnh cổ vũ nào!']],
  large: [2, ['Xin một tràng pháo tay! {name} lên trang bìa với bộ {look}!', 'Ngôi sao đêm nay là {name}, lên trang bìa với bộ {look}!']],
  house: [2, ['Người mẫu của sảnh trình diễn bộ {look}.', 'Mời cả sảnh xem bộ {look}.', 'Bộ sưu tập tiếp theo: {look}.']],
  pollWon: [2, ['Bộ {look} thắng bình chọn, mời cả sảnh xem!']],
  pollOpen: [2, ['Bình chọn nào! Gõ một cho {a}, gõ hai cho {b}.']],
};

// A name as the MC reads it: letters, numbers and spaces only (no emoji,
// dots or underscores read aloud), capitals softened, at most four words.
export function speechName(value) {
  const words = String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .normalize('NFC')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((w) => (w.length > 1 && w === w.toUpperCase() ? w[0] + w.slice(1).toLowerCase() : w));
  return words.join(' ') || 'bạn';
}

// Text from a stranger: no control or direction characters, one line, at most `max` characters.
export function cleanText(value, max) {
  const text = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : text;
}

function safeAvatar(value) {
  return typeof value === 'string' && /^https:\/\/[^\s"'<>\\]{1,900}$/.test(value) ? value : null;
}

function hashOf(text) {
  let h = 2166136261;
  for (const ch of text) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The same person always looks the same: body and everyday clothes come from their id.
export function appearanceOf(id) {
  const random = seeded(hashOf(id));
  const pick = (list) => list[Math.floor(random() * list.length)];
  const piece = (options) => {
    const option = pick(options);
    return { style: option.style, color: pick(option.colors) };
  };
  const body = { skin: pick(SKINS), hair: pick(HAIR_STYLES), hairColor: pick(HAIR_COLORS), flip: random() < 0.5 };
  const look = { top: piece(CASUAL.top), bottom: piece(CASUAL.bottom), shoes: piece(CASUAL.shoes) };
  return { body, look };
}

// A look with one more piece. A hat and a piece worn in the hair take each other's place.
export function wear(look, item) {
  const next = { ...look, [item.slot]: { style: item.style, color: item.color, ...(item.color2 ? { color2: item.color2 } : {}) } };
  if (item.slot === 'hat') delete next.hair;
  if (item.slot === 'hair') delete next.hat;
  return next;
}

const name = (v) => ({ t: 'name', v });
const what = (v) => ({ t: 'what', v });
const text = (v) => ({ t: 'text', v });
const clampInt = (value, min, max, fallback) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function createGame({ emit = () => {}, speak = (line, priority) => emit('speak', { text: line, url: null, priority }), settings: saved = {}, random = Math.random } = {}) {
  const settings = structuredClone(DEFAULT_SETTINGS);
  const viewers = new Map();
  const spots = new Array(MAX_HALL).fill(null);
  const queue = [];
  const gates = new Map();
  const throttles = new Map();
  let current = null;
  let currentTimer = null;
  let nextTimer = null;
  let lastShowEnd = Date.now();
  let likes = { total: 0, sincePose: 0 };
  let poll = null;
  let pollTimer = null;
  let simulating = false;
  let simUntil = 0;
  let serial = 0;
  let houseTurn = 0;
  // Everyone who followed during this live: rewarded once, even if they unfollow and follow again.
  const fans = new Set();
  let lastReminder = Date.now();

  applySettings(saved, { quiet: true });
  // The hall's model first walks a few seconds after start, not a whole wait later.
  lastShowEnd = Date.now() - Math.max(0, settings.houseWalkSeconds * 1000 - 8000);

  // --- small helpers ---------------------------------------------------------

  // True at most once every `ms` for a key; for things worth dropping when frequent.
  function gate(key, ms) {
    const now = Date.now();
    if (now - (gates.get(key) ?? -Infinity) < ms) return false;
    gates.set(key, now);
    return true;
  }

  // Runs `fn` now, or once at the end of the wait, with the state of that moment.
  function throttled(key, ms, fn) {
    const t = throttles.get(key) ?? { last: -Infinity, timer: null };
    throttles.set(key, t);
    const now = Date.now();
    if (now - t.last >= ms) {
      t.last = now;
      fn();
    } else if (!t.timer) {
      t.timer = setTimeout(() => {
        t.timer = null;
        t.last = Date.now();
        fn();
      }, ms - (now - t.last));
    }
  }

  const lastLine = new Map();

  // One of the kind's lines, not the one said last time, with its blanks filled.
  function say(kind, vars = {}, ms = 0) {
    if (!settings.tts) return;
    if (ms && !gate(`say:${kind}`, ms)) return;
    const [priority, options] = LINES[kind];
    let index = Math.floor(random() * options.length);
    if (options.length > 1 && index === lastLine.get(kind)) index = (index + 1) % options.length;
    lastLine.set(kind, index);
    const filled = options[index].replace(/\{(\w+)\}/g, (_, key) => (key === 'name' ? speechName(vars.name) : vars[key] ?? ''));
    speak(filled, priority);
  }

  const dto = (v) => v && {
    id: v.id, name: v.name, avatar: v.avatar, body: v.body, look: v.look, wish: v.wish, points: v.points, fan: v.fan, sim: v.sim,
  };

  function tierOf(coins) {
    if (coins >= settings.largeCoins) return 'large';
    if (coins >= settings.mediumCoins) return 'medium';
    return 'small';
  }

  // --- settings --------------------------------------------------------------

  function applySettings(patch, { quiet = false } = {}) {
    for (const [key, value] of Object.entries(patch ?? {})) {
      const rule = RULES[key];
      if (!rule) continue;
      const [kind, a, b] = rule;
      if (kind === 'text') {
        const t = cleanText(value, a);
        if (t) settings[key] = t;
      } else if (kind === 'int' || kind === 'num') {
        const n = Number(value);
        if (Number.isFinite(n)) settings[key] = Math.min(b, Math.max(a, kind === 'int' ? Math.round(n) : n));
      } else if (kind === 'bool') {
        if (typeof value === 'boolean') settings[key] = value;
      } else if (kind === 'pick') {
        if (a.includes(value)) settings[key] = value;
      } else if (kind === 'lines' && Array.isArray(value)) {
        settings[key] = value.map((line) => cleanText(line, b)).filter(Boolean).slice(0, a);
      }
    }
    if (settings.largeCoins <= settings.mediumCoins) settings.largeCoins = settings.mediumCoins + 1;
    if (quiet) return;
    // A smaller hall: people past its end move into a free place if there is one.
    const busy = busyIds();
    for (let i = settings.hallSize; i < MAX_HALL; i += 1) {
      const v = viewers.get(spots[i]);
      if (!v || busy.has(v.id)) continue;
      leave(v);
      place(v, 'soft');
    }
    emit('settings', { ...settings });
    emitLikes();
  }

  // --- people ----------------------------------------------------------------

  function ensureViewer(user, sim) {
    const raw = cleanText(user?.id, 64);
    if (!raw) return null;
    const id = sim ? `sim:${raw}` : raw;
    const label = cleanText(user.name, 24) || 'Khách';
    const avatar = safeAvatar(user.avatar);
    let v = viewers.get(id);
    if (!v) {
      const { body, look } = appearanceOf(id);
      v = { id, name: label, avatar, sim, body, look, wish: null, points: 0, fan: fans.has(id), lastActive: Date.now(), spot: null, firstGift: 0 };
      viewers.set(id, v);
      prune();
    } else {
      v.name = label;
      if (avatar) v.avatar = avatar;
      v.lastActive = Date.now();
    }
    return v;
  }

  function busyIds() {
    return new Set([current?.viewerId, ...queue.map((s) => s.viewerId)].filter(Boolean));
  }

  function prune() {
    if (viewers.size <= MAX_VIEWERS) return;
    const busy = busyIds();
    const idle = [...viewers.values()]
      .filter((v) => v.spot === null && v.points === 0 && !busy.has(v.id))
      .sort((a, b) => a.lastActive - b.lastActive);
    for (const v of idle.slice(0, viewers.size - MAX_VIEWERS)) viewers.delete(v.id);
  }

  // mode 'soft': only into a free place. 'chat': may move out someone who gave
  // nothing and said nothing for a while. 'gift': may move out whoever gave less.
  function place(v, mode, { quiet = false } = {}) {
    if (v.spot !== null) return true;
    const free = [];
    for (let i = 0; i < settings.hallSize; i += 1) if (!spots[i]) free.push(i);
    let spot;
    if (free.length) {
      spot = free[Math.floor(random() * free.length)];
    } else {
      if (mode === 'soft') return false;
      const busy = busyIds();
      const now = Date.now();
      let out = null;
      for (let i = 0; i < settings.hallSize; i += 1) {
        const other = viewers.get(spots[i]);
        if (!other || other === v || busy.has(other.id)) continue;
        if (mode === 'chat' && (other.points > 0 || now - other.lastActive < CHAT_EVICT_IDLE_MS)) continue;
        if (mode === 'gift' && other.points >= v.points) continue;
        if (!out || other.points < out.points || (other.points === out.points && other.lastActive < out.lastActive)) out = other;
      }
      if (!out) return false;
      spot = out.spot;
      leave(out);
    }
    spots[spot] = v.id;
    v.spot = spot;
    if (!quiet) emit('hall:enter', { spot, viewer: dto(v) });
    return true;
  }

  function leave(v) {
    if (v.spot === null) return;
    const spot = v.spot;
    spots[spot] = null;
    v.spot = null;
    emit('hall:leave', { spot, id: v.id });
  }

  // Something they are not wearing yet, and nothing that would look wrong
  // (a jacket over a ball gown, a hair bow under a veil).
  function accessoryFor(v) {
    const options = ACCESSORIES.filter((a) => {
      const worn = v.look[a.slot];
      if (worn?.style === a.style && worn?.color === a.color) return false;
      if (a.slot === 'outer' && NO_JACKET.includes(v.look.dress?.style)) return false;
      if ((a.slot === 'hair' || a.slot === 'hat') && v.look.hair?.style === 'veil') return false;
      return true;
    });
    return options[Math.floor(random() * options.length)] ?? ACCESSORIES[0];
  }


  function randomLook(except) {
    const options = LOOKS.filter((l) => l.id !== except);
    return options[Math.floor(random() * options.length)];
  }

  // --- events ----------------------------------------------------------------

  function handle(event) {
    if (!event || typeof event !== 'object') return;
    const sim = event.simulated === true;
    if (sim) markSim();
    const v = event.user ? ensureViewer(event.user, sim) : null;
    if (!v) return;
    switch (event.kind) {
      case 'join': return onJoin(v);
      case 'chat': return onChat(v, event.text);
      case 'like': return onLike(v, event.count);
      case 'gift': return onGift(v, event);
      case 'follow': return onFollow(v);
      case 'share': return onShare(v);
      default:
    }
  }

  function onJoin(v) {
    if (gate('ticker', 1200)) emit('ticker', { parts: [name(v.name), text(' vừa vào xem')] });
  }

  function onChat(v, raw) {
    const said = cleanText(raw, 80);
    if (!said) return;
    const isNew = v.spot === null;
    place(v, 'chat');
    if (v.spot !== null) emit('say', { id: v.id, text: said });
    if (isNew && v.spot !== null) say('greet', { name: v.name }, 12_000);
    vote(v, said);
    const look = findLook(said);
    if (look && look.id !== v.wish) {
      v.wish = look.id;
      emit('wish', { id: v.id, lookId: look.id, name: look.name });
    }
  }

  function onLike(v, count) {
    const n = clampInt(count, 1, 1000, 1);
    likes.total += n;
    likes.sincePose += n;
    place(v, 'soft');
    if (v.spot !== null) emit('fx', { type: 'hearts', id: v.id, n: Math.min(n, 8) });
    if (likes.sincePose >= settings.likesForPose) {
      likes.sincePose = 0;
      poseAll(true);
    }
    throttled('likes', 300, emitLikes);
  }

  function onGift(v, event) {
    if (event.streaking) return; // a combo still going: counted once it ends
    const coins = clampInt(event.coins, 0, 1_000_000, 0) * clampInt(event.repeat, 1, 10_000, 1);
    if (coins <= 0) return;
    v.points += coins;
    if (!v.firstGift) v.firstGift = Date.now();
    throttled('board', 300, () => emit('board', board()));
    const gift = cleanText(event.giftName, 30) || 'quà';
    const tier = tierOf(coins);
    place(v, 'gift');
    if (tier === 'small') {
      const item = accessoryFor(v);
      v.look = wear(v.look, item);
      if (v.spot !== null) emit('hall:look', { id: v.id, look: v.look, item: item.name });
      emit('banner', { parts: [name(v.name), text(' tặng '), what(gift), text(` · thêm ${item.name}`)] });
      say('small', { name: v.name, item: item.name }, 7000);
    } else {
      const lookId = v.wish ?? randomLook(null).id;
      enqueueShow({ viewerId: v.id, tier, lookId, giftName: gift, coins });
      emit('banner', { parts: [name(v.name), text(' tặng '), what(gift), text(tier === 'large' ? ' · lên trang bìa!' : ' · chuẩn bị lên sàn diễn!')] });
    }
  }

  // A new fan walks the runway, or gets a piece (settings.followReward). When
  // many are already waiting, or their own show is coming, they get a piece or thanks.
  function onFollow(v) {
    v.fan = true;
    if (fans.has(v.id)) return;
    fans.add(v.id);
    if (fans.size > FANS_KEPT) fans.delete(fans.values().next().value);
    place(v, 'chat');
    emit('fx', { type: 'follow', id: v.id });
    const reward = settings.followReward;
    const busy = busyIds().has(v.id);
    const waiting = queue.filter((s) => s.tier === 'follow').length;
    const banner = (more) => {
      if (gate('follow-banner', 2500)) emit('banner', { parts: [name(v.name), text(` đã theo dõi kênh 💖${more}`)] });
    };
    if (reward === 'show' && !busy && waiting < FOLLOW_WAITING_MAX) {
      enqueueShow({ viewerId: v.id, tier: 'follow', lookId: v.wish ?? randomLook(null).id });
      banner(' · chuẩn bị lên sàn diễn!');
    } else if (reward !== 'off' && !busy) {
      const item = accessoryFor(v);
      v.look = wear(v.look, item);
      if (v.spot !== null) emit('hall:look', { id: v.id, look: v.look, item: item.name });
      banner(` · thêm ${item.name}`);
      say('followItem', { name: v.name, item: item.name }, 7000);
    } else {
      banner('');
      say('follow', { name: v.name }, 10_000);
    }
  }

  // The MC asks people to follow, and the screen says what following brings.
  function remind() {
    lastReminder = Date.now();
    emit('remind', { reward: settings.followReward });
    say(REMIND_LINE[settings.followReward]);
  }

  function onShare(v) {
    place(v, 'soft');
    emit('fx', { type: 'share', id: v.id });
    if (gate('share-banner', 2500)) emit('banner', { parts: [name(v.name), text(' đã chia sẻ sảnh ↗')] });
  }

  function poseAll(fromLikes) {
    emit('fx', { type: 'pose-all' });
    emit('banner', { parts: [text(fromLikes ? '📸 Đủ tim rồi! ' : '📸 '), what('Cả sảnh tạo dáng!')] });
    say('pose', {}, 6000);
  }

  // --- shows -----------------------------------------------------------------

  function enqueueShow({ viewerId = null, tier, lookId, giftName = null, coins = 0, reason = null }) {
    if (viewerId) {
      const queued = queue.find((s) => s.viewerId === viewerId);
      if (queued) {
        const lane = LANE[queued.tier];
        if (TIER_RANK[tier] > TIER_RANK[queued.tier]) queued.tier = tier;
        queued.coins += coins;
        queued.lookId = lookId ?? queued.lookId;
        queued.giftName = giftName ?? queued.giftName;
        // A new fan who then gives a gift moves up among the gifts.
        if (LANE[queued.tier] !== lane) {
          queue.splice(queue.indexOf(queued), 1);
          lineUp(queued);
        }
        return queued;
      }
    }
    const entry = { id: ++serial, viewerId, tier, lookId, giftName, coins, reason };
    if (viewerId) {
      lineUp(entry);
    } else {
      const at = queue.findIndex((s) => !s.viewerId);
      if (at !== -1) {
        if (reason !== 'poll') return null;
        queue[at] = entry;
      } else {
        queue.push(entry);
      }
    }
    startNext();
    return entry;
  }

  // A viewer's show waits behind the others of its lane, ahead of the lanes after it.
  function lineUp(entry) {
    const at = queue.findIndex((s) => LANE[s.tier] < LANE[entry.tier]);
    if (at === -1) queue.push(entry);
    else queue.splice(at, 0, entry);
  }

  function startNext() {
    if (current || nextTimer) return;
    const entry = queue.shift();
    if (!entry) return;
    const v = entry.viewerId ? viewers.get(entry.viewerId) : null;
    if (entry.viewerId && !v) {
      startNext();
      return;
    }
    const look = lookById(entry.lookId) ?? randomLook(null);
    const outfit = structuredClone(look.parts);
    // The cover star wears a crown, unless she is a bride in her veil.
    if (entry.tier === 'large' && outfit.hair?.style !== 'veil') {
      delete outfit.hat;
      outfit.hair = { ...COVER_CROWN };
    }
    let body;
    if (v) {
      v.look = outfit;
      v.wish = null;
      place(v, entry.tier === 'follow' ? 'chat' : 'gift', { quiet: true });
      body = v.body;
    } else {
      body = HOUSE_BODIES[houseTurn++ % HOUSE_BODIES.length];
    }
    current = { ...entry, lookId: look.id, lookName: look.name, startedAt: Date.now(), duration: showDuration(entry.tier) };
    emit('show:start', {
      id: current.id,
      tier: current.tier,
      reason: current.reason,
      viewer: v ? dto(v) : null,
      body,
      look: outfit,
      lookId: look.id,
      lookName: look.name,
      giftName: current.giftName,
      spot: v?.spot ?? null,
      duration: current.duration,
    });
    if (!v) say(entry.reason === 'poll' ? 'pollWon' : 'house', { look: look.name });
    else say(SHOW_LINE[entry.tier], { name: v.name, look: look.name });
    currentTimer = setTimeout(endShow, current.duration);
  }

  function endShow() {
    const done = current;
    current = null;
    currentTimer = null;
    lastShowEnd = Date.now();
    if (done) {
      const v = done.viewerId ? viewers.get(done.viewerId) : null;
      emit('show:end', { id: done.id, viewerId: done.viewerId, look: v?.look ?? null, spot: v?.spot ?? null });
    }
    nextTimer = setTimeout(() => {
      nextTimer = null;
      startNext();
    }, SHOW.gap);
  }

  function houseWalk() {
    return enqueueShow({ tier: 'house', lookId: randomLook(current?.lookId).id });
  }

  // --- poll ------------------------------------------------------------------

  function counts() {
    const c = [0, 0];
    for (const choice of poll.votes.values()) c[choice] += 1;
    return c;
  }

  function pollDto() {
    return poll && {
      id: poll.id,
      options: poll.options.map((id) => ({ id, name: lookById(id).name })),
      counts: counts(),
      endsAt: poll.endsAt,
      winner: poll.winner,
    };
  }

  const emitPoll = () => emit('poll', pollDto());

  function startPoll() {
    if (poll && poll.winner === null) return pollDto();
    clearTimeout(pollTimer);
    const a = randomLook(null);
    const b = randomLook(a.id);
    poll = { id: ++serial, options: [a.id, b.id], votes: new Map(), endsAt: Date.now() + settings.pollSeconds * 1000, winner: null };
    emitPoll();
    emit('banner', { parts: [text('Bình chọn: gõ '), what('1'), text(` cho ${a.name}, gõ `), what('2'), text(` cho ${b.name}`)] });
    say('pollOpen', { a: a.name, b: b.name });
    pollTimer = setTimeout(endPoll, settings.pollSeconds * 1000);
    return pollDto();
  }

  function vote(v, said) {
    if (!poll || poll.winner !== null) return;
    const m = /^\s*([12])(?![0-9])/.exec(said);
    if (!m) return;
    poll.votes.set(v.id, Number(m[1]) - 1);
    throttled('poll', 400, emitPoll);
  }

  function endPoll() {
    if (!poll || poll.winner !== null) return;
    clearTimeout(pollTimer);
    const c = counts();
    const winner = c[0] === c[1] ? Math.floor(random() * 2) : (c[0] > c[1] ? 0 : 1);
    poll.winner = winner;
    emitPoll();
    const look = lookById(poll.options[winner]);
    emit('banner', { parts: [text('Bình chọn xong: '), what(look.name), text(` thắng ${c[winner]}–${c[1 - winner]}`)] });
    enqueueShow({ tier: 'house', lookId: look.id, reason: 'poll' });
    const id = poll.id;
    pollTimer = setTimeout(() => {
      if (poll?.id === id) {
        poll = null;
        emitPoll();
      }
    }, 6000);
  }

  // --- board, likes, simulation ----------------------------------------------

  function board() {
    return [...viewers.values()]
      .filter((v) => v.points > 0)
      .sort((a, b) => b.points - a.points || a.firstGift - b.firstGift)
      .slice(0, BOARD_SIZE)
      .map((v) => ({ id: v.id, name: v.name, avatar: v.avatar, points: v.points, sim: v.sim }));
  }

  function likesDto() {
    return { total: likes.total, toPose: Math.max(0, settings.likesForPose - likes.sincePose), every: settings.likesForPose };
  }

  function emitLikes() {
    emit('likes', likesDto());
  }

  // The screen says GIẢ LẬP while the simulator runs, for a while after a test
  // button, and as long as anyone pretend is still in the hall or on the board.
  const simPresent = () => spots.some((id) => id?.startsWith('sim:')) || [...viewers.values()].some((v) => v.sim && v.points > 0);
  const simActive = () => simulating || Date.now() < simUntil || simPresent();
  let simShown = false;

  function syncSim() {
    const active = simActive();
    if (active !== simShown) {
      simShown = active;
      emit('sim', { active });
    }
  }

  function markSim() {
    simUntil = Date.now() + SIM_BADGE_MS;
    syncSim();
  }

  function setSimulating(on) {
    simulating = on;
    if (on) simUntil = Date.now() + SIM_BADGE_MS;
    syncSim();
  }

  // Everyone the simulator or the test buttons made goes: hall, queue and board.
  function clearSimulated() {
    for (const v of [...viewers.values()]) {
      if (!v.sim) continue;
      leave(v);
      viewers.delete(v.id);
    }
    for (let i = queue.length - 1; i >= 0; i -= 1) {
      if (queue[i].viewerId?.startsWith('sim:')) queue.splice(i, 1);
    }
    for (const id of fans) if (id.startsWith('sim:')) fans.delete(id);
    emit('board', board());
    simulating = false;
    simUntil = 0;
    syncSim();
  }

  // Every 2 s: the hall's model walks when nothing else has for a while, and
  // now and then the MC asks people to follow (not during a poll).
  const heartbeat = setInterval(() => {
    syncSim();
    const every = settings.houseWalkSeconds * 1000;
    if (every > 0 && !current && !nextTimer && queue.length === 0 && !poll && Date.now() - lastShowEnd >= every) houseWalk();
    const remindEvery = settings.followReminderMinutes * 60_000;
    if (remindEvery > 0 && !poll && Date.now() - lastReminder >= remindEvery) remind();
  }, 2000);
  heartbeat.unref?.();

  // --- what the host's buttons do ---------------------------------------------

  function command(name) {
    switch (name) {
      case 'pose-all': poseAll(false); return true;
      case 'house-walk': return Boolean(houseWalk());
      case 'poll-start': startPoll(); return true;
      case 'poll-end': endPoll(); return true;
      case 'remind-follow': remind(); return true;
      case 'clear-hall': {
        const busy = busyIds();
        for (const v of viewers.values()) if (!busy.has(v.id)) leave(v);
        return true;
      }
      case 'reset-board':
        for (const v of viewers.values()) {
          v.points = 0;
          v.firstGift = 0;
        }
        emit('board', board());
        return true;
      case 'clear-sim': clearSimulated(); return true;
      default: return false;
    }
  }

  function snapshot() {
    return {
      settings: { ...settings },
      hall: spots.slice(0, settings.hallSize).map((id) => dto(viewers.get(id) ?? null)),
      board: board(),
      likes: likesDto(),
      poll: pollDto(),
      queue: queue.length,
      showing: current ? { id: current.id, tier: current.tier, viewerId: current.viewerId, lookName: current.lookName } : null,
      sim: { active: simActive() },
    };
  }

  function stop() {
    clearInterval(heartbeat);
    clearTimeout(currentTimer);
    clearTimeout(nextTimer);
    clearTimeout(pollTimer);
    for (const t of throttles.values()) clearTimeout(t.timer);
  }

  return {
    handle, command, snapshot, stop, setSimulating, clearSimulated,
    applySettings: (patch) => applySettings(patch),
    get settings() { return { ...settings }; },
  };
}
