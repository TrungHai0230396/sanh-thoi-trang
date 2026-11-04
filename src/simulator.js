// Pretend viewers, for trying the hall without a live. Everything it sends is
// marked simulated: the game keeps those people apart and the screen says so.

import { fold } from '../public/js/catalog.js';

const NAMES = [
  'Mai Anh', 'Bảo Ngọc', 'Gia Huy', 'Khánh Linh', 'Minh Thư', 'Quốc Bảo', 'Thảo Vy', 'Hoàng Nam',
  'Ngọc Hân', 'Tuấn Kiệt', 'Phương Nhi', 'Đức Anh', 'Hà My', 'Thanh Tâm', 'Bích Ngân', 'Nhật Minh',
  'Diệu Linh', 'Trúc Anh', 'Hải Yến', 'Quang Vinh', 'Lan Chi', 'Minh Khang', 'Yến Nhi', 'Gia Bảo',
  'Thu Trang', 'Kim Ngân', 'Anh Thư', 'Đăng Khoa',
];

const COMMENTS = [
  'Đẹp quá trời', 'Cho xem áo dài đi', 'Áo dài trắng nha', 'Áo dài nam khăn đóng đi', 'Áo bà ba nón lá dễ thương',
  'Vest nha!', 'Tuxedo đi anh ơi', 'Vest trắng sang ghê', 'Đầm dạ hội đi', 'Đầm đuôi cá đỏ!', 'Váy cưới đẹp quá',
  'Đầm xòe công chúa nha', 'Sequin lấp lánh đi', 'Đầm đen thanh lịch', 'Đầm hoa nhí xinh ghê', 'Ca rô đi',
  'Áo len mùa thu', 'Áo phao mùa đông', 'Y2K đi', 'Cao bồi vui ghê', 'Tennis trắng nha', '1', '2',
  'Mặc đồ công sở đi', 'Streetwear chất', 'Mùa hè đi biển nè', 'Ai mặc đẹp nhất vậy', 'Cổ điển chấm bi dễ thương',
  'Xin chào cả sảnh', 'Lên đồ thôi', 'Váy xếp ly hồng!', 'Áo khoác da ngầu quá', 'Hello mọi người', 'Nhạc hay ghê',
];

const GIFTS = [
  { name: 'Hoa hồng', coins: 1, weight: 40 },
  { name: 'TikTok', coins: 1, weight: 18 },
  { name: 'Tim ngón tay', coins: 5, weight: 14 },
  { name: 'Nước hoa', coins: 20, weight: 8 },
  { name: 'Bánh donut', coins: 30, weight: 5 },
  { name: 'Trái tim', coins: 100, weight: 2 },
  { name: 'Kính râm', coins: 199, weight: 1.4 },
  { name: 'Thiên hà', coins: 1000, weight: 0.4 },
];

// Milliseconds between events, on average.
export const RATES = { vang: 3200, vua: 1500, dong: 600 };

export function createSimulator(game, { random = Math.random } = {}) {
  const people = [];
  let made = 0;
  let timer = null;
  let rate = 'vua';

  const pick = (list) => list[Math.floor(random() * list.length)];

  function weighted(list) {
    let roll = random() * list.reduce((sum, item) => sum + item.weight, 0);
    for (const item of list) {
      roll -= item.weight;
      if (roll <= 0) return item;
    }
    return list[0];
  }

  // Mostly someone already here, sometimes a newcomer. Only those who may (`ok`) are picked.
  function person(fresh, ok = () => true) {
    const here = people.filter(ok);
    if (!fresh && here.length > 0 && random() < 0.85) return pick(here);
    const round = Math.floor(made / NAMES.length);
    const p = { id: `nguoi-${made + 1}`, name: NAMES[made % NAMES.length] + (round ? ` ${round + 1}` : '') };
    made += 1;
    people.push(p);
    if (people.length > 60) people.shift();
    return p;
  }

  function fire(kind, options = {}) {
    const label = String(options.name ?? '').trim();
    // Someone follows once: the hall rewards a follow only the first time.
    const user = label
      ? { id: `thu-${fold(label).replace(/ /g, '-') || 'khach'}`, name: label }
      : person(kind === 'join', kind === 'follow' ? (p) => !p.followed : undefined);
    if (kind === 'follow') user.followed = true;
    const base = { kind, user, simulated: true };
    if (kind === 'chat') {
      game.handle({ ...base, text: String(options.text ?? '').trim() || pick(COMMENTS) });
    } else if (kind === 'like') {
      game.handle({ ...base, count: Number(options.count) || 5 + Math.floor(random() * 25) });
    } else if (kind === 'gift') {
      const gift = Number(options.coins) > 0
        ? { name: String(options.giftName ?? '').trim() || 'Quà thử', coins: Number(options.coins) }
        : weighted(GIFTS);
      game.handle({ ...base, giftName: gift.name, coins: gift.coins, repeat: 1 });
    } else if (['join', 'follow', 'share'].includes(kind)) {
      game.handle(base);
    } else {
      return false;
    }
    return true;
  }

  function tick() {
    const roll = random();
    if (roll < 0.36) fire('chat');
    else if (roll < 0.66) fire('like');
    else if (roll < 0.8) fire('join');
    else if (roll < 0.95) fire('gift');
    else if (roll < 0.985) fire('follow');
    else fire('share');
    timer = setTimeout(tick, RATES[rate] * (0.4 + random() * 1.2));
  }

  return {
    fire,
    start(nextRate) {
      if (RATES[nextRate]) rate = nextRate;
      game.setSimulating(true);
      if (!timer) timer = setTimeout(tick, 300);
    },
    stop() {
      clearTimeout(timer);
      timer = null;
      game.setSimulating(false);
    },
    get state() {
      return { running: timer !== null, rate };
    },
  };
}
