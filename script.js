const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

const PERF = { lowEnd: false, scrolling: false };
const STORAGE = {
  perfLow: "lv_perf_low",
  volume: "lv_volume",
  shuffle: "lv_shuffle",
  muted: "lv_muted",
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function getPerfProfile() {
  const cores = Number(navigator.hardwareConcurrency || 0);
  const mem = Number(navigator.deviceMemory || 0);
  const saveData = Boolean(navigator.connection?.saveData);
  const stored = window.localStorage?.getItem(STORAGE.perfLow);
  const forcedLow = stored === "1";
  const forcedHigh = stored === "0";
  const autoLow = prefersReducedMotion || saveData || (cores > 0 && cores <= 4) || (mem > 0 && mem <= 4);
  const lowEnd = forcedHigh ? false : forcedLow ? true : autoLow;
  return { lowEnd };
}

function setupToast() {
  const toast = document.getElementById("toast");
  if (!(toast instanceof HTMLElement)) return { show: () => {} };

  let timer = 0;
  const show = (message, ms = 2800) => {
    if (timer) window.clearTimeout(timer);
    toast.textContent = String(message || "");
    toast.dataset.show = "true";
    timer = window.setTimeout(() => {
      delete toast.dataset.show;
    }, ms);
  };

  return { show };
}

function setupReveal() {
  const items = Array.from(document.querySelectorAll(".reveal"));
  if (prefersReducedMotion) {
    for (const el of items) el.classList.add("is-in");
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12 }
  );

  for (const el of items) io.observe(el);
}

function setupFloatingHearts() {
  let last = 0;
  let alive = 0;
  const onPointer = (ev) => {
    if (prefersReducedMotion) return;
    const now = performance.now();
    const minGap = PERF.lowEnd ? 180 : 90;
    if (now - last < minGap) return;
    last = now;
    const x = ev.clientX ?? (ev.touches?.[0]?.clientX ?? window.innerWidth / 2);
    const y = ev.clientY ?? (ev.touches?.[0]?.clientY ?? window.innerHeight / 2);

    const count = PERF.lowEnd ? 1 + Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i += 1) {
      if (alive > (PERF.lowEnd ? 10 : 22)) return;
      const heart = document.createElement("div");
      heart.className = "float-heart";
      heart.style.left = `${x + rand(-10, 10)}px`;
      heart.style.top = `${y + rand(-8, 8)}px`;
      heart.style.animationDuration = `${rand(1.1, 1.65)}s`;
      heart.style.transform = `translate(-50%, -50%) rotate(45deg) scale(${rand(0.85, 1.2)})`;
      heart.style.filter = `drop-shadow(0 12px 18px rgba(255, 95, 162, ${rand(0.12, 0.26)}))`;
      document.body.appendChild(heart);
      alive += 1;
      window.setTimeout(() => {
        heart.remove();
        alive = Math.max(0, alive - 1);
      }, 1900);
    }
  };

  document.addEventListener("click", onPointer, { passive: true });
  document.addEventListener("touchstart", onPointer, { passive: true });
}

function setupModal(lines) {
  const modal = document.getElementById("modal");
  const btn = document.getElementById("surpriseBtn");
  const ok = document.getElementById("modalOk");
  const more = document.getElementById("modalMore");
  const line = document.getElementById("modalLine");

  const pool = Array.isArray(lines) ? lines.filter(Boolean) : [];
  let last = "";

  const pick = () => {
    if (!(line instanceof HTMLElement)) return;
    if (!pool.length) {
      line.textContent = "Shalini, tum mere ishq ka sabse haseen asar ho.";
      return;
    }
    let next = last;
    for (let i = 0; i < 6 && next === last; i += 1) next = pool[Math.floor(Math.random() * pool.length)];
    last = next;
    line.textContent = next;
  };

  const open = () => {
    modal.dataset.open = "true";
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    pick();
  };

  const close = () => {
    delete modal.dataset.open;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  btn?.addEventListener("click", open);
  ok?.addEventListener("click", close);
  more?.addEventListener("click", pick);

  modal?.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.close === "true") close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.dataset.open === "true") close();
  });

  return { open, close };
}

