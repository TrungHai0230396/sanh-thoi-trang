// What the hall can dress people in, shared by the server (rules, spoken lines)
// and the overlay (drawing). Every colour ends up inside SVG markup, so only
// hex values belong here.

export const SKINS = ['#f7d7bd', '#edc29d', '#d9a37c', '#b67b55', '#8b5a3c'];
export const HAIR_COLORS = ['#1c1515', '#2f1e18', '#5a3825', '#8c5a35', '#c79a5b', '#e8c27a', '#d98fae', '#b9bdc9'];
export const HAIR_STYLES = ['short', 'long', 'bob', 'bun', 'ponytail', 'curly', 'waves'];

// A viewer's clothes on entering the hall: one of each, colours picked from the lists.
export const CASUAL = {
  top: [
    { style: 'tee', colors: ['#ffffff', '#151515', '#f4a6b8', '#9ad0ec', '#f6d55c', '#7bc47f'] },
    { style: 'shirt', colors: ['#ffffff', '#dbe7f5', '#f3e3c3'] },
    { style: 'crop', colors: ['#ffffff', '#151515', '#ff8fab'] },
    { style: 'hoodie', colors: ['#9aa5b1', '#ff7a59', '#6c5ce7', '#2d3436'] },
  ],
  bottom: [
    { style: 'jeans', colors: ['#3d5a80', '#5f7fa8', '#22304a'] },
    { style: 'trousers', colors: ['#2b2b2b', '#c8b8a6', '#4b5563'] },
    { style: 'skirt', colors: ['#151515', '#c75b7a', '#e9c46a'] },
    { style: 'shorts', colors: ['#3d5a80', '#d4c4a8'] },
  ],
  shoes: [
    { style: 'sneakers', colors: ['#ffffff', '#151515'] },
    { style: 'boots', colors: ['#3b2a20', '#151515'] },
  ],
};

