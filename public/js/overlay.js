// The live screen. It draws what the server says (people, shows, cards) and keeps
// nothing of its own, so a reload, or OBS refreshing the source, comes back to the
// same hall. User text only ever goes in through textContent.

import { figureSVG } from './figure.js';
import { SHOW } from './catalog.js';
import { createFx } from './fx.js';
import { createSfx } from './sfx.js';

const W = 1080;
const H = 1920;
const FIG_H = 624;
const HEAD = 0.93; // where a figure's head ends, as a share of its height
const FLOOR_TOP = 640;
const DOOR = { x: 540, y: 648, s: 0.19 }; // as tall as the door
const FRONT = { x: 540, y: 1352 };
const ROWS = [884, 990, 1104, 1226];
const QUIET_MS = 20_000; // a name folds to its picture after this long without a word
const REST_MS = 8000; // between events, the banner's own lines take turns this long

// What following brings, as the banner and the guide card say it ("Follow" is TikTok's button).
const FOLLOW_CALL = {
  show: [{ t: 'text', v: '➕ Bấm ' }, { t: 'what', v: 'Follow kênh' }, { t: 'text', v: ': được lên sàn diễn liền!' }],
  item: [{ t: 'text', v: '➕ Bấm ' }, { t: 'what', v: 'Follow kênh' }, { t: 'text', v: ': được thêm một món đồ!' }],
  off: [{ t: 'text', v: '➕ Nhớ bấm ' }, { t: 'what', v: 'Follow kênh' }, { t: 'text', v: ' để xem buổi diễn sau!' }],
};
const FOLLOW_LEGEND = { show: '➕ Follow kênh: được lên sàn diễn', item: '➕ Follow kênh: thêm một món đồ' };

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const stage = $('stage');
const crowd = $('crowd');
const walkers = $('walkers');
const fx = createFx($('fx'));
const sfx = createSfx({ muted: params.has('muted') });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const number = (n) => Number(n || 0).toLocaleString('vi-VN');

// Perspective: the further up the floor, the smaller and the narrower.
const depth = (y) => (y - FLOOR_TOP) / (H - FLOOR_TOP);
const runwayHalf = (y) => 64 + depth(y) * 226;
const scaleAt = (y) => 0.26 + depth(y) * 0.95;

// 24 places beside the runway: four rows, three a side, every other row shifted
// half a place (like bricks) so names do not stack.
const SPOTS = [];
ROWS.forEach((y, row) => {
  const inner = runwayHalf(y) + 52;
  const outer = 446;
  const s = scaleAt(y) * 0.9;
  for (const share of row % 2 ? [0.24, 0.66, 1] : [0, 0.44, 0.86]) {
    const d = inner + (outer - inner) * share;
    SPOTS.push({ x: W / 2 - d, y, s }, { x: W / 2 + d, y, s });
  }
});

let settings = null;
const people = new Map(); // viewer id -> { el, fig, tag, spot, viewer }
let show = null; // the show being drawn: { token, data, walker }
let showToken = 0;
let bannerTimer = null;
let resting = false; // the banner shows its own lines, not an event's
let restTurn = 0;
let tickerTimer = null;
let pollTimer = null;
let currentPoll = null;

// The window's own size: on a phone, innerWidth grows to the 1080 px stage.
function fit() {
  const { clientWidth: vw, clientHeight: vh } = document.documentElement;
  const s = Math.min(vw / W, vh / H);
  stage.style.transform = `translate(${(vw - W * s) / 2}px, ${(vh - H * s) / 2}px) scale(${s})`;
}

function buildRunway() {
  const corners = [[FLOOR_TOP, -1], [FLOOR_TOP, 1], [H, 1], [H, -1]]
    .map(([y, side]) => `${W / 2 + side * runwayHalf(y)}px ${y}px`);
  $('runway').style.clipPath = `polygon(${corners.join(', ')})`;
  const lights = $('runway-lights');
  for (let i = 0; i <= 20; i += 1) {
    const y = FLOOR_TOP + (H - FLOOR_TOP) * (i / 20) ** 1.25;
    for (const side of [-1, 1]) {
      const dot = document.createElement('i');
      dot.style.left = `${W / 2 + side * (runwayHalf(y) + 3)}px`;
      dot.style.top = `${y}px`;
      dot.style.scale = String(0.5 + depth(y) * 1.1);
      dot.style.animationDelay = `${(-i * 0.08).toFixed(2)}s`;
      lights.append(dot);
    }
  }
}

