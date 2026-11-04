// The control page: buttons call the server's API; what happens comes back on
// the same event stream the live screen hears.

const $ = (id) => document.getElementById(id);
const GIFT_NAMES = { 1: 'Hoa hồng', 30: 'Bánh donut', 199: 'Kính râm' };
const TIKTOK_LABELS = {
  off: 'TikTok: chưa kết nối',
  connecting: 'TikTok: đang kết nối…',
  live: 'TikTok: đang nhận live',
  error: 'TikTok: lỗi',
  ended: 'TikTok: live đã kết thúc',
};
const HOST_DONE = {
  'pose-all': 'Đã cho cả sảnh tạo dáng',
  'house-walk': 'Người mẫu của sảnh sẽ diễn',
  'poll-start': 'Đã mở bình chọn',
  'poll-end': 'Đã chốt bình chọn',
  'remind-follow': 'MC đã nhắc theo dõi kênh',
  'clear-hall': 'Đã dọn sảnh',
  'reset-board': 'Đã làm mới bảng xếp hạng',
  'clear-sim': 'Đã xóa người giả',
};

let simulating = false;

async function post(path, body = {}) {
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function note(id, text) {
  const el = $(id);
  el.textContent = text;
  clearTimeout(el.timer);
  el.timer = setTimeout(() => { el.textContent = ''; }, 4000);
}

// --- buttons ----------------------------------------------------------------

document.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-test], button[data-gift], button[data-host]');
  if (!button) return;
  button.disabled = true;
  try {
    if (button.dataset.test) {
      await post(`test/${button.dataset.test}`);
    } else if (button.dataset.gift) {
      await post('test/gift', { coins: Number(button.dataset.gift), giftName: GIFT_NAMES[button.dataset.gift] });
    } else {
      await post(`host/${button.dataset.host}`);
      note('settings-msg', HOST_DONE[button.dataset.host] ?? 'Xong');
    }
  } catch (err) {
    note('settings-msg', err.message === 'not now' ? 'Chưa làm được lúc này (đang có tiết mục chờ)' : `Lỗi: ${err.message}`);
  } finally {
    button.disabled = false;
  }
});

function showSim(state) {
  simulating = state.running;
  const toggle = $('sim-toggle');
  toggle.textContent = simulating ? 'Tắt giả lập' : 'Bật giả lập';
  toggle.classList.toggle('on', simulating);
  $('sim-rate').value = state.rate;
}

$('sim-toggle').addEventListener('click', async () => {
  showSim(await post('sim', { on: !simulating, rate: $('sim-rate').value }));
});

$('sim-rate').addEventListener('change', async () => {
  if (simulating) showSim(await post('sim', { on: true, rate: $('sim-rate').value }));
});

$('custom').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const kind = event.submitter?.value ?? 'chat';
  const name = form.get('name').trim() || 'Khách thử';
  try {
    if (kind === 'gift') {
      await post('test/gift', { name, giftName: form.get('giftName').trim() || 'Quà thử', coins: Number(form.get('coins')) || 1 });
    } else if (kind === 'follow') {
      await post('test/follow', { name });
    } else {
      await post('test/chat', { name, text: form.get('text').trim() || 'Xin chào cả sảnh' });
    }
  } catch (err) {
    note('settings-msg', `Lỗi: ${err.message}`);
  }
});

// --- TikTok -----------------------------------------------------------------

function showTikTok(state) {
  const pill = $('pill-tiktok');
  pill.textContent = TIKTOK_LABELS[state.status] ?? `TikTok: ${state.status}`;
  pill.className = `pill${state.status === 'live' ? ' live' : state.status === 'error' ? ' error' : ''}`;
  $('tiktok-msg').textContent = state.error ?? (state.status === 'live' ? `Đang nhận bình luận, tim và quà của @${state.username}.` : '');
  if (state.username && !$('tiktok-user').value) $('tiktok-user').value = state.username;
}

$('tiktok-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    showTikTok(await post('tiktok/connect', { username: $('tiktok-user').value }));
  } catch (err) {
    $('tiktok-msg').textContent = `Lỗi: ${err.message}`;
  }
});

$('tiktok-off').addEventListener('click', async () => {
  showTikTok(await post('tiktok/disconnect'));
});

// --- the MC's voice ------------------------------------------------------------

let voiceInfo = null;
let voiceChoice = null; // the saved choice, as "engine:name"

function voiceNote(info) {
  const { ai, mac } = info;
  if (ai.status === 'ready') return `Giọng AI VieNeu: ${ai.voices.length} giọng, chạy ngay trên máy này, không cần mạng.`;
  const fallback = mac.voice ? ` Trong lúc đó MC đọc bằng giọng "${mac.voice}" của macOS.` : ' Máy này cũng không có giọng tiếng Việt của macOS, nên MC im lặng.';
  if (ai.status === 'starting') return `Đang nạp giọng AI VieNeu…${fallback}`;
  if (ai.status === 'failed') return `Giọng AI VieNeu bị lỗi (${ai.error ?? 'không rõ'}).${fallback}`;
  return `Chưa cài giọng AI VieNeu: chạy "npm run setup:voice" rồi khởi động lại server.${fallback}`;
}

