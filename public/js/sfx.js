// Sounds made in the browser (no audio files, nothing to license): camera
// shutters, chimes, a whoosh, a fanfare and a runway beat. The MC's voice comes
// as WAV files from the server and ducks the music while it speaks.

const BPM = 118;
const STEP = 60 / BPM / 4; // one sixteenth
const BASS = [33, 33, 29, 31]; // A1 A1 F1 G1, one per bar
const CHORDS = [[57, 60, 64], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

export function createSfx({ muted = false } = {}) {
  let ctx = null;
  let master;
  let effects;
  let music;
  let noiseBuffer;
  let musicOn = false;
  let musicVolume = 0.35;
  let voiceVolume = 1;
  let timer = null;
  let nextAt = 0;
  let step = 0;
  const voice = [];
  let speaking = false;

  function ensure() {
    if (muted) return null;
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.connect(ctx.destination);
      effects = ctx.createGain();
      effects.gain.value = 0.8;
      effects.connect(master);
      music = ctx.createGain();
      music.gain.value = 0;
      music.connect(master);
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    return ctx;
  }

  function noise(at, duration, filterType, frequency, gain, out = effects) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, at);
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    src.connect(filter).connect(env).connect(out);
    src.start(at, Math.random() * 0.5, duration + 0.05);
    return filter;
  }

  function tone(at, frequency, duration, gain, type = 'sine', out = effects) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, at);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(env).connect(out);
    osc.start(at);
    osc.stop(at + duration + 0.05);
    return osc;
  }

  // --- the beat ---------------------------------------------------------------

  function bass(at, frequency) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = frequency;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 420;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.32, at);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
    osc.connect(lowpass).connect(env).connect(music);
    osc.start(at);
    osc.stop(at + 0.25);
  }

  function playStep(at, n) {
    const bar = Math.floor(n / 16) % 4;
    const s = n % 16;
    if (s % 4 === 0) {
      const osc = tone(at, 150, 0.32, 0.9, 'sine', music);
      osc.frequency.exponentialRampToValueAtTime(42, at + 0.14);
    }
    if (s === 4 || s === 12) noise(at, 0.14, 'bandpass', 1600, 0.55, music);
    if (s % 2 === 0) noise(at, s % 4 === 2 ? 0.06 : 0.03, 'highpass', 7500, s % 4 === 2 ? 0.22 : 0.08, music);
    if ([0, 3, 6, 8, 11, 14].includes(s)) bass(at, midi(BASS[bar] + (s === 14 ? 12 : 0)));
    if (s === 0) {
      for (const note of CHORDS[bar]) tone(at, midi(note), STEP * 15, 0.045, 'triangle', music);
    }
  }

  function schedule() {
    while (nextAt < ctx.currentTime + 0.12) {
      playStep(nextAt, step);
      nextAt += STEP;
      step = (step + 1) % 64;
    }
  }

  function applyMusicGain() {
    if (!ctx) return;
    const target = musicOn ? musicVolume * (speaking ? 0.35 : 1) : 0;
    music.gain.setTargetAtTime(target, ctx.currentTime, 0.12);
  }

  // --- the MC's voice ---------------------------------------------------------

  function speakNext() {
    if (speaking || voice.length === 0) return;
    const item = voice.shift();
    speaking = true;
    applyMusicGain();
    const done = () => {
      speaking = false;
      applyMusicGain();
      setTimeout(speakNext, 250);
    };
    if (item.url) {
      const audio = new Audio(item.url);
      audio.volume = voiceVolume;
      // The AI voice's pace is set here, its pitch kept.
      audio.preservesPitch = true;
      audio.defaultPlaybackRate = item.speed;
      audio.playbackRate = item.speed;
      audio.addEventListener('ended', done, { once: true });
      audio.addEventListener('error', done, { once: true });
      audio.play().catch(done);
    } else if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(item.text);
      utterance.lang = 'vi-VN';
      const vi = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('vi'));
      if (!vi) return done();
      utterance.voice = vi;
      utterance.volume = voiceVolume;
      utterance.onend = done;
      utterance.onerror = done;
      speechSynthesis.speak(utterance);
    } else {
      done();
    }
  }

  const play = (fn) => {
    const c = ensure();
    if (c && c.state === 'running') fn(c.currentTime + 0.01);
  };

  return {
    get blocked() {
      return !muted && (!ctx || ctx.state !== 'running');
    },
    unlock() {
      const c = ensure();
      if (c && c.state === 'suspended') return c.resume();
      return Promise.resolve();
    },
    setVolumes({ music: on, musicVolume: mv, sfxVolume, voiceVolume: vv = 1 }) {
      if (ensure() === null) return;
      musicOn = Boolean(on);
      musicVolume = Number(mv) || 0;
      voiceVolume = Math.min(1, Math.max(0, Number(vv)));
      effects.gain.setTargetAtTime(Number(sfxVolume) || 0, ctx.currentTime, 0.05);
      if (musicOn && !timer) {
        nextAt = ctx.currentTime + 0.1;
        timer = setInterval(() => ctx.state === 'running' && schedule(), 25);
      } else if (!musicOn && timer) {
        clearInterval(timer);
        timer = null;
      }
      applyMusicGain();
    },
    // At most three lines wait; past that the least important, oldest first, goes.
    speak(text, url, priority = 1, speed = 1) {
      if (muted) return;
      voice.push({ text, url, priority, speed: Number(speed) || 1 });
      while (voice.length > 3) {
        const lowest = Math.min(...voice.map((item) => item.priority));
        voice.splice(voice.findIndex((item) => item.priority === lowest), 1);
      }
      speakNext();
    },
    shutter() {
      play((at) => {
        noise(at, 0.035, 'highpass', 2500, 0.7);
        noise(at + 0.07, 0.05, 'bandpass', 1800, 0.5);
      });
    },
    chime() {
      play((at) => [76, 79, 84].forEach((n, i) => tone(at + i * 0.08, midi(n), 0.7, 0.18)));
    },
    pop() {
      play((at) => {
        const osc = tone(at, 520, 0.12, 0.2);
        osc.frequency.exponentialRampToValueAtTime(1100, at + 0.08);
      });
    },
    whoosh() {
      play((at) => {
        const filter = noise(at, 0.7, 'bandpass', 300, 0.35);
        filter.frequency.exponentialRampToValueAtTime(2600, at + 0.6);
      });
    },
    fanfare() {
      play((at) => {
        [[60, 64, 67], [65, 69, 72], [67, 71, 74, 79]].forEach((chord, i) => {
          for (const n of chord) tone(at + i * 0.22, midi(n), i === 2 ? 1.4 : 0.3, 0.09, 'sawtooth');
        });
      });
    },
  };
}