// --- people ---------------------------------------------------------------

const hue = (id) => [...String(id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

function avatarEl(viewer) {
  const initial = () => {
    const el = document.createElement('span');
    el.className = 'avatar';
    el.textContent = (Array.from(viewer.name.trim())[0] ?? '?').toUpperCase();
    el.style.background = `hsl(${hue(viewer.id)} 70% 52%)`;
    return el;
  };
  if (typeof viewer.avatar !== 'string' || !viewer.avatar.startsWith('https://')) return initial();
  const img = document.createElement('img');
  img.className = 'avatar';
  img.alt = '';
  img.referrerPolicy = 'no-referrer';
  img.src = viewer.avatar;
  img.addEventListener('error', () => img.replaceWith(initial()), { once: true });
  return img;
}

const figTransform = (s) => `translate(-100px, -624px) scale(${s})`;

function figureEl(body, look, extra) {
  const fig = document.createElement('div');
  fig.className = `fig ${extra}${body?.flip ? ' flip' : ''}`;
  fig.innerHTML = figureSVG(body, look);
  return fig;
}

function addPerson(index, viewer, { arriving = false, hidden = false } = {}) {
  removePerson(viewer.id, false);
  const spot = SPOTS[index];
  if (!spot) return null;
  const el = document.createElement('div');
  el.className = 'person';
  el.style.left = `${spot.x}px`;
  el.style.top = `${spot.y}px`;
  el.style.zIndex = String(spot.y);
  el.style.fontSize = `${Math.round(10 + spot.s * 18)}px`;
  el.style.setProperty('--h', `${Math.round(FIG_H * spot.s * HEAD)}px`);
  // Name and bubble lean inward near the screen's edges, so they stay whole.
  const lean = spot.x < 200 ? 18 : spot.x > W - 200 ? 82 : 50;
  el.style.setProperty('--ax', `-${lean}%`);
  el.style.setProperty('--tip', `${lean}%`);
  const fig = figureEl(viewer.body, viewer.look, 'idle');
  fig.style.setProperty('--d', `${(-Math.random() * 3.6).toFixed(2)}s`);
  fig.style.transform = figTransform(spot.s);
  const tag = document.createElement('div');
  tag.className = 'tag';
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = viewer.name;
  tag.append(avatarEl(viewer), name);
  tag.classList.toggle('gifter', viewer.points > 0);
  tag.classList.toggle('fan', Boolean(viewer.fan));
  tag.classList.toggle('wishing', Boolean(viewer.wish));
  el.append(fig, tag);
  el.classList.toggle('arriving', arriving);
  el.classList.toggle('hidden', hidden);
  crowd.append(el);
  const person = { el, fig, tag, spot: index, viewer: { ...viewer }, quietTimer: null };
  people.set(viewer.id, person);
  touch(person);
  return person;
}

function touch(person) {
  if (!person) return;
  person.tag.classList.remove('quiet');
  clearTimeout(person.quietTimer);
  person.quietTimer = setTimeout(() => person.tag.classList.add('quiet'), QUIET_MS);
}

function removePerson(id, animate = true) {
  const person = people.get(id);
  if (!person) return;
  people.delete(id);
  if (!animate || person.el.classList.contains('hidden')) {
    person.el.remove();
    return;
  }
  person.el.classList.remove('arriving');
  person.el.classList.add('leaving');
  setTimeout(() => person.el.remove(), 520);
}

function dress(person, look) {
  person.viewer.look = look;
  person.fig.innerHTML = figureSVG(person.viewer.body, look);
}

function chestOf(person) {
  const spot = SPOTS[person.spot];
  return { x: spot.x, y: spot.y - FIG_H * spot.s * 0.55 };
}

function bubble(person, text, kind = '') {
  if (!person || person.el.classList.contains('hidden')) return;
  touch(person);
  person.el.querySelector('.bubble')?.remove();
  const el = document.createElement('div');
  el.className = `bubble ${kind}`.trim();
  el.textContent = text;
  person.el.append(el);
  setTimeout(() => el.remove(), 5100);
}

function flashes(n) {
  for (let i = 0; i < n; i += 1) {
    setTimeout(() => {
      const spot = pick(SPOTS);
      fx.flash(spot.x + (Math.random() - 0.5) * 60, spot.y - FIG_H * spot.s * 0.7, 70 + Math.random() * 60);
      if (i % 2 === 0) sfx.shutter();
    }, i * 140 + Math.random() * 90);
  }
}

// --- shows ----------------------------------------------------------------

function move(walker, fig, from, to, duration, easing, fade = false) {
  const frames = [
    { transform: `translate(${from.x}px, ${from.y}px)`, opacity: 1 },
    { transform: `translate(${to.x}px, ${to.y}px)`, opacity: fade ? 0 : 1 },
  ];
  const size = [{ transform: figTransform(from.s ?? scaleAt(from.y)) }, { transform: figTransform(to.s ?? scaleAt(to.y)) }];
  const options = { duration, easing, fill: 'forwards' };
  return Promise.all([walker.animate(frames, options).finished, fig.animate(size, options).finished]).catch(() => {});
}

function nameCard(data) {
  const house = !data.viewer;
  const fan = data.tier === 'follow';
  $('nc-kicker').textContent = house
    ? (data.reason === 'poll' ? 'BỘ THẮNG BÌNH CHỌN' : 'NGƯỜI MẪU CỦA SẢNH')
    : (data.tier === 'large' ? 'NGÔI SAO ĐÊM NAY' : fan ? 'FAN MỚI CỦA KÊNH' : 'MỜI LÊN SÀN DIỄN');
  $('nc-name').textContent = house ? data.lookName : data.viewer.name;
  $('nc-look').textContent = house ? '' : `Bộ: ${data.lookName}`;
  $('nc-gift').textContent = house
    ? (data.reason === 'poll' ? 'Cảm ơn cả sảnh đã bình chọn' : 'Gõ tên bộ bạn thích, lên sàn sẽ được mặc')
    : (data.giftName ? `đã tặng ${data.giftName}` : fan ? 'vừa theo dõi kênh 💖' : '');
  $('namecard').hidden = false;
}

function cover(data) {
  const now = new Date();
  $('cover-mast').textContent = (settings?.brand ?? 'SẢNH').split(/\s+/)[0];
  $('cover-issue').textContent = `SỐ ĐẶC BIỆT · ${now.toLocaleDateString('vi-VN')}`;
  $('cover-name').textContent = data.viewer?.name ?? '';
  $('cover-look').textContent = data.lookName;
  $('cover').hidden = false;
  const white = $('whiteout');
  white.classList.remove('flash');
  void white.offsetWidth;
  white.classList.add('flash');
}

function endShowNow() {
  if (!show) return;
  show.walker.remove();
  const person = show.data.viewer ? people.get(show.data.viewer.id) : null;
  if (person) person.el.classList.remove('hidden');
  show = null;
  $('namecard').hidden = true;
  $('cover').hidden = true;
  $('door').classList.remove('open');
  stage.classList.remove('dim');
}

async function runShow(data) {
  endShowNow();
  const token = ++showToken;
  const walker = document.createElement('div');
  walker.className = 'walker';
  const fig = figureEl(data.body, data.look, 'walking');
  fig.style.transform = figTransform(scaleAt(DOOR.y));
  walker.append(fig);
  walkers.append(walker);
  show = { token, data, walker };
  const live = () => show?.token === token;

  // The viewer's place in the hall waits for them, already in the new look.
  if (data.viewer && data.spot !== null) {
    const person = people.get(data.viewer.id) ?? addPerson(data.spot, { ...data.viewer, look: data.look }, { hidden: true });
    if (person) {
      person.el.classList.add('hidden');
      person.tag.classList.remove('wishing');
      dress(person, data.look);
    }
  }

  $('door').classList.add('open');
  sfx.whoosh();
  if (data.tier === 'large') stage.classList.add('dim');
  await move(walker, fig, DOOR, FRONT, SHOW.walkIn, 'cubic-bezier(.3,.1,.45,1)');
  $('door').classList.remove('open');
  if (!live()) return;

  fig.classList.remove('walking');
  fig.classList.add(`pose-${1 + Math.floor(Math.random() * 3)}`);
  if (data.tier !== 'large') nameCard(data);
  if (data.tier === 'large') {
    cover(data);
    fx.confetti();
    sfx.fanfare();
    flashes(9);
  } else {
    sfx.chime();
    flashes(5);
    if (data.tier === 'follow') fx.hearts(FRONT.x, FRONT.y - FIG_H * scaleAt(FRONT.y) * 0.6, 10);
  }
  const keepFlashing = setInterval(() => flashes(2), 1000);
  await sleep(SHOW.pose[data.tier] ?? SHOW.pose.medium);
  clearInterval(keepFlashing);
  if (!live()) return;

  $('namecard').hidden = true;
  $('cover').hidden = true;
  stage.classList.remove('dim');
  fig.className = fig.className.replace(/\bpose-\d\b/g, '').trim();
  fig.classList.add('walking');
  const person = data.viewer ? people.get(data.viewer.id) : null;
  if (person && !person.gone) {
    const spot = SPOTS[person.spot];
    await move(walker, fig, FRONT, spot, SHOW.toSpot, 'ease-in-out');
    if (!live()) return;
    person.el.classList.remove('hidden');
    touch(person);
    const chest = chestOf(person);
    fx.sparkle(chest.x, chest.y, 12);
  } else {
    // The hall's model, or a viewer with no place left: back through the door.
    if (person) removePerson(person.viewer.id, false);
    await move(walker, fig, FRONT, DOOR, SHOW.exit, 'ease-in', true);
    if (!live()) return;
  }
  walker.remove();
  show = null;
}

// --- cards ----------------------------------------------------------------

function partsToNodes(parts) {
  return (parts ?? []).map((part) => {
    if (part.t === 'text') return document.createTextNode(part.v);
    const span = document.createElement('span');
    span.className = part.t === 'name' ? 'who' : 'what';
    span.textContent = part.v;
    return span;
  });
}

function showBanner(parts) {
  const el = $('banner-text');
  el.replaceChildren(...partsToNodes(parts));
  el.classList.remove('fresh');
  void el.offsetWidth;
  el.classList.add('fresh');
}

// An event's message stays a while, then the banner goes back to its own lines.
function setBanner(parts) {
  resting = false;
  showBanner(parts);
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(rest, 9000);
}

// The banner's own lines: the welcome, what following brings while it brings
// something, and the guide card's lines when the host's camera takes its place.
function restLines() {
  const lines = [[
    { t: 'text', v: 'Chào mừng đến ' },
    { t: 'what', v: settings?.brand ?? 'Sảnh thời trang' },
    { t: 'text', v: ' ✨ Bình luận để bước vào sảnh!' },
  ]];
  if (FOLLOW_LEGEND[settings?.followReward]) lines.push(FOLLOW_CALL[settings.followReward]);
  if (settings?.camera && settings.legend) lines.push(...settings.legendLines.map((v) => [{ t: 'text', v }]));
  return lines;
}

function rest() {
  const lines = restLines();
  if (!resting || lines.length > 1) showBanner(lines[restTurn++ % lines.length]);
  resting = true;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(rest, REST_MS);
}

function setTicker(parts) {
  const el = $('ticker');
  el.replaceChildren(...partsToNodes(parts));
  el.classList.remove('fresh');
  void el.offsetWidth;
  el.classList.add('fresh');
  clearTimeout(tickerTimer);
  tickerTimer = setTimeout(() => el.replaceChildren(), 4000);
}

function renderBoard(list) {
  const rows = (list ?? []).map((row, i) => {
    const li = document.createElement('li');
    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = String(i + 1);
    const who = document.createElement('div');
    who.className = 'who';
    const name = document.createElement('div');
    name.textContent = row.name;
    const points = document.createElement('div');
    points.className = 'points';
    points.textContent = `${number(row.points)} điểm`;
    who.append(name, points);
    li.append(rank, avatarEl(row), who);
    return li;
  });
  $('board-list').replaceChildren(...rows);
  $('board-empty').hidden = rows.length > 0;
  for (const person of people.values()) {
    person.tag.classList.toggle('gifter', (list ?? []).some((row) => row.id === person.viewer.id));
  }
}

function renderLikes(likes) {
  const every = Math.max(1, likes.every);
  $('likes-total').textContent = number(likes.total);
  $('likes-fill').style.width = `${Math.min(100, ((every - likes.toPose) / every) * 100)}%`;
  $('likes-note').textContent = `Còn ${number(likes.toPose)} tim: cả sảnh tạo dáng`;
}

function renderPoll(poll) {
  currentPoll = poll;
  clearInterval(pollTimer);
  const box = $('poll');
  if (!poll) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const total = poll.counts[0] + poll.counts[1];
  $('poll-options').replaceChildren(...poll.options.map((option, i) => {
    const el = document.createElement('div');
    el.className = `poll-option${poll.winner === i ? ' won' : ''}`;
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.width = `${total ? (poll.counts[i] / total) * 100 : 0}%`;
    const row = document.createElement('div');
    row.className = 'row';
    const label = document.createElement('span');
    const key = document.createElement('span');
    key.className = 'key';
    key.textContent = String(i + 1);
    label.append(key, document.createTextNode(option.name));
    const count = document.createElement('span');
    count.textContent = number(poll.counts[i]);
    row.append(label, count);
    el.append(bar, row);
    return el;
  }));
  const note = () => {
    if (currentPoll?.winner !== null && currentPoll?.winner !== undefined) {
      $('poll-note').textContent = `${currentPoll.options[currentPoll.winner].name} thắng!`;
      return;
    }
    const left = Math.max(0, Math.ceil((poll.endsAt - Date.now()) / 1000));
    $('poll-note').textContent = `Bình luận 1 hoặc 2 · còn ${left} giây`;
  };
  note();
  if (poll.winner === null) pollTimer = setInterval(note, 500);
}

function applySettings(next) {
  const first = settings === null;
  settings = next;
  $('brand').textContent = next.brand;
  $('tagline').textContent = next.tagline;
  $('legend').hidden = !next.legend || next.camera;
  $('camera').hidden = !next.camera;
  const call = FOLLOW_LEGEND[next.followReward];
  $('legend-list').replaceChildren(...[...(call ? [call] : []), ...next.legendLines].map((line, i) => {
    const li = document.createElement('li');
    li.textContent = line;
    if (call && i === 0) li.className = 'cta';
    return li;
  }));
  $('safe').hidden = !next.safeArea;
  sfx.setVolumes(next);
  $('sound').hidden = !sfx.blocked;
  if (first || resting) {
    resting = false;
    rest();
  }
}

// --- messages from the server ---------------------------------------------

const handlers = {
  state(state) {
    endShowNow();
    for (const id of [...people.keys()]) removePerson(id, false);
    state.hall.forEach((viewer, i) => viewer && addPerson(i, viewer));
    applySettings(state.settings);
    renderBoard(state.board);
    renderLikes(state.likes);
    renderPoll(state.poll);
    $('sim').hidden = !state.sim.active;
  },
  settings: applySettings,
  sim(data) {
    $('sim').hidden = !data.active;
  },
  'hall:enter'({ spot, viewer }) {
    const person = addPerson(spot, viewer, { arriving: true });
    if (!person) return;
    const chest = chestOf(person);
    fx.sparkle(chest.x, chest.y, 8, 40);
    sfx.pop();
  },
  'hall:leave'({ id }) {
    const person = people.get(id);
    // On the runway right now: they leave through the door when the show ends.
    if (person && show?.data.viewer?.id === id) person.gone = true;
    else removePerson(id);
  },
  'hall:look'({ id, look, item }) {
    const person = people.get(id);
    if (!person) return;
    dress(person, look);
    if (person.el.classList.contains('hidden')) return;
    const chest = chestOf(person);
    fx.sparkle(chest.x, chest.y, 14);
    bubble(person, `+ ${item}`, 'badge');
    sfx.chime();
  },
  say({ id, text }) {
    bubble(people.get(id), text);
  },
  // The wish shows once as a bubble; the name keeps a ✨ until their show.
  wish({ id, name }) {
    const person = people.get(id);
    if (!person) return;
    person.viewer.wish = name;
    person.tag.classList.add('wishing');
    setTimeout(() => bubble(person, `✨ Muốn mặc: ${name}`, 'wish'), 2600);
  },
  fx(data) {
    const person = data.id ? people.get(data.id) : null;
    touch(person);
    if (data.type === 'hearts') {
      const at = person ? chestOf(person) : { x: 160 + Math.random() * 760, y: 1200 };
      fx.hearts(at.x, at.y, Math.min(8, data.n ?? 3));
    } else if (data.type === 'pose-all') {
      for (const p of people.values()) {
        const pose = Math.random() < 0.3 ? 'cheer' : `pose-${1 + Math.floor(Math.random() * 3)}`;
        p.fig.classList.remove('idle');
        p.fig.classList.add(pose);
        setTimeout(() => {
          p.fig.classList.remove(pose);
          p.fig.classList.add('idle');
        }, 3200);
      }
      flashes(14);
      fx.confetti(90);
    } else if (data.type === 'follow') {
      if (person) {
        person.viewer.fan = true;
        person.tag.classList.add('fan');
        const chest = chestOf(person);
        fx.hearts(chest.x, chest.y, 6);
      }
      bubble(person, 'Đã theo dõi 💖', 'badge');
    } else if (data.type === 'share') {
      bubble(person, 'Đã chia sẻ ↗', 'badge');
      if (person) {
        const chest = chestOf(person);
        fx.sparkle(chest.x, chest.y, 10);
      }
    }
  },
  banner({ parts }) {
    setBanner(parts);
  },
  remind({ reward }) {
    setBanner(FOLLOW_CALL[reward] ?? FOLLOW_CALL.off);
    const cta = $('legend-list').querySelector('.cta');
    if (!cta) return;
    cta.classList.remove('nudge');
    void cta.offsetWidth;
    cta.classList.add('nudge');
  },
  ticker({ parts }) {
    setTicker(parts);
  },
  board: renderBoard,
  likes: renderLikes,
  poll: renderPoll,
  'show:start'(data) {
    runShow(data);
  },
  'show:end'({ viewerId, look }) {
    if (show && show.data.viewer?.id === viewerId) return;
    const person = viewerId ? people.get(viewerId) : null;
    if (person?.el.classList.contains('hidden')) {
      if (look) dress(person, look);
      person.el.classList.remove('hidden');
    }
  },
  speak({ text, url, priority, speed }) {
    sfx.speak(text, url, priority, speed);
  },
};

function connect() {
  const events = new EventSource('/events');
  for (const [type, handle] of Object.entries(handlers)) {
    events.addEventListener(type, (event) => {
      try {
        handle(JSON.parse(event.data));
      } catch (err) {
        console.error(`[${type}]`, err);
      }
    });
  }
}

function unlockSound() {
  sfx.unlock().then(() => {
    if (settings) sfx.setVolumes(settings);
    $('sound').hidden = !sfx.blocked;
  });
}

addEventListener('resize', fit);
addEventListener('pointerdown', unlockSound);
$('sound').addEventListener('click', unlockSound);
fit();
buildRunway();
connect();