// Whole outfits for the catwalk. `keywords` are folded (see fold below): a
// comment holding one is that viewer's wish for their next show; the longest
// match wins, so "áo dài trắng" is not "áo dài".
export const LOOKS = [
  // Vietnamese
  {
    id: 'ao-dai', name: 'Áo dài đỏ', keywords: ['ao dai', 'aodai', 'ao dai do'],
    parts: {
      dress: { style: 'aodai', color: '#c8102e', color2: '#f2c14e' },
      bottom: { style: 'trousers', color: '#fbf6ec' },
      shoes: { style: 'heels', color: '#f2c14e' },
      hat: { style: 'nonla', color: '#eadcae' },
    },
  },
  {
    id: 'ao-dai-trang', name: 'Áo dài trắng', keywords: ['ao dai trang'],
    parts: {
      dress: { style: 'aodai', color: '#fbfbf7', color2: '#9ec9e8' },
      bottom: { style: 'trousers', color: '#ffffff' },
      shoes: { style: 'flats', color: '#efe4d3' },
      hair: { style: 'flower', color: '#ffffff' },
      ears: { style: 'pearl', color: '#f8f4ec' },
    },
  },
  {
    id: 'ao-dai-xanh', name: 'Áo dài xanh ngọc', keywords: ['ao dai xanh', 'xanh ngoc'],
    parts: {
      dress: { style: 'aodai', color: '#0f8b8d', color2: '#f2c14e' },
      bottom: { style: 'trousers', color: '#fbf6ec' },
      shoes: { style: 'heels', color: '#f2c14e' },
      ears: { style: 'pearl', color: '#f8f4ec' },
      wrist: { style: 'bangle', color: '#3fb68b' },
    },
  },
  {
    id: 'ao-dai-nam', name: 'Áo dài nam khăn đóng', keywords: ['ao dai nam', 'khan dong'],
    parts: {
      dress: { style: 'aodai', color: '#1d3557', color2: '#e9c46a' },
      bottom: { style: 'trousers', color: '#fbf6ec' },
      shoes: { style: 'oxford', color: '#141414' },
      hat: { style: 'khandong', color: '#1d3557' },
    },
  },
  {
    id: 'ba-ba', name: 'Áo bà ba nón lá', keywords: ['ba ba', 'ao ba ba'],
    parts: {
      top: { style: 'baba', color: '#f4ecdc' },
      bottom: { style: 'trousers', color: '#1b1b1b' },
      shoes: { style: 'sandals', color: '#8b5e3c' },
      hat: { style: 'nonla', color: '#eadcae' },
    },
  },
  // Evening
  {
    id: 'da-hoi', name: 'Đầm dạ hội tím', keywords: ['da hoi', 'dam', 'gown'],
    parts: {
      dress: { style: 'gown', color: '#5a189a', color2: '#e0aaff' },
      shoes: { style: 'heels', color: '#e0aaff' },
      neck: { style: 'necklace', color: '#f8e6a0' },
      ears: { style: 'studs', color: '#e8f4ff' },
      bag: { style: 'clutch', color: '#f8e6a0' },
    },
  },
  {
    id: 'duoi-ca', name: 'Đầm đuôi cá đỏ', keywords: ['duoi ca', 'dam do', 'mermaid'],
    parts: {
      dress: { style: 'mermaid', color: '#b5172e', color2: '#ffd166' },
      shoes: { style: 'heels', color: '#ffd166' },
      ears: { style: 'hoops', color: '#ffd166' },
      bag: { style: 'clutch', color: '#ffd166' },
    },
  },
  {
    id: 'cong-chua', name: 'Đầm xòe công chúa', keywords: ['cong chua', 'princess', 'dam xoe'],
    parts: {
      dress: { style: 'ballgown', color: '#ffc8dd', color2: '#ffffff' },
      shoes: { style: 'heels', color: '#ffffff' },
      hair: { style: 'tiara', color: '#e9ecf5' },
      neck: { style: 'pearls', color: '#f8f4ec' },
    },
  },
  {
    id: 'cuoi', name: 'Váy cưới', keywords: ['vay cuoi', 'co dau', 'dam cuoi', 'wedding'],
    parts: {
      dress: { style: 'ballgown', color: '#fdfcf8', color2: '#e9e4d8' },
      shoes: { style: 'heels', color: '#ffffff' },
      hair: { style: 'veil', color: '#ffffff', color2: '#e9ecf5' },
      neck: { style: 'pearls', color: '#f8f4ec' },
      ears: { style: 'studs', color: '#e8f4ff' },
      bag: { style: 'bouquet', color: '#ffffff', color2: '#ffafcc' },
    },
  },
  {
    id: 'sequin', name: 'Đầm sequin vàng', keywords: ['sequin', 'kim sa', 'lap lanh'],
    parts: {
      dress: { style: 'sequin', color: '#d4af37', color2: '#fff6d5' },
      shoes: { style: 'heels', color: '#d4af37' },
      ears: { style: 'hoops', color: '#f2c14e' },
      bag: { style: 'clutch', color: '#151515' },
    },
  },
  {
    id: 'den', name: 'Đầm đen thanh lịch', keywords: ['dam den', 'vay den', 'black dress'],
    parts: {
      dress: { style: 'shift', color: '#151515' },
      shoes: { style: 'heels', color: '#151515' },
      neck: { style: 'pearls', color: '#f8f4ec' },
      ears: { style: 'pearl', color: '#f8f4ec' },
      glasses: { style: 'sunglasses', color: '#151515' },
      bag: { style: 'clutch', color: '#f2c14e' },
    },
  },
  {
    id: 'vest', name: 'Vest lịch lãm', keywords: ['vest', 'suit', 'com le', 'comple'],
    parts: {
      top: { style: 'shirt', color: '#ffffff', tuck: true },
      outer: { style: 'blazer', color: '#1f2a44' },
      bottom: { style: 'trousers', color: '#1f2a44' },
      shoes: { style: 'oxford', color: '#141414' },
      neck: { style: 'tie', color: '#b5172e' },
    },
  },
  {
    id: 'tuxedo', name: 'Tuxedo nơ đen', keywords: ['tuxedo', 'vest den', 'no co'],
    parts: {
      top: { style: 'shirt', color: '#ffffff', tuck: true },
      outer: { style: 'blazer', color: '#161616', color2: '#2f2f2f' },
      bottom: { style: 'trousers', color: '#161616' },
      shoes: { style: 'oxford', color: '#0b0b0b' },
      neck: { style: 'bowtie', color: '#161616' },
      wrist: { style: 'watch', color: '#c9ccd6' },
    },
  },
  {
    id: 'vest-trang', name: 'Vest trắng', keywords: ['vest trang'],
    parts: {
      top: { style: 'turtleneck', color: '#151515', tuck: true },
      outer: { style: 'blazer', color: '#f5f3ee' },
      bottom: { style: 'trousers', color: '#f5f3ee' },
      shoes: { style: 'loafers', color: '#3b2a20' },
      neck: { style: 'chain', color: '#f2c14e' },
    },
  },
  // Day
  {
    id: 'cong-so', name: 'Công sở thanh lịch', keywords: ['cong so', 'van phong', 'office'],
    parts: {
      top: { style: 'shirt', color: '#eef2f8', tuck: true },
      bottom: { style: 'pencil', color: '#2c3e50' },
      outer: { style: 'blazer', color: '#c9b79c' },
      shoes: { style: 'heels', color: '#2b2b2b' },
      ears: { style: 'studs', color: '#e8f4ff' },
      bag: { style: 'handbag', color: '#8b5e3c' },
    },
  },
  {
    id: 'hoa-nhi', name: 'Đầm hoa nhí', keywords: ['hoa nhi', 'dam hoa', 'vay hoa'],
    parts: {
      dress: { style: 'sundress', color: '#fff3e6', color2: '#e76f51', pattern: 'floral' },
      shoes: { style: 'sandals', color: '#c9a27c' },
      hair: { style: 'flower', color: '#e76f51' },
      bag: { style: 'handbag', color: '#c9a27c' },
    },
  },
  {
    id: 'xep-ly', name: 'Váy xếp ly hồng', keywords: ['xep ly', 'hong', 'ngot ngao'],
    parts: {
      top: { style: 'shirt', color: '#ffffff', tuck: true },
      bottom: { style: 'pleated', color: '#ffafcc' },
      shoes: { style: 'heels', color: '#ffffff' },
      neck: { style: 'scarf', color: '#ff8fab' },
      bag: { style: 'clutch', color: '#ffafcc' },
    },
  },
  {
    id: 'ca-ro', name: 'Ca rô thanh lịch', keywords: ['ca ro', 'caro', 'ke ca ro'],
    parts: {
      top: { style: 'shirt', color: '#ffffff', tuck: true },
      outer: { style: 'cardigan', color: '#2a3d66' },
      bottom: { style: 'pleated', color: '#7a1f2b', color2: '#f2c14e', pattern: 'plaid' },
      shoes: { style: 'loafers', color: '#151515' },
      hair: { style: 'headband', color: '#7a1f2b' },
    },
  },
  {
    id: 'vintage', name: 'Cổ điển chấm bi', keywords: ['co dien', 'vintage', 'cham bi'],
    parts: {
      dress: { style: 'midi', color: '#b5172e', color2: '#ffffff', pattern: 'dots' },
      shoes: { style: 'heels', color: '#151515' },
      hat: { style: 'beret', color: '#151515' },
      neck: { style: 'pearls', color: '#f8f4ec' },
      bag: { style: 'handbag', color: '#151515' },
    },
  },
  {
    id: 'len', name: 'Áo len mùa thu', keywords: ['ao len', 'mua thu', 'sweater'],
    parts: {
      top: { style: 'sweater', color: '#e9b44c' },
      bottom: { style: 'midiskirt', color: '#6b4f3a' },
      shoes: { style: 'boots', color: '#3b2a20' },
      hat: { style: 'beret', color: '#7a1f2b' },
    },
  },
  {
    id: 'toi-gian', name: 'Trench tối giản', keywords: ['toi gian', 'minimal', 'trench'],
    parts: {
      top: { style: 'shirt', color: '#ffffff', tuck: true },
      bottom: { style: 'trousers', color: '#f1ede6' },
      outer: { style: 'trench', color: '#d8c3a5' },
      shoes: { style: 'sneakers', color: '#ffffff' },
      bag: { style: 'handbag', color: '#a47551' },
    },
  },
  {
    id: 'mua-dong', name: 'Áo phao mùa đông', keywords: ['mua dong', 'ao phao', 'winter'],
    parts: {
      top: { style: 'turtleneck', color: '#efe6d8' },
      outer: { style: 'puffer', color: '#c8b6ff' },
      bottom: { style: 'jeans', color: '#2f3e5c' },
      shoes: { style: 'boots', color: '#3b2a20' },
      hat: { style: 'beanie', color: '#f4ecdc', color2: '#c8b6ff' },
    },
  },
  // Street and play
  {
    id: 'street', name: 'Streetwear', keywords: ['street', 'duong pho', 'hiphop', 'hip hop', 'hoodie'],
    parts: {
      top: { style: 'hoodie', color: '#ff6b35' },
      bottom: { style: 'joggers', color: '#333333' },
      shoes: { style: 'sneakers', color: '#ffffff' },
      hat: { style: 'cap', color: '#151515' },
      glasses: { style: 'sunglasses', color: '#151515' },
    },
  },
  {
    id: 'y2k', name: 'Phong cách Y2K', keywords: ['y2k'],
    parts: {
      top: { style: 'crop', color: '#ff8fab' },
      bottom: { style: 'wide', color: '#8fb3e0' },
      shoes: { style: 'sneakers', color: '#ffffff' },
      hat: { style: 'bucket', color: '#f6d55c' },
      glasses: { style: 'round', color: '#ff4f9a' },
      bag: { style: 'clutch', color: '#c77dff' },
    },
  },
  {
    id: 'rock', name: 'Áo khoác da', keywords: ['rock', 'ao da', 'khoac da', 'biker'],
    parts: {
      top: { style: 'tee', color: '#ffffff' },
      outer: { style: 'leather', color: '#1b1b1b' },
      bottom: { style: 'jeans', color: '#2f4b7c' },
      shoes: { style: 'boots', color: '#1b1b1b' },
      glasses: { style: 'sunglasses', color: '#151515' },
      ears: { style: 'hoops', color: '#c9ccd6' },
    },
  },
  {
    id: 'cao-boi', name: 'Cao bồi miền Tây', keywords: ['cao boi', 'cowboy'],
    parts: {
      top: { style: 'tee', color: '#ffffff' },
      outer: { style: 'denim', color: '#5b84b1' },
      bottom: { style: 'jeans', color: '#2f4b7c' },
      shoes: { style: 'cowboy', color: '#8b5a2b' },
      hat: { style: 'cowboy', color: '#c69c6d' },
      neck: { style: 'scarf', color: '#d62828' },
    },
  },
  {
    id: 'he', name: 'Mùa hè biển', keywords: ['mua he', 'bien', 'summer', 'di bien'],
    parts: {
      top: { style: 'crop', color: '#ffffff' },
      bottom: { style: 'shorts', color: '#4ea8de' },
      shoes: { style: 'sandals', color: '#e9c46a' },
      hat: { style: 'sunhat', color: '#e9d8a6', color2: '#4ea8de' },
      glasses: { style: 'sunglasses', color: '#2b2b2b' },
    },
  },
  {
    id: 'the-thao', name: 'Thể thao năng động', keywords: ['the thao', 'sport', 'gym'],
    parts: {
      top: { style: 'tee', color: '#00b894' },
      bottom: { style: 'joggers', color: '#2d3436' },
      shoes: { style: 'sneakers', color: '#ffffff' },
      hat: { style: 'cap', color: '#00b894' },
    },
  },
  {
    id: 'tennis', name: 'Tennis trắng', keywords: ['tennis', 'quan vot'],
    parts: {
      top: { style: 'polo', color: '#ffffff', tuck: true },
      bottom: { style: 'pleated', color: '#ffffff' },
      shoes: { style: 'sneakers', color: '#ffffff' },
      hat: { style: 'visor', color: '#2a9d8f' },
      wrist: { style: 'watch', color: '#2a9d8f' },
    },
  },
];

