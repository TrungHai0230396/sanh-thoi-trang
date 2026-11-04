// Every look of the catalog, every piece a small gift can add, and a few
// everyday outfits, side by side.

import { LOOKS, ACCESSORIES, CASUAL, SKINS, HAIR_COLORS, HAIR_STYLES } from './catalog.js';
import { figureSVG } from './figure.js';

const pick = (list, i) => list[i % list.length];

function section(title) {
  const heading = document.createElement('h2');
  heading.textContent = title;
  const grid = document.createElement('div');
  grid.className = 'grid';
  document.getElementById('sections').append(heading, grid);
  return grid;
}

function card(grid, title, subtitle, body, outfit) {
  const el = document.createElement('div');
  el.className = 'card';
  const stand = document.createElement('div');
  stand.className = 'stand';
  const fig = document.createElement('div');
  fig.className = 'fig';
  fig.innerHTML = figureSVG(body, outfit);
  stand.append(fig);
  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = title;
  const id = document.createElement('div');
  id.className = 'id';
  id.textContent = subtitle;
  el.append(stand, name, id);
  grid.append(el);
}

const looks = section(`Bộ đồ lên sàn (${LOOKS.length})`);
LOOKS.forEach((look, i) => {
  card(looks, look.name, look.keywords[0], { skin: pick(SKINS, i), hair: pick(HAIR_STYLES, i), hairColor: pick(HAIR_COLORS, i) }, look.parts);
});

// Each piece on the same plain outfit, so it is what you see.
const pieces = section(`Phụ kiện, trang sức cho quà nhỏ (${ACCESSORIES.length})`);
const plain = {
  top: { style: 'tee', color: '#3a2a5c', tuck: true },
  bottom: { style: 'trousers', color: '#1f1830' },
  shoes: { style: 'sneakers', color: '#ffffff' },
};
ACCESSORIES.forEach((item, i) => {
  const outfit = { ...plain, [item.slot]: { style: item.style, color: item.color, color2: item.color2 } };
  card(pieces, item.name, `${item.slot} · ${item.style}`, { skin: pick(SKINS, i + 1), hair: i % 2 ? 'bun' : 'short', hairColor: pick(HAIR_COLORS, i) }, outfit);
});

const everyday = section('Đồ thường khi mới vào sảnh');
for (let i = 0; i < 8; i += 1) {
  const top = pick(CASUAL.top, i);
  const bottom = pick(CASUAL.bottom, i + 1);
  const shoes = pick(CASUAL.shoes, i);
  card(everyday, `${top.style} + ${bottom.style}`, shoes.style,
    { skin: pick(SKINS, i + 2), hair: pick(HAIR_STYLES, i + 3), hairColor: pick(HAIR_COLORS, i + 1) },
    {
      top: { style: top.style, color: pick(top.colors, i) },
      bottom: { style: bottom.style, color: pick(bottom.colors, i) },
      shoes: { style: shoes.style, color: pick(shoes.colors, i) },
    });
}

const buttons = document.querySelectorAll('[data-mode]');
for (const button of buttons) {
  button.addEventListener('click', () => {
    for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
    for (const fig of document.querySelectorAll('.fig')) fig.className = `fig ${button.dataset.mode}`.trim();
  });
}

const zoom = document.getElementById('zoom');
zoom.addEventListener('click', () => {
  const on = document.body.classList.toggle('zoomed');
  zoom.setAttribute('aria-pressed', String(on));
});