function setupMusic() {
  const audio = document.getElementById("bgMusic");
  const toggle = document.getElementById("musicToggle");
  if (!(audio instanceof HTMLAudioElement) || !(toggle instanceof HTMLButtonElement)) {
    return { tryAuto: async () => {}, play: async () => {}, pause: () => {} };
  }

  let isOn = false;
  let hasError = false;
  let toastRef = null;
  const storedMuted = window.localStorage?.getItem(STORAGE.muted);
  audio.muted = storedMuted === "1" ? true : false;
  const storedVol = Number(window.localStorage?.getItem(STORAGE.volume));
  if (!Number.isNaN(storedVol)) audio.volume = clamp(storedVol, 0, 1);
  else audio.volume = 0.6;

  const setSource = (src) => {
    hasError = false;
    audio.src = String(src || "");
    audio.load();
    render();
  };

  const render = () => {
    toggle.dataset.on = isOn ? "true" : "false";
    toggle.setAttribute("aria-pressed", isOn ? "true" : "false");
    const label = toggle.querySelector(".chip__text");
    if (!label) return;
    if (hasError) label.textContent = "Music: Unavailable";
    else label.textContent = `Music: ${isOn ? "On" : "Tap"}`;
  };

  const play = async (opts = {}) => {
    try {
      if (hasError) return false;
      toastRef = opts?.toast ?? toastRef;
      if (opts?.toast) opts.toast.show("Starting music…", 1400);
      if (window.localStorage?.getItem(STORAGE.muted) !== "1") audio.muted = false;
      if (!Number.isFinite(audio.volume) || audio.volume <= 0) audio.volume = 0.8;
      await audio.play();
      isOn = true;
      render();
      return true;
    } catch (err) {
      isOn = false;
      render();
      const name = err?.name || "";
      if (opts?.toast) {
        if (name === "NotAllowedError") opts.toast.show("Tap Play/Music once to start.", 3200);
        else if (name === "NotSupportedError") opts.toast.show("Song format not supported.", 3200);
        else opts.toast.show("Music could not start. Tap once and try again.", 3200);
      }
      return false;
    }
  };

  const pause = () => {
    audio.pause();
    isOn = false;
    render();
  };

  const tryAuto = async (opts = {}) => {
    try {
      if (hasError) return false;
      toastRef = opts?.toast ?? toastRef;
      audio.muted = true;
      await audio.play();
      window.setTimeout(() => {
        if (window.localStorage?.getItem(STORAGE.muted) !== "1") audio.muted = false;
      }, 200);
      isOn = true;
      render();
      return true;
    } catch (err) {
      audio.muted = false;
      isOn = false;
      render();
      if (opts?.toast) {
        const name = err?.name || "";
        if (name === "NotAllowedError") opts.toast.show("Tap Play/Music once to start.", 3200);
        else opts.toast.show("Tap once to enable music.", 3200);
      }
      return false;
    }
  };

  toggle.addEventListener("click", () => {
    if (isOn) pause();
    else play();
  });

  audio.addEventListener("error", () => {
    hasError = true;
    isOn = false;
    render();
    toastRef?.show?.("Song not loading. Check file name + refresh.", 3600);
  });

  audio.addEventListener("playing", () => {
    hasError = false;
    isOn = true;
    render();
  });

  audio.addEventListener("pause", () => {
    if (!audio.ended) {
      isOn = false;
      render();
    }
  });

  render();

  return {
    tryAuto,
    play,
    pause,
    setSource,
    get hasError() {
      return hasError;
    },
    get isOn() {
      return isOn;
    },
  };
}