// One piece each for a small gift. `name` goes into the banner and the voice.
// A hat and something worn in the hair take each other's place.
export const ACCESSORIES = [
  // jewellery
  { slot: 'ears', style: 'pearl', color: '#f8f4ec', name: 'hoa tai ngọc trai' },
  { slot: 'ears', style: 'hoops', color: '#f2c14e', name: 'khuyên tròn vàng' },
  { slot: 'ears', style: 'studs', color: '#e8f4ff', name: 'hoa tai kim cương' },
  { slot: 'neck', style: 'pearls', color: '#f8f4ec', name: 'chuỗi ngọc trai' },
  { slot: 'neck', style: 'chain', color: '#f2c14e', name: 'dây chuyền vàng' },
  { slot: 'neck', style: 'necklace', color: '#f8e6a0', name: 'mặt dây chuyền' },
  { slot: 'neck', style: 'choker', color: '#151515', name: 'vòng choker' },
  { slot: 'wrist', style: 'bangle', color: '#f2c14e', name: 'vòng tay vàng' },
  { slot: 'wrist', style: 'bangle', color: '#3fb68b', name: 'vòng ngọc bích' },
  { slot: 'wrist', style: 'watch', color: '#c9ccd6', name: 'đồng hồ bạc' },
  { slot: 'hair', style: 'tiara', color: '#e9ecf5', name: 'vương miện nhỏ' },
  // in the hair
  { slot: 'hair', style: 'bow', color: '#ff4f9a', name: 'nơ cài tóc' },
  { slot: 'hair', style: 'flower', color: '#ff8fab', name: 'hoa cài tóc' },
  { slot: 'hair', style: 'headband', color: '#151515', name: 'băng đô' },
  // hats and glasses
  { slot: 'glasses', style: 'sunglasses', color: '#151515', name: 'kính râm' },
  { slot: 'glasses', style: 'round', color: '#c9a227', name: 'kính gọng tròn' },
  { slot: 'hat', style: 'fedora', color: '#3b2f2f', name: 'mũ phớt' },
  { slot: 'hat', style: 'cap', color: '#e63946', name: 'mũ lưỡi trai' },
  { slot: 'hat', style: 'beret', color: '#9d0208', name: 'mũ nồi' },
  { slot: 'hat', style: 'nonla', color: '#eadcae', name: 'nón lá' },
  { slot: 'hat', style: 'sunhat', color: '#e9d8a6', color2: '#e76f51', name: 'mũ rộng vành' },
  { slot: 'hat', style: 'bucket', color: '#f6d55c', name: 'mũ bucket' },
  { slot: 'hat', style: 'beanie', color: '#f4ecdc', color2: '#ff8fab', name: 'mũ len' },
  { slot: 'hat', style: 'cowboy', color: '#c69c6d', name: 'mũ cao bồi' },
  // more
  { slot: 'neck', style: 'scarf', color: '#ffb703', name: 'khăn quàng' },
  { slot: 'neck', style: 'bowtie', color: '#b5172e', name: 'nơ cổ' },
  { slot: 'bag', style: 'handbag', color: '#c1121f', name: 'túi xách' },
  { slot: 'bag', style: 'clutch', color: '#f2c14e', name: 'ví cầm tay' },
  { slot: 'bag', style: 'bouquet', color: '#ffffff', color2: '#ff8fab', name: 'bó hoa' },
  { slot: 'outer', style: 'blazer', color: '#e76f51', name: 'áo blazer' },
  { slot: 'outer', style: 'leather', color: '#1b1b1b', name: 'áo khoác da' },
  { slot: 'outer', style: 'denim', color: '#5b84b1', name: 'áo khoác jean' },
  { slot: 'shoes', style: 'boots', color: '#3b2a20', name: 'bốt da' },
  { slot: 'shoes', style: 'heels', color: '#d00000', name: 'giày cao gót đỏ' },
  { slot: 'shoes', style: 'cowboy', color: '#8b5a2b', name: 'bốt cao bồi' },
];

