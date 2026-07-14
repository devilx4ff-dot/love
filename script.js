// Detect low-end devices for performance optimizations
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let isLowEnd = isMobile;
try {
  const memory = navigator.deviceMemory;
  const cores = navigator.hardwareConcurrency;
  if (memory && memory < 4) isLowEnd = true;
  if (cores && cores < 4) isLowEnd = true;
} catch {}

if (isLowEnd) {
  document.body.classList.add('low-end');
}

const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

const sparkleColors = ['rgba(255,95,162,0.8)', 'rgba(180,140,255,0.8)', 'rgba(255,211,168,0.8)', 'rgba(255,46,95,0.8)'];

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
  if (prefersReducedMotion || !window.IntersectionObserver) {
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

function createSparkle(x, y) {
  const sparkle = document.createElement("div");
  sparkle.className = "sparkle";
  sparkle.style.left = `${x}px`;
  sparkle.style.top = `${y}px`;
  sparkle.style.animationDuration = `${rand(0.5, 1)}s`;
  const size = rand(4, 12);
  sparkle.style.width = `${size}px`;
  sparkle.style.height = `${size}px`;
  sparkle.style.background = `radial-gradient(circle, ${sparkleColors[Math.floor(rand(0, sparkleColors.length))]}, transparent)`;
  document.body.appendChild(sparkle);
  window.setTimeout(() => sparkle.remove(), 1000);
}

function setupFloatingHearts() {
  let lastBurstAt = 0;

  // isLowEnd already defined globally at top of file

  // Disable floating hearts entirely on very low-end devices for maximum performance
  if (isLowEnd) return;

  const onPointer = (ev) => {
    if (prefersReducedMotion) return;
    const target = ev.target;
    if (!(target instanceof Element)) return;
    if (!target.closest(".btn, .track, .media-card__frame")) return;

    const now = Date.now();
    if (now - lastBurstAt < (isLowEnd ? 400 : 220)) return;
    lastBurstAt = now;

    const x = ev.clientX ?? (ev.touches?.[0]?.clientX ?? window.innerWidth / 2);
    const y = ev.clientY ?? (ev.touches?.[0]?.clientY ?? window.innerHeight / 2);

    // Fewer sparkles on low-end
    const sparkleCount = isLowEnd ? 1 : 4;
    for (let i = 0; i < sparkleCount; i += 1) {
      createSparkle(x + rand(-15, 15), y + rand(-15, 15));
    }

    // Fewer hearts on low-end
    const count = isLowEnd ? 1 : (2 + Math.floor(Math.random() * 2));
    for (let i = 0; i < count; i += 1) {
      const heart = document.createElement("div");
      heart.className = "float-heart";
      heart.style.left = `${x + rand(-10, 10)}px`;
      heart.style.top = `${y + rand(-8, 8)}px`;
      heart.style.animationDuration = `${rand(0.9, 1.2)}s`;
      heart.style.transform = `translate(-50%, -50%) rotate(45deg) scale(${rand(0.8, 1.05)})`;
      // Remove filter for low-end
      if (!isLowEnd) {
        heart.style.filter = `drop-shadow(0 6px 10px rgba(255, 95, 162, ${rand(0.1, 0.2)}))`;
      }
      document.body.appendChild(heart);
      window.setTimeout(() => heart.remove(), 1200);
    }
  };

  document.addEventListener("click", onPointer, { passive: true });
}

function setupModal() {
  const modal = document.getElementById("modal");
  const btn = document.getElementById("surpriseBtn");
  const ok = document.getElementById("modalOk");

  const open = () => {
    modal.dataset.open = "true";
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    delete modal.dataset.open;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  btn?.addEventListener("click", open);
  ok?.addEventListener("click", close);

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

  // Keep music playing when tab is hidden/minimized
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && isOn && audio.paused) {
      // Try to resume playback if it accidentally paused
      audio.play().catch(() => {});
    }
  });

  const setSource = (src) => {
    hasError = false;
    audio.src = String(src || "");
    audio.load();
    render();
  };

  const render = () => {
    toggle.dataset.on = isOn ? "true" : "false";
    toggle.setAttribute("aria-pressed", isOn ? "true" : "false");
    toggle.setAttribute("aria-label", isOn ? "Pause music" : "Play music");
    const label = toggle.querySelector(".chip__text");
    if (!label) return;
    if (hasError) label.textContent = "Music: Unavailable";
    else label.textContent = `Music: ${isOn ? "On" : "Off"}`;
  };

  const play = async (opts = {}) => {
    try {
      if (hasError) return false;
      if (opts?.toast) opts.toast.show("Starting music…", 1400);
      audio.muted = false;
      audio.volume = 0.6;
      await audio.play();
      isOn = true;
      render();
      return true;
    } catch {
      isOn = false;
      render();
      if (opts?.toast) opts.toast.show("Music blocked — tap the Music button once.", 3200);
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
      audio.muted = true;
      await audio.play();
      window.setTimeout(() => {
        audio.muted = false;
        audio.volume = 0.6;
      }, 200);
      isOn = true;
      render();
      return true;
    } catch {
      audio.muted = false;
      isOn = false;
      render();
      if (opts?.toast) opts.toast.show("Tap anywhere to enable music.", 3200);
      return false;
    }
  };

  toggle.addEventListener("click", () => {
    if (isOn) pause();
    else play();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "m") {
      if (isOn) pause();
      else play();
      e.preventDefault();
    }
  });

  audio.addEventListener("error", () => {
    hasError = true;
    isOn = false;
    render();
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

  const toUrl = (name) => `./${encodeURIComponent(name)}`;

  const setIndex = (i) => {
    index = ((i % list.length) + list.length) % list.length;
    music.setSource(toUrl(list[index]));
    for (const cb of listeners) cb({ index, name: list[index], list: [...list] });
  };

  setIndex(0);

  audio.addEventListener("ended", async () => {
    setIndex(index + 1);
    toast?.show(`Now playing: ${list[index]}`, 2200);
    if (music.isOn && !music.hasError) await music.play({ toast });
  });

  audio.addEventListener("error", async () => {
    setIndex(index + 1);
    if (music.isOn && !music.hasError) await music.play({ toast });
  });

  const setTrackByName = (name) => {
    const idx = list.findIndex((x) => x.toLowerCase() === String(name).toLowerCase());
    if (idx === -1) {
      toast?.show(`Track not found: ${name}`, 2200);
      return false;
    }
    setIndex(idx);
    return true;
  };

  const onChange = (cb) => {
    if (typeof cb !== "function") return () => {};
    listeners.add(cb);
    cb({ index, name: list[index], list: [...list] });
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
    setTrackByName,
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
      const isActive = name === activeName;
      el.classList.toggle("is-active", isActive);
      el.setAttribute("aria-pressed", String(isActive));
    }
    if (now instanceof HTMLElement) now.textContent = `Now playing: ${activeName}`;
  };

  playlist.onChange(({ name }) => setActive(name));

  for (const el of tracks) {
    if (!(el instanceof HTMLElement)) continue;
    el.setAttribute("role", "button");
    el.setAttribute("aria-pressed", "false");
    el.addEventListener("click", async () => {
      const name = el.dataset.track || "";
      if (!name) return;
      playlist.setTrackByName(name);
      toast?.show(`Now playing: ${name}`, 1800);
      if (!music?.hasError) await music.play({ toast });
    });
  }
}