function setupPlaylist(music, toast) {
  const audio = document.getElementById("bgMusic");
  if (!(audio instanceof HTMLAudioElement)) return;
  if (!music?.setSource) return;

  const raw = String(audio.dataset.playlist || "");
  const list = raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  if (list.length < 1) return;

  let index = 0;
  const listeners = new Set();
  let shuffle = window.localStorage?.getItem(STORAGE.shuffle) === "1";

  const toUrl = (name) => `./${encodeURIComponent(name)}`;
  const currentName = () => {
    const src = audio.getAttribute("src") || audio.currentSrc || "";
    const last = src.split("/").pop() || "";
    try {
      return decodeURIComponent(last.split("?")[0]);
    } catch {
      return last.split("?")[0];
    }
  };

  const setIndex = (i) => {
    index = ((i % list.length) + list.length) % list.length;
    const active = list[index];
    const cur = currentName();
    if (!cur || cur.toLowerCase() !== String(active).toLowerCase()) {
      music.setSource(toUrl(active));
    }
    for (const cb of listeners) cb({ index, name: list[index], list: [...list], shuffle });
  };

  const cur = currentName();
  const found = cur ? list.findIndex((x) => x.toLowerCase() === String(cur).toLowerCase()) : -1;
  setIndex(found >= 0 ? found : 0);

  audio.addEventListener("ended", async () => {
    if (shuffle && list.length > 1) {
      let next = index;
      while (next === index) next = Math.floor(Math.random() * list.length);
      setIndex(next);
    } else {
      setIndex(index + 1);
    }
    toast?.show(`Now playing: ${list[index]}`, 2200);
    if (music.isOn && !music.hasError) await music.play({ toast });
  });

  audio.addEventListener("error", async () => {
    setIndex(index + 1);
    if (music.isOn && !music.hasError) await music.play({ toast });
  });

  const setTrackByName = (name) => {
    const idx = list.findIndex((x) => x.toLowerCase() === String(name).toLowerCase());
    if (idx === -1) return false;
    setIndex(idx);
    return true;
  };

  const next = () => {
    if (shuffle && list.length > 1) {
      let n = index;
      while (n === index) n = Math.floor(Math.random() * list.length);
      setIndex(n);
    } else setIndex(index + 1);
  };

  const prev = () => {
    if (shuffle && list.length > 1) {
      let n = index;
      while (n === index) n = Math.floor(Math.random() * list.length);
      setIndex(n);
    } else setIndex(index - 1);
  };

  const setShuffle = (value) => {
    shuffle = Boolean(value);
    window.localStorage?.setItem(STORAGE.shuffle, shuffle ? "1" : "0");
    for (const cb of listeners) cb({ index, name: list[index], list: [...list], shuffle });
  };

  const onChange = (cb) => {
    if (typeof cb !== "function") return () => {};
    listeners.add(cb);
    cb({ index, name: list[index], list: [...list], shuffle });
    return () => listeners.delete(cb);
  };

  return {
    list: [...list],
    get index() {
      return index;
    },
    get name() {
      return list[index];
    },
    get shuffle() {
      return shuffle;
    },
    setTrackByName,
    next,
    prev,
    setShuffle,
    onChange,
  };
}

function setupPlaylistUI(playlist, music, toast) {
  if (!playlist) return;
  const now = document.getElementById("nowPlaying");
  const tracks = Array.from(document.querySelectorAll("[data-track]"));

  const setActive = (activeName) => {
    for (const el of tracks) {
      if (!(el instanceof HTMLElement)) continue;
      const name = el.dataset.track || "";
      el.classList.toggle("is-active", name === activeName);
    }
    if (now instanceof HTMLElement) now.textContent = `Now playing: ${activeName}`;
  };

  playlist.onChange(({ name }) => setActive(name));

  for (const el of tracks) {
    if (!(el instanceof HTMLElement)) continue;
    el.addEventListener("click", async () => {
      const name = el.dataset.track || "";
      if (!name) return;
      playlist.setTrackByName(name);
      toast?.show(`Now playing: ${name}`, 1800);
      if (!music?.hasError) await music.play({ toast });
    });
  }
}

function setupPerfToggle(toast) {
  const btn = document.getElementById("perfToggle");
  if (!(btn instanceof HTMLButtonElement)) return;

  const stored = window.localStorage?.getItem(STORAGE.perfLow);
  const isForcedLow = stored === "1";
  const isForcedHigh = stored === "0";
  const on = isForcedLow ? true : isForcedHigh ? false : PERF.lowEnd;
  btn.dataset.on = on ? "true" : "false";
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  const label = btn.querySelector(".chip__text");
  if (label) label.textContent = `Lite: ${on ? "On" : "Off"}`;

  btn.addEventListener("click", () => {
    const next = on ? "0" : "1";
    window.localStorage?.setItem(STORAGE.perfLow, next);
    toast?.show("Applying performance mode…", 1600);
    window.setTimeout(() => window.location.reload(), 250);
  });
}