// VieNeu's voices once loaded, then the Mac's; a saved AI voice stays listed
// while the model loads, so saving meanwhile does not switch engines.
function fillVoices() {
  const { ai, mac } = voiceInfo;
  const select = $('voice-name');
  const keep = voiceChoice ?? select.value;
  const groups = [];
  const aiGroup = document.createElement('optgroup');
  aiGroup.label = 'Giọng AI VieNeu (chạy trên máy này)';
  for (const v of ai.voices) aiGroup.append(new Option(`${v.featured ? '⭐ ' : ''}${v.id} · ${v.description}`, `vieneu:${v.id}`));
  if (keep?.startsWith('vieneu:') && !ai.voices.some((v) => `vieneu:${v.id}` === keep)) {
    aiGroup.append(new Option(`${keep.slice(7)} · ${ai.status === 'ready' ? 'không còn giọng này' : 'đang nạp'}`, keep));
  }
  if (aiGroup.children.length) groups.push(aiGroup);
  if (mac.voice) {
    const macGroup = document.createElement('optgroup');
    macGroup.label = 'Giọng của macOS';
    macGroup.append(new Option(mac.voice, `mac:${mac.voice}`));
    groups.push(macGroup);
  }
  select.replaceChildren(...groups);
  if (keep && [...select.options].some((o) => o.value === keep)) select.value = keep;
}

function chosenVoice() {
  const value = $('voice-name').value;
  const at = value.indexOf(':');
  return at < 0 ? { engine: 'vieneu', voice: '' } : { engine: value.slice(0, at), voice: value.slice(at + 1) };
}

function showVoice(info, settings) {
  if (info) voiceInfo = info;
  if (settings) {
    voiceChoice = settings.voiceEngine === 'mac' ? `mac:${voiceInfo?.mac.voice ?? ''}` : `vieneu:${settings.voiceName}`;
    $('voice-on').checked = settings.tts;
    $('voice-rate').value = settings.voiceRate;
    $('voice-rate-out').textContent = settings.voiceRate;
    $('voice-volume').value = settings.voiceVolume;
  }
  if (!voiceInfo) return;
  $('voice-info').textContent = voiceNote(voiceInfo);
  fillVoices();
}

$('voice-rate').addEventListener('input', () => { $('voice-rate-out').textContent = $('voice-rate').value; });

$('voice-test').addEventListener('click', async () => {
  const button = $('voice-test');
  button.disabled = true;
  try {
    const wanted = chosenVoice();
    const done = await post('voice/test', { text: $('voice-text').value, rate: Number($('voice-rate').value), ...wanted });
    if (!done.url) {
      note('voice-msg', 'Không có giọng để đọc trên máy này');
      return;
    }
    if (wanted.engine === 'vieneu' && done.engine !== 'vieneu') note('voice-msg', `Giọng AI chưa sẵn sàng, đang đọc bằng giọng "${done.voice}"`);
    const audio = new Audio(done.url);
    audio.volume = Number($('voice-volume').value);
    audio.preservesPitch = true;
    audio.defaultPlaybackRate = done.speed;
    audio.playbackRate = done.speed;
    await audio.play();
  } catch (err) {
    note('voice-msg', `Lỗi: ${err.message}`);
  } finally {
    button.disabled = false;
  }
});

$('voice-save').addEventListener('click', async () => {
  try {
    const { engine, voice } = chosenVoice();
    const settings = await post('settings', {
      tts: $('voice-on').checked,
      voiceRate: Number($('voice-rate').value),
      voiceVolume: Number($('voice-volume').value),
      voiceEngine: engine,
      ...(engine === 'vieneu' ? { voiceName: voice } : {}),
    });
    showVoice(null, settings);
    note('voice-msg', 'Đã lưu giọng');
  } catch (err) {
    note('voice-msg', `Lỗi: ${err.message}`);
  }
});

// --- settings ---------------------------------------------------------------

const settingsForm = $('settings');

function fillSettings(settings) {
  for (const [key, value] of Object.entries(settings)) {
    const field = settingsForm.elements[key];
    if (!field) continue;
    if (field.type === 'checkbox') field.checked = Boolean(value);
    else if (key === 'legendLines') field.value = value.join('\n');
    else field.value = value;
  }
}

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const patch = {};
  for (const field of settingsForm.elements) {
    if (!field.name) continue;
    if (field.type === 'checkbox') patch[field.name] = field.checked;
    else if (field.name === 'legendLines') patch[field.name] = field.value.split('\n');
    else if (field.type === 'number' || field.type === 'range') patch[field.name] = Number(field.value);
    else patch[field.name] = field.value;
  }
  try {
    fillSettings(await post('settings', patch));
    note('settings-msg', 'Đã lưu, màn hình live đổi ngay');
  } catch (err) {
    note('settings-msg', `Lỗi: ${err.message}`);
  }
});

// --- the event stream -------------------------------------------------------

function addLog({ at, line }) {
  const li = document.createElement('li');
  const time = document.createElement('time');
  time.textContent = new Date(at).toLocaleTimeString('vi-VN');
  li.append(time, document.createTextNode(line));
  const log = $('log');
  log.prepend(li);
  while (log.children.length > 120) log.lastChild.remove();
}

const events = new EventSource('/events');
events.addEventListener('state', (event) => {
  const state = JSON.parse(event.data);
  fillSettings(state.settings);
  showVoice(state.voice, state.settings);
  showSim(state.simulator);
  showTikTok(state.tiktok);
  $('pill-sim').hidden = !state.sim.active;
  $('log').replaceChildren();
});
events.addEventListener('simulator', (event) => showSim(JSON.parse(event.data)));
events.addEventListener('settings', (event) => showVoice(null, JSON.parse(event.data)));
events.addEventListener('voice', (event) => showVoice(JSON.parse(event.data), null));
events.addEventListener('sim', (event) => { $('pill-sim').hidden = !JSON.parse(event.data).active; });
events.addEventListener('tiktok', (event) => showTikTok(JSON.parse(event.data)));
events.addEventListener('log', (event) => addLog(JSON.parse(event.data)));