// The cover star's crown, put on for a large gift's show.
export const COVER_CROWN = { style: 'crown', color: '#f2c14e' };

// Big skirts that a jacket would look wrong over.
export const NO_JACKET = ['gown', 'mermaid', 'ballgown'];

// Show timings in ms, the same for the server (when the next show may start)
// and the overlay (when to move the model).
export const SHOW = {
  walkIn: 4200,
  pose: { follow: 3000, medium: 3600, large: 7600, house: 3200 },
  toSpot: 1800,
  exit: 2400,
  gap: 700,
};

export function showDuration(tier) {
  const pose = SHOW.pose[tier] ?? SHOW.pose.medium;
  return SHOW.walkIn + pose + (tier === 'house' ? SHOW.exit : SHOW.toSpot);
}

export function lookById(id) {
  return LOOKS.find((look) => look.id === id) ?? null;
}

// Lower case, accents dropped, đ as d, anything else between words a single space.
export function fold(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// The look a comment asks for, matched on whole words ("không" is not "hồng"),
// the longest keyword winning.
export function findLook(text) {
  const words = ` ${fold(text)} `;
  if (words.trim() === '') return null;
  let best = null;
  let length = 0;
  for (const look of LOOKS) {
    for (const kw of look.keywords) {
      if (kw.length > length && words.includes(` ${kw} `)) {
        best = look;
        length = kw.length;
      }
    }
  }
  return best;
}
