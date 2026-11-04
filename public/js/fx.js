// Camera flashes, sparkles, hearts and confetti on one canvas over the stage.
// The loop runs only while something is on screen.

const COLORS = ['#ff4f9a', '#ffd166', '#5ee7ff', '#ffffff', '#b388ff', '#7cf5a3'];

export function createFx(canvas) {
  const ctx = canvas.getContext('2d');
  const parts = [];
  let running = false;
  let last = 0;

  function star(x, y, r, alpha, color) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const radius = i % 2 === 0 ? r : r * 0.22;
      const angle = (Math.PI / 4) * i;
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function heart(x, y, size, alpha, color) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.translate(x, y);
    ctx.scale(size / 20, size / 20);
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-14, -4, -8, -16, 0, -8);
    ctx.bezierCurveTo(8, -16, 14, -4, 0, 6);
    ctx.fill();
    ctx.restore();
  }

  function draw(p, t) {
    const k = p.age / p.life;
    if (p.kind === 'flash') {
      const r = p.size * (0.6 + k * 0.8);
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      glow.addColorStop(0, `rgba(255,255,255,${0.95 * (1 - k)})`);
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      star(p.x, p.y, r * 0.9, 1 - k, '#ffffff');
    } else if (p.kind === 'sparkle') {
      star(p.x, p.y, p.size * (1 - k * 0.5), 1 - k, p.color);
    } else if (p.kind === 'heart') {
      heart(p.x + Math.sin(t / 220 + p.phase) * 10, p.y, p.size, 1 - k, p.color);
    } else if (p.kind === 'confetti') {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - k) * 3);
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin * p.age);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
  }

  function frame(t) {
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life) {
        parts.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      draw(p, t);
    }
    if (parts.length) {
      requestAnimationFrame(frame);
    } else {
      running = false;
      last = 0;
    }
  }

  function add(p) {
    parts.push({ age: 0, vx: 0, vy: 0, gravity: 0, phase: Math.random() * 6, ...p });
    if (parts.length > 900) parts.splice(0, parts.length - 900);
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  const color = () => COLORS[Math.floor(Math.random() * COLORS.length)];

  return {
    flash(x, y, size = 110) {
      add({ kind: 'flash', x, y, size, life: 0.32 });
    },
    sparkle(x, y, n = 12, spread = 60) {
      for (let i = 0; i < n; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const v = 40 + Math.random() * spread * 2;
        add({ kind: 'sparkle', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, size: 8 + Math.random() * 12, color: color(), life: 0.7 + Math.random() * 0.5 });
      }
    },
    hearts(x, y, n = 4) {
      for (let i = 0; i < n; i += 1) {
        add({ kind: 'heart', x: x + (Math.random() - 0.5) * 50, y, vy: -120 - Math.random() * 90, size: 18 + Math.random() * 16, color: Math.random() < 0.7 ? '#ff4f9a' : '#ff8fc0', life: 1.4 + Math.random() * 0.6 });
      }
    },
    confetti(n = 160) {
      for (let i = 0; i < n; i += 1) {
        add({ kind: 'confetti', x: Math.random() * canvas.width, y: -40 - Math.random() * 600, vx: (Math.random() - 0.5) * 120, vy: 180 + Math.random() * 220, gravity: 60, size: 14 + Math.random() * 14, spin: (Math.random() - 0.5) * 12, color: color(), life: 5 + Math.random() * 2 });
      }
    },
  };
}