function setupTypingLetter() {
  const el = document.getElementById("typedLetter");
  const retype = document.getElementById("retypeBtn");
  const section = document.getElementById("letter");
  if (!(el instanceof HTMLElement) || !(section instanceof HTMLElement)) return;

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

  if (!window.IntersectionObserver || prefersReducedMotion) {
    start();
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (!started) start();
          io.disconnect();
        }
      }
    },
    { threshold: 0.25 }
  );

  io.observe(section);
}

function setupCanvasBackground() {
  const canvas = document.getElementById("bgCanvas");
  if (!(canvas instanceof HTMLCanvasElement)) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // On very low-end devices, just hide canvas entirely
  if (isLowEnd) {
    canvas.style.display = "none";
    return;
  }

  const dpr = Math.max(1, Math.min(isLowEnd ? 1 : 2, window.devicePixelRatio || 1));
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

    // Reduced particles for low-end devices
    const heartsTarget = clamp(Math.floor((w * h) / (isLowEnd ? 200000 : 92000)), isLowEnd ? 4 : 8, isLowEnd ? 10 : 18);
    const starsTarget = clamp(Math.floor((w * h) / (isLowEnd ? 120000 : 52000)), isLowEnd ? 8 : 14, isLowEnd ? 16 : 32);
    state.hearts = Array.from({ length: heartsTarget }, () => makeHeart(w, h));
    state.stars = Array.from({ length: starsTarget }, () => makeStar(w, h));
  };

  const makeHeart = (w, h) => ({
    x: rand(0, w),
    y: rand(0, h),
    r: rand(4, isLowEnd ? 8 : 10),
    vy: rand(0.08, isLowEnd ? 0.2 : 0.32),
    vx: rand(-0.03, 0.03),
    rot: rand(0, Math.PI * 2),
    vr: rand(-0.004, 0.004),
    a: rand(0.06, isLowEnd ? 0.14 : 0.18),
    hue: rand(320, 355),
  });

  const makeStar = (w, h) => ({
    x: rand(0, w),
    y: rand(0, h),
    r: rand(0.5, isLowEnd ? 1.2 : 1.7),
    a: rand(0.06, isLowEnd ? 0.18 : 0.25),
    tw: rand(0.002, isLowEnd ? 0.008 : 0.012),
    phase: rand(0, Math.PI * 2),
  });

  const drawHeart = (x, y, size, rot, alpha, hue) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `hsla(${hue}, 92%, 70%, ${alpha})`;
    // Remove shadows for low-end devices
    if (!isLowEnd) {
      ctx.shadowColor = `hsla(${hue}, 92%, 70%, ${alpha})`;
      ctx.shadowBlur = 10;
    }
    const s = size;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.15);
    ctx.bezierCurveTo(s * 0.5, -s * 0.75, s * 1.2, -s * 0.1, 0, s * 0.95);
    ctx.bezierCurveTo(-s * 1.2, -s * 0.1, -s * 0.5, -s * 0.75, 0, -s * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const tick = () => {
    state.t += 1;
    ctx.clearRect(0, 0, state.w, state.h);

    for (const s of state.stars) {
      s.phase += s.tw;
      const a = s.a + Math.sin(s.phase) * (isLowEnd ? 0.04 : 0.07);
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(255,255,255,1)";
      if (!isLowEnd) {
        ctx.shadowColor = "rgba(255,255,255,.4)";
        ctx.shadowBlur = 6;
      }
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const h of state.hearts) {
      h.y -= h.vy;
      h.x += h.vx + Math.sin((state.t + h.x) * 0.0015) * 0.04;
      h.rot += h.vr;

      if (h.y < -20) {
        h.y = state.h + 20;
        h.x = rand(0, state.w);
      }
      if (h.x < -40) h.x = state.w + 40;
      if (h.x > state.w + 40) h.x = -40;

      drawHeart(h.x, h.y, h.r, h.rot, h.a, h.hue);
    }

    if (!prefersReducedMotion) window.requestAnimationFrame(tick);
  };

  resize();
  window.addEventListener("resize", resize, { passive: true });

  if (prefersReducedMotion) {
    tick();
    return;
  }
  window.requestAnimationFrame(tick);
}

