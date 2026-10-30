// 背景：群れの履歴。
// しまの作品の系譜（Boids）と、Hyphae の「形が流量の履歴になる」から。
// 群れは描かず、通った跡だけを薄く残す。よく通った所ほど跡が濃く、時間で淡く消える。
// 近さの規則は距離ではなく「近い 7 羽だけを見る」（位相的な近傍）にした。
(() => {
  const cv = document.getElementById("field");
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext("2d", { alpha: false });
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SCALE = 0.5;          // 画面の半分の解像度で描いて引き伸ばす（軽さと柔らかさ）
  const K = 7;                // 見る隣の数
  const BG = "#0a0a0a";
  let W = 0, H = 0, boids = [], pointer = null, frame = 0;

  const resize = () => {
    W = cv.width = Math.max(1, Math.round(innerWidth * SCALE));
    H = cv.height = Math.max(1, Math.round(innerHeight * SCALE));
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    const n = innerWidth < 720 ? 34 : 60;
    boids = Array.from({ length: n }, () => {
      const a = Math.random() * Math.PI * 2;
      return { x: Math.random() * W, y: Math.random() * H, vx: Math.cos(a) * .5, vy: Math.sin(a) * .5, px: 0, py: 0 };
    });
    boids.forEach((b) => { b.px = b.x; b.py = b.y; });
  };

  const d = new Float32Array(128), idx = new Uint8Array(128);
  const step = () => {
    const n = boids.length;
    for (let i = 0; i < n; i++) {
      const b = boids[i];
      for (let j = 0; j < n; j++) {
        const o = boids[j];
        let dx = o.x - b.x, dy = o.y - b.y;
        if (dx > W / 2) dx -= W; else if (dx < -W / 2) dx += W;
        if (dy > H / 2) dy -= H; else if (dy < -H / 2) dy += H;
        d[j] = i === j ? Infinity : dx * dx + dy * dy; idx[j] = j;
      }
      // 近い K 羽を選ぶ（部分選択）
      for (let a = 0; a < K; a++) {
        let m = a;
        for (let c = a + 1; c < n; c++) if (d[idx[c]] < d[idx[m]]) m = c;
        const t = idx[a]; idx[a] = idx[m]; idx[m] = t;
      }
      let ax = 0, ay = 0, cx = 0, cy = 0, sx = 0, sy = 0;
      for (let a = 0; a < K; a++) {
        const o = boids[idx[a]];
        let dx = o.x - b.x, dy = o.y - b.y;
        if (dx > W / 2) dx -= W; else if (dx < -W / 2) dx += W;
        if (dy > H / 2) dy -= H; else if (dy < -H / 2) dy += H;
        ax += o.vx; ay += o.vy; cx += dx; cy += dy;
        const q = d[idx[a]];
        if (q < 64) { sx -= dx / (q + 1); sy -= dy / (q + 1); }
      }
      b.vx += (ax / K - b.vx) * .03 + cx / K * .0009 + sx * .25;
      b.vy += (ay / K - b.vy) * .03 + cy / K * .0009 + sy * .25;
      if (pointer) { // 見る人の手から少し離れる
        const dx = b.x - pointer.x, dy = b.y - pointer.y, q = dx * dx + dy * dy;
        if (q < 1600) { b.vx += dx / (q + 20) * .6; b.vy += dy / (q + 20) * .6; }
      }
      const s = Math.hypot(b.vx, b.vy) || 1, v = Math.min(Math.max(s, .35), .8);
      b.vx = b.vx / s * v; b.vy = b.vy / s * v;
    }
    for (const b of boids) {
      b.px = b.x; b.py = b.y; b.x += b.vx; b.y += b.vy;
      if (b.x < 0) { b.x += W; b.px = b.x; } else if (b.x >= W) { b.x -= W; b.px = b.x; }
      if (b.y < 0) { b.y += H; b.py = b.y; } else if (b.y >= H) { b.y -= H; b.py = b.y; }
    }
  };

  const draw = () => {
    if (frame % 3 === 0) { ctx.fillStyle = "rgba(10,10,10,0.05)"; ctx.fillRect(0, 0, W, H); }
    ctx.strokeStyle = "rgba(200,200,200,0.16)"; ctx.lineWidth = .6;
    ctx.beginPath();
    for (const b of boids) { ctx.moveTo(b.px, b.py); ctx.lineTo(b.x, b.y); }
    ctx.stroke();
    frame++;
  };

  resize();
  addEventListener("resize", () => { clearTimeout(resize.t); resize.t = setTimeout(() => { resize(); if (reduce) still(); }, 200); });

  // 動きを減らす設定のときは、しばらく流した跡を一枚だけ描いて止める
  const still = () => { for (let i = 0; i < 360; i++) { step(); draw(); } };
  if (reduce) { still(); return; }

  addEventListener("pointermove", (e) => { pointer = { x: e.clientX * SCALE, y: e.clientY * SCALE }; }, { passive: true });
  addEventListener("pointerleave", () => { pointer = null; });

  let last = 0, running = true;
  window.__field = { frames: 0 };
  const loop = (t) => {
    if (!running) return;
    requestAnimationFrame(loop);
    if (t - last < 32) return; // 30fps で十分
    last = t; step(); draw(); window.__field.frames++;
  };
  requestAnimationFrame(loop);
  document.addEventListener("visibilitychange", () => {
    const was = running;
    running = !document.hidden;
    if (running && !was) requestAnimationFrame(loop);
  });
})();
