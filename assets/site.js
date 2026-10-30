// ポートフォリオ（仮）— 言語・暗転の遷移・「反応が先、言葉は後」の出し方
(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── 言語（ja / en）。選んだ方をこの端末にだけ覚える
  const store = {
    get() { try { return localStorage.getItem("lang"); } catch { return null; } },
    set(v) { try { localStorage.setItem("lang", v); } catch {} },
  };
  const setLang = (lang) => {
    root.dataset.lang = lang;
    root.lang = lang;
    const t = document.querySelector("meta[name='title-" + lang + "']");
    if (t) document.title = t.content;
    document.querySelectorAll(".lang button").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  };
  setLang(store.get() === "en" ? "en" : "ja");
  document.querySelectorAll(".lang button").forEach((b) =>
    b.addEventListener("click", () => { setLang(b.dataset.lang); store.set(b.dataset.lang); }));

  // ── 暗転の遷移：黒から入り、黒へ出る
  const show = () => body.classList.remove("enter", "leaving");
  requestAnimationFrame(() => requestAnimationFrame(show));
  addEventListener("pageshow", (e) => { if (e.persisted) show(); });
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || reduce) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
    e.preventDefault();
    body.classList.add("leaving");
    setTimeout(() => { location.href = a.href; }, 420);
  });

  // ── 網点：一覧の絵に、網点の面（.ht）を重ねる。絵の寄せ方（cover）は元の img と同じ。
  //    注意の先は 1 枚だけ：触れている／フォーカスしている絵。なければ、画面の中心にいちばん近い絵。その 1 枚が像になる
  if (!reduce) {
    const hosts = [];
    let hovered = null, focused = null, raf = 0, ready = false;
    const attend = () => {
      raf = 0;
      if (!ready) return;
      let target = hovered || focused;
      if (!target) {
        const cx = innerWidth / 2, cy = innerHeight / 2; let best = Infinity;
        hosts.forEach((h) => {
          const r = h.getBoundingClientRect();
          if (r.bottom < 0 || r.top > innerHeight) return;
          const d = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy);
          if (d < best) { best = d; target = h; }
        });
      }
      hosts.forEach((h) => h.classList.toggle("near", h === target));
    };
    const ask = () => { if (!raf) raf = requestAnimationFrame(attend); };
    document.querySelectorAll(".glimpses a img, .work .frame img").forEach((img) => {
      const host = img.parentElement;
      const mk = () => {
        if (host.querySelector(":scope > .ht")) return;
        const src = img.currentSrc || img.src;
        if (!src) return;
        const ht = document.createElement("span");
        ht.className = "ht"; ht.setAttribute("aria-hidden", "true");
        ht.style.setProperty("--ht-img", "url(\"" + src + "\")");
        ht.style.setProperty("--ht-inset", getComputedStyle(host).padding);
        // 絵ごとの平均の明るさに合わせて、粒の出方をそろえる（明るい絵が白く飽和しない／暗い絵が消えない）
        try {
          const c = document.createElement("canvas"); c.width = c.height = 24;
          const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0, 24, 24);
          const d = g.getImageData(0, 0, 24, 24).data; let s = 0;
          for (let i = 0; i < d.length; i += 4) s += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
          const n = d.length / 4, m = Math.max(0.05, s / n);
          let v = 0; for (let i = 0; i < d.length; i += 4) v += ((0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255 - m) ** 2;
          const b = Math.min(3, Math.max(0.55, 0.5 / m)), sd = Math.sqrt(v / n) * b;
          ht.style.setProperty("--ht-b", b.toFixed(2));
          ht.style.setProperty("--ht-pc", Math.min(3.5, Math.max(1, 0.2 / Math.max(0.03, sd))).toFixed(2)); // ばらつきの小さい絵は階調を伸ばす
        } catch {}
        ht.innerHTML = '<span class="ht-in"><i></i><b></b></span>';
        host.classList.add("ht-host");
        host.appendChild(ht);
        hosts.push(host);
        const link = host.closest("a");
        if (link) {
          link.addEventListener("mouseenter", () => { hovered = host; ask(); });
          link.addEventListener("mouseleave", () => { if (hovered === host) hovered = null; ask(); });
          link.addEventListener("focusin", () => { if (link.matches(":focus-visible")) { focused = host; ask(); } });
          link.addEventListener("focusout", () => { if (focused === host) focused = null; ask(); });
        }
        ask();
      };
      img.complete && img.naturalWidth ? mk() : img.addEventListener("load", mk, { once: true });
    });
    addEventListener("scroll", ask, { passive: true });
    addEventListener("resize", ask);
    // 絵が出きって、網点が見えてから、注意が 1 枚に向かう（「呼ぶ」）
    setTimeout(() => { ready = true; ask(); }, 2400);
    window.__attend = { hosts, get target() { return hosts.find((h) => h.classList.contains("near")) || null; } };
  }

  // ── 反応が先、言葉は後：絵は先に出て、言葉は見る人が動いたあと（遅くとも 3.2 秒後）に出る
  if (reduce) { body.classList.add("seen", "spoken"); return; }
  setTimeout(() => body.classList.add("seen"), 500);
  let spoken = false;
  const speak = () => {
    if (spoken) return; spoken = true;
    setTimeout(() => body.classList.add("spoken"), 700);
  };
  ["pointermove", "keydown", "scroll", "touchstart"].forEach((ev) =>
    addEventListener(ev, speak, { once: true, passive: true }));
  setTimeout(speak, 2500);
})();