function setupMemoryVideos() {
  const videos = Array.from(document.querySelectorAll(".media-card video"));
  if (videos.length < 1) return;

  for (const video of videos) {
    if (!(video instanceof HTMLVideoElement)) continue;
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.playsInline = true;
  }

  if (!window.IntersectionObserver) {
    for (const video of videos) {
      if (video instanceof HTMLVideoElement) {
        video.play().catch(() => {});
      }
    }
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target;
        if (!(video instanceof HTMLVideoElement)) continue;
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      }
    },
    { threshold: 0.35 }
  );

  for (const video of videos) {
    if (video instanceof HTMLVideoElement) io.observe(video);
  }
}

function setupPWA() {
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const toast = setupToast();
    toast.show('Tap to install as app!', 5000);
    document.addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
          }
          deferredPrompt = null;
        });
      }
    }, { once: true });
  });
}

function setupSurpriseMusicBridge(music) {
  const btn = document.getElementById("surpriseBtn");
  if (!(btn instanceof HTMLButtonElement)) return;
  btn.addEventListener("click", () => music.play(), { once: true });
}

function setupLogin() {
  const loginOverlay = document.getElementById("loginOverlay");
  const loginForm = document.getElementById("loginForm");
  const passwordInput = document.getElementById("passwordInput");
  const loginError = document.getElementById("loginError");

  // Auto-format the password input as DD/MM/YY
  passwordInput.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, ""); // Remove all non-digit characters
    let formattedValue = "";

    if (value.length > 0) {
      formattedValue += value.substring(0, 2);
    }
    if (value.length > 2) {
      formattedValue += "/" + value.substring(2, 4);
    }
    if (value.length > 4) {
      // Handle both 2-digit and 4-digit year
      const year = value.substring(4);
      // If user types 4 digits, use last 2 for 2-digit format (e.g., 2026 → 26)
      formattedValue += "/" + year.slice(-2);
    }

    e.target.value = formattedValue;
  });

  // Check if already logged in
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  if (isLoggedIn === "true") {
    loginOverlay.dataset.hidden = "true";
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const password = passwordInput.value.trim();
    // Normalize: remove all non-digit characters
    const normalizedPassword = password.replace(/\D/g, "");
    // Check normalized versions: 040226 (6 digits) or 04022026 (8 digits)
    const isCorrect = (normalizedPassword === "040226" || normalizedPassword === "04022026" || normalizedPassword === "40226" || normalizedPassword === "4022026");
    if (isCorrect) {
      // Correct password!
      loginError.dataset.visible = "false";
      localStorage.setItem("isLoggedIn", "true");
      loginOverlay.dataset.hidden = "true";
    } else {
      // Wrong password
      loginError.dataset.visible = "true";
      passwordInput.value = "";
      passwordInput.focus();
      
      // Shake animation for input
      passwordInput.style.animation = "none";
      passwordInput.offsetHeight; // Trigger reflow
      passwordInput.style.animation = "shake 0.5s ease-in-out";
    }
  });
}

