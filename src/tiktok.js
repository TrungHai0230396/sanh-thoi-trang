// Reading a live's comments, likes and gifts with tiktok-live-connector: an
// unofficial, reverse-engineered library whose connection is signed by Euler
// Stream, a third party with free limits. TikTok can break it without notice.
// It needs no login: a public live is read the way a viewer's browser reads it.

const OFFLINE = /isn't online|not online|offline|UserOfflineError|LIVE has ended/i;
const LIMITED = /rate.?limit|too many|429|business plan|eulerstream/i;

function friendly(err, username) {
  const message = String(err?.message ?? err ?? '');
  if (OFFLINE.test(message)) return `Kênh @${username} chưa phát trực tiếp. Bật live trên TikTok trước rồi bấm Kết nối.`;
  if (LIMITED.test(message)) return 'Máy chủ ký kết nối (Euler Stream) đang giới hạn. Đợi vài phút rồi thử lại.';
  return `Không kết nối được: ${message.slice(0, 160)}`;
}

const userOf = (d) => ({
  id: d.uniqueId ?? d.user?.uniqueId ?? d.userId ?? null,
  name: d.nickname ?? d.user?.nickname ?? d.uniqueId ?? '',
  avatar: d.profilePictureUrl ?? d.user?.profilePictureUrl ?? null,
});

export function createTikTok(game, onChange) {
  let connection = null;
  let username = '';
  let status = 'off'; // off | connecting | live | error | ended
  let error = null;
  let retries = 0;
  let retryTimer = null;

  const state = () => ({ status, username, error });

  function set(next, message = null) {
    status = next;
    error = message;
    onChange(state());
  }

  function wire(c) {
    c.on('chat', (d) => game.handle({ kind: 'chat', user: userOf(d), text: d.comment }));
    c.on('gift', (d) => game.handle({
      kind: 'gift',
      user: userOf(d),
      giftName: d.giftName ?? d.extendedGiftInfo?.name,
      coins: d.diamondCount ?? d.extendedGiftInfo?.diamond_count,
      repeat: d.repeatCount,
      // A gift that can be sent in a combo sends events while the combo lasts; the last has repeatEnd.
      streaking: d.giftType === 1 && !d.repeatEnd,
    }));
    c.on('like', (d) => game.handle({ kind: 'like', user: userOf(d), count: d.likeCount }));
    c.on('member', (d) => game.handle({ kind: 'join', user: userOf(d) }));
    c.on('follow', (d) => game.handle({ kind: 'follow', user: userOf(d) }));
    c.on('share', (d) => game.handle({ kind: 'share', user: userOf(d) }));
    c.on('streamEnd', () => {
      connection = null;
      set('ended', 'Buổi live đã kết thúc.');
    });
    c.on('disconnected', () => {
      if (c !== connection || status !== 'live') return;
      connection = null;
      // Dropped while live: try again a few times, waiting longer each time.
      if (retries < 5) {
        retries += 1;
        set('connecting', `Mất kết nối, thử lại lần ${retries}…`);
        retryTimer = setTimeout(() => connect(username, { retry: true }), 5000 * retries);
      } else {
        set('error', 'Mất kết nối nhiều lần. Bấm Kết nối để thử lại.');
      }
    });
    c.on('error', (err) => console.error('[tiktok]', err?.message ?? err));
  }

  async function connect(name, { retry = false } = {}) {
    clearTimeout(retryTimer);
    if (!retry) retries = 0;
    await disconnect({ quiet: true });
    username = String(name ?? '').trim().replace(/^@/, '').slice(0, 40);
    if (!/^[\w.]{2,40}$/.test(username)) {
      set('error', 'Tên kênh TikTok chỉ có chữ, số, dấu chấm và gạch dưới.');
      return state();
    }
    let lib;
    try {
      lib = await import('tiktok-live-connector/legacy');
    } catch {
      set('error', 'Chưa cài thư viện kết nối: chạy "npm install" trong thư mục dự án.');
      return state();
    }
    const Connection = lib.WebcastPushConnection ?? lib.default?.WebcastPushConnection;
    const c = new Connection(username, { processInitialData: false, enableExtendedGiftInfo: false });
    connection = c;
    wire(c);
    set('connecting');
    try {
      await c.connect();
      if (connection !== c) return state();
      retries = 0;
      // Real viewers from here on: the pretend ones leave the hall and the board.
      game.clearSimulated();
      set('live');
    } catch (err) {
      if (connection === c) connection = null;
      set('error', friendly(err, username));
    }
    return state();
  }

  async function disconnect({ quiet = false } = {}) {
    clearTimeout(retryTimer);
    const c = connection;
    connection = null;
    if (c) {
      try {
        await c.disconnect();
      } catch {
        // already closed
      }
    }
    if (!quiet) set('off');
  }

  return { connect, disconnect, get state() { return state(); } };
}