function setupTypingLetter() {
  const el = document.getElementById("typedLetter");
  const retype = document.getElementById("retypeBtn");
  if (!(el instanceof HTMLElement)) return { start: () => {} };

  const letter =
    "Shalini,\n\n" +
    "Main tumhe likhta hoon, kyunki tumhari yaad mere andar roshni jaisi hai.\n" +
    "Tumhari har baat mein ek narm sa sukoon hai, jo mere shor ko bhi chup kara deta hai.\n\n" +
    "Kabhi kabhi lagta hai, meri dhadkan tumhara naam le kar hi chalti hai —\n" +
    "jaise ishq ne mere dil par tumhara pata likh diya ho.\n\n" +
    "Agar tum muskura do, toh meri duniya mehek uthti hai.\n" +
    "Agar tum khamosh ho jao, toh meri rooh tumhe pukaarne lagti hai.\n\n" +
    "Main tumhare saath har din ko ek kahani banana chahta hoon.\n" +
    "Bas tum… meri ho, meri hi raho.\n\n" +
    "— Tumhara";

  let timer = 0;
  let i = 0;
  let started = false;

  const clear = () => {
    if (timer) window.clearTimeout(timer);
    timer = 0;
  };

  const typeNext = () => {
    const next = letter.slice(0, i + 1);
    el.textContent = next;
    i += 1;

    if (i >= letter.length) {
      clear();
      return;
    }

    const ch = letter[i - 1];
    const base = 22;
    const jitter = rand(0, 16);
    const pause =
      ch === "\n" ? 220 : ch === "." || ch === "—" ? 240 : ch === "," ? 140 : ch === "?" ? 260 : 0;

    timer = window.setTimeout(typeNext, base + jitter + pause);
  };

  const start = () => {
    if (prefersReducedMotion) {
      el.textContent = letter;
      started = true;
      return;
    }
    clear();
    i = 0;
    el.textContent = "";
    started = true;
    typeNext();
  };

  retype?.addEventListener("click", start);
  return { start };
}

function setupEnvelope(typing, toast) {
  const envelope = document.getElementById("envelope");
  const seal = document.getElementById("envelopeSeal");
  const modal = document.getElementById("letterModal");
  if (!(envelope instanceof HTMLElement) || !(seal instanceof HTMLButtonElement) || !(modal instanceof HTMLElement)) return;

  const open = () => {
    modal.classList.remove("is-anim");
    modal.dataset.open = "true";
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    envelope.setAttribute("aria-expanded", "true");
    toast?.show("A letter just for Shalini…", 2000);
    window.requestAnimationFrame(() => modal.classList.add("is-anim"));
    window.setTimeout(() => typing?.start?.(), 180);
  };

  const close = () => {
    modal.classList.remove("is-anim");
    delete modal.dataset.open;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  seal.addEventListener("click", open);
  envelope.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") open();
  });

  modal.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.close === "true") close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.dataset.open === "true") close();
  });
}