function setupCountdown() {
  const specialDate = new Date(2026, 1, 4); // February is month 1 (0-indexed)
  const daysEl = document.getElementById("countdown-days");
  const hoursEl = document.getElementById("countdown-hours");
  const minutesEl = document.getElementById("countdown-minutes");
  const secondsEl = document.getElementById("countdown-seconds");
  const countdownLabel = document.querySelector(".countdown__title");

  function updateCountdown() {
    const now = new Date();
    const diff = now - specialDate; // Calculate time since the date

    if (diff <= 0) {
      // If date is still in future (just in case)
      const days = Math.floor(-diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((-diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((-diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((-diff % (1000 * 60)) / 1000);

      daysEl.textContent = String(days).padStart(2, "0");
      hoursEl.textContent = String(hours).padStart(2, "0");
      minutesEl.textContent = String(minutes).padStart(2, "0");
      secondsEl.textContent = String(seconds).padStart(2, "0");
      countdownLabel.textContent = "04/02/2026 — Abhi Kitne Din Baaki?";
      return;
    }

    // Calculate time passed together
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const totalHours = Math.floor(diff / (1000 * 60 * 60));
    const hours = totalHours % 24;
    const totalMinutes = Math.floor(diff / (1000 * 60));
    const minutes = totalMinutes % 60;
    const totalSeconds = Math.floor(diff / 1000);
    const seconds = totalSeconds % 60;

    daysEl.textContent = String(days).padStart(2, "0");
    hoursEl.textContent = String(hours).padStart(2, "0");
    minutesEl.textContent = String(minutes).padStart(2, "0");
    secondsEl.textContent = String(seconds).padStart(2, "0");
    countdownLabel.textContent = "04/02/2026 — Humne Kitne Din Saath Bitaaye?";
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

function setupBottomPlayer(music, playlist, toast) {
  const bottomPlayer = document.getElementById("bottomPlayer");
  const playerTitle = document.getElementById("playerTitle");
  const playPauseBtn = document.getElementById("playPauseBtn");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const volumeSlider = document.getElementById("volumeSlider");
  const audio = document.getElementById("bgMusic");

  // Show bottom player when music starts
  const updatePlayerVisibility = () => {
    bottomPlayer.dataset.visible = music.isOn ? "true" : "false";
  };

  // Update play/pause button icon
  const updatePlayPauseBtn = () => {
    playPauseBtn.textContent = audio.paused ? "▶" : "⏸";
  };

  // Update track title when track changes
  const updateTrackTitle = () => {
    const trackName = playlist?.name || "No track playing";
    // Remove .mp3 extension for display
    playerTitle.textContent = trackName.replace(".mp3", "");
  };

  // Play/pause button click
  playPauseBtn.addEventListener("click", () => {
    if (audio.paused) {
      music.play({ toast });
    } else {
      music.pause();
    }
  });

  // Previous button
  prevBtn.addEventListener("click", () => {
    const currentIndex = playlist.index;
    const newIndex = (currentIndex - 1 + playlist.list.length) % playlist.list.length;
    playlist.setTrackByName(playlist.list[newIndex]);
    music.play({ toast });
  });

  // Next button
  nextBtn.addEventListener("click", () => {
    const currentIndex = playlist.index;
    const newIndex = (currentIndex + 1) % playlist.list.length;
    playlist.setTrackByName(playlist.list[newIndex]);
    music.play({ toast });
  });

  // Volume slider
  volumeSlider.addEventListener("input", (e) => {
    audio.volume = parseInt(e.target.value) / 100;
  });

  // Listen for audio state changes
  audio.addEventListener("play", () => {
    updatePlayerVisibility();
    updatePlayPauseBtn();
  });
  audio.addEventListener("pause", () => {
    updatePlayerVisibility();
    updatePlayPauseBtn();
  });

  // Listen for track changes from playlist
  if (playlist) {
    playlist.onChange(() => {
      updateTrackTitle();
    });
  }

  // Initial state
  updateTrackTitle();
  updatePlayerVisibility();
  updatePlayPauseBtn();
}

function setupContactForm(toast) {
  const contactForm = document.getElementById("contactForm");

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Replace this with YOUR Formspree endpoint (get it from formspree.io)
    const formspreeUrl = "https://formspree.io/f/maqrnwze";

    try {
      const response = await fetch(formspreeUrl, {
        method: "POST",
        body: new FormData(contactForm),
        headers: {
          "Accept": "application/json"
        }
      });

      if (response.ok) {
        toast.show("Message sent successfully! ❤️", 3000);
        contactForm.reset();
      } else {
        toast.show("Oops, something went wrong! Please try again.", 3000);
      }
    } catch (error) {
      toast.show("Oops, something went wrong! Please try again.", 3000);
    }
  });
}

function init() {
  const toast = setupToast();
  setupLogin();
  setupCanvasBackground();
  setupReveal();
  setupFloatingHearts();
  setupMemoryVideos();
  setupTypingLetter();
  setupModal();
  setupCountdown();
  const music = setupMusic();
  setupSurpriseMusicBridge(music);
  const playlist = setupPlaylist(music, toast);
  setupPlaylistUI(playlist, music, toast);
  setupBottomPlayer(music, playlist, toast);
  setupContactForm(toast);
  // setupPWA();

  music.tryAuto({ toast });

  const firstGesture = () => {
    if (!music.isOn && !music.hasError) music.play({ toast });
    window.removeEventListener("pointerdown", firstGesture);
    window.removeEventListener("keydown", firstGesture);
  };
  window.addEventListener("pointerdown", firstGesture, { once: true });
  window.addEventListener("keydown", firstGesture, { once: true });

  // if ('serviceWorker' in navigator) {
  //   navigator.serviceWorker.register('./sw.js');
  // }
}

document.addEventListener("DOMContentLoaded", init);