function setupCanvasBackground() {
  const canvas = document.getElementById("bgCanvas");
  if (!(canvas instanceof HTMLCanvasElement)) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = PERF.lowEnd ? 1 : Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const state = {
    w: 0,
    h: 0,
    t: 0,
    hearts: [],
    stars: [],
  };

  const resize = () => {
    const { innerWidth: w, innerHeight: h } = window;
    state.w = w;
    state.h = h;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const heartsTarget = PERF.lowEnd
      ? clamp(Math.floor((w * h) / 78000), 10, 22)
      : clamp(Math.floor((w * h) / 38000), 18, 48);
    const starsTarget = PERF.lowEnd
      ? clamp(Math.floor((w * h) / 52000), 14, 34)
      : clamp(Math.floor((w * h) / 24000), 26, 70);
    state.hearts = Array.from({ length: heartsTarget }, () => makeHeart(w, h));
    state.stars = Array.from({ length: starsTarget }, () => makeStar(w, h));
  };

  const makeHeart = (w, h) => ({
    x: rand(0, w),
    y: rand(0, h),
    r: rand(4, 10),
    vy: rand(0.22, 0.7),
    vx: rand(-0.12, 0.12),
    rot: rand(0, Math.PI * 2),
    vr: rand(-0.008, 0.008),
    a: rand(0.15, 0.32),
    hue: rand(320, 355),
  });

  const makeStar = (w, h) => ({
    x: rand(0, w),
    y: rand(0, h),
    r: rand(0.6, 1.7),
    a: rand(0.08, 0.25),
    tw: rand(0.003, 0.012),
    phase: rand(0, Math.PI * 2),
  });

  const drawHeart = (x, y, size, rot, alpha, hue) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `hsla(${hue}, 92%, 70%, ${alpha})`;
    ctx.shadowColor = `hsla(${hue}, 92%, 70%, ${alpha})`;
    ctx.shadowBlur = PERF.lowEnd ? 8 : 14;
    const s = size;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.15);
    ctx.bezierCurveTo(s * 0.5, -s * 0.75, s * 1.2, -s * 0.1, 0, s * 0.95);
    ctx.bezierCurveTo(-s * 1.2, -s * 0.1, -s * 0.5, -s * 0.75, 0, -s * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const targetFps = PERF.lowEnd ? 30 : 60;
  const frameMs = 1000 / targetFps;
  let last = 0;
  let running = true;

  const tick = (now = 0) => {
    if (!running) return;
    if (!prefersReducedMotion) window.requestAnimationFrame(tick);
    if (!now) return;
    if (now - last < frameMs) return;
    last = now;
    if (PERF.scrolling) return;
    state.t += 1;
    ctx.clearRect(0, 0, state.w, state.h);

    for (const s of state.stars) {
      s.phase += s.tw;
      const a = s.a + Math.sin(s.phase) * 0.07;
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.shadowColor = "rgba(255,255,255,.55)";
      ctx.shadowBlur = PERF.lowEnd ? 6 : 10;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const h of state.hearts) {
      h.y -= h.vy;
      h.x += h.vx + Math.sin((state.t + h.x) * 0.002) * 0.12;
      h.rot += h.vr;

      if (h.y < -20) {
        h.y = state.h + 20;
        h.x = rand(0, state.w);
      }
      if (h.x < -40) h.x = state.w + 40;
      if (h.x > state.w + 40) h.x = -40;

      drawHeart(h.x, h.y, h.r, h.rot, h.a, h.hue);
    }
  };

  resize();
  window.addEventListener("resize", resize, { passive: true });

  if (PERF.lowEnd) {
    ctx.clearRect(0, 0, state.w, state.h);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "rgba(255,255,255,1)";
    for (const s of state.stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const h of state.hearts) {
      drawHeart(h.x, h.y, h.r, h.rot, h.a * 0.85, h.hue);
    }
    return;
  }

  if (prefersReducedMotion) {
    tick();
    return;
  }
  const onVisibility = () => {
    running = document.visibilityState !== "hidden";
    if (running) {
      last = 0;
      window.requestAnimationFrame(tick);
    }
  };
  document.addEventListener("visibilitychange", onVisibility, { passive: true });
  window.requestAnimationFrame(tick);
}

function setupSurpriseMusicBridge(music) {
  const btn = document.getElementById("surpriseBtn");
  if (!(btn instanceof HTMLButtonElement)) return;
  btn.addEventListener("click", () => music.play(), { once: true });
}

function setupScrollProgress() {
  const bar = document.getElementById("scrollProgress");
  if (!(bar instanceof HTMLElement)) return;

  let raf = 0;
  let timer = 0;
  const update = () => {
    raf = 0;
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    const v = Math.max(0, Math.min(1, window.scrollY / max));
    bar.style.transform = `scaleX(${v})`;
  };

  const onScroll = () => {
    PERF.scrolling = true;
    document.body.classList.add("is-scrolling");
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      PERF.scrolling = false;
      document.body.classList.remove("is-scrolling");
    }, 160);
    if (raf) return;
    raf = window.requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
}

function init() {
  Object.assign(PERF, getPerfProfile());
  if (PERF.lowEnd) document.body.classList.add("perf-low");
  const toast = setupToast();
  setupPerfToggle(toast);
  setupScrollProgress();
  setupCanvasBackground();
  setupReveal();
  setupFloatingHearts();
  const typing = setupTypingLetter();
  setupEnvelope(typing, toast);
  const shayariLines = Array.from(document.querySelectorAll(".shayari p"))
    .map((el) => (el instanceof HTMLElement ? el.innerText.trim() : ""))
    .filter(Boolean);
  setupModal(shayariLines);
  const music = setupMusic();
  setupSurpriseMusicBridge(music);
  const playlist = setupPlaylist(music, toast);
  setupPlaylistUI(playlist, music, toast);

  music.tryAuto({ toast });

  const firstGesture = () => {
    if (!music.isOn && !music.hasError) music.play({ toast });
    window.removeEventListener("pointerdown", firstGesture);
    window.removeEventListener("keydown", firstGesture);
  };
  window.addEventListener("pointerdown", firstGesture, { once: true });
  window.addEventListener("keydown", firstGesture, { once: true });
}

document.addEventListener("DOMContentLoaded", init);
