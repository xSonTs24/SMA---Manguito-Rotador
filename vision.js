// ================================================================
// EVENT BUS
// ================================================================
const __VisionListeners = {};
let tmLoopActive = false;


function on(event, callback) {
  if (!__VisionListeners[event]) __VisionListeners[event] = [];
  __VisionListeners[event].push(callback);
  return () => off(event, callback);
}

function off(event, callback) {
  if (!__VisionListeners[event]) return;
  __VisionListeners[event] = __VisionListeners[event].filter(cb => cb !== callback);
}

function emit(event, data) {
  (__VisionListeners[event] || []).forEach(cb => {
    try { cb(data); } catch (err) { console.error(`[VisionSystem:${event}]`, err); }
  });
}

// ================================================================
// DOM HELPERS (SAFE)
// ================================================================
function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = String(value);
}

function setHTML(id, value) {
  const el = $(id);
  if (el) el.innerHTML = String(value);
}

function setDisplay(id, value) {
  const el = $(id);
  if (el) el.style.display = value;
}

function setClass(id, cls) {
  const el = $(id);
  if (el) el.className = cls;
}

function setStyle(id, prop, value) {
  const el = $(id);
  if (el) el.style[prop] = value;
}

function getCanvasCtx(id) {
  const canvas = $(id);
  if (!canvas) return null;
  return canvas.getContext("2d");
}

function isFn(fn) {
  return typeof fn === "function";
}

// ================================================================
// UI EMISSION HELPERS
// ================================================================
function uiStatus(msg) {
  emit("status", msg);
  setText("status", msg);
}

function uiPhase(cls, text) {
  emit("phase", { type: cls, message: text });
  const el = $("phase-box");
  if (el) {
    el.className = cls;
    el.textContent = text;
  }
}

function uiFeedback(msg, cls) {
  emit("feedback", { message: msg, type: cls });
  const el = $("feedback");
  if (el) {
    el.textContent = msg;
    el.className = cls || "";
  }
}

function uiFlashRep() {
  emit("flashRep", true);
  const el = $("rep-flash");
  if (!el) return;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 700);
}

function uiLog(msg, cls) {
  emit("log", { message: msg, type: cls });
  const log = $("log");
  if (!log) return;
  const d = document.createElement("div");
  d.className = "entry " + (cls || "");
  const t = new Date().toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  d.textContent = `[${t}] ${msg}`;
  log.prepend(d);
  while (log.children.length > 40) log.removeChild(log.lastChild);
}

function uiRepUpdate() {
  emit("repUpdate", {
    total: totalReps,
    left: repsLeft,
    right: repsRight,
    score,
    combo,
    isLeftArm,
    selectedKey,
  });

  const repEl = $("count-reps");
  const totalEl = $("count-total");
  const scoreEl = $("count-score");

  if (repEl) repEl.textContent = String(isLeftArm ? repsLeft : repsRight);
  if (totalEl) totalEl.textContent = String(totalReps);
  if (scoreEl) scoreEl.textContent = String(score);
}

function uiComboUpdate() {
  emit("combo", {
    value: combo,
    multiplier: getMultiplier(),
    level: getFilterLevel(),
  });

  const el = $("combo-count");
  const bar = $("combo-bar-fill");
  const mult = $("multiplier");

  if (el) {
    el.textContent = "x" + combo;
    el.className = combo >= 8 ? "fire" : combo >= 3 ? "hot" : "";
  }
  if (bar) {
    bar.style.width = Math.min(100, (combo / COMBO_MAX) * 100) + "%";
    bar.style.background = combo >= 8 ? "#ff6b35" : combo >= 5 ? "#ffd700" : "#00e5ff";
  }
  if (mult) mult.textContent = "Multiplicador: x" + getMultiplier().toFixed(1);
}

function uiArmUpdate() {
  emit("armChange", { isLeft: isLeftArm });
  const btn = $("arm-btn");
  const lbl = $("arm-label");

  if (btn) {
    if (isLeftArm) {
      btn.textContent = "👈 BRAZO IZQUIERDO — click para cambiar";
      btn.className = "arm-btn left";
    } else {
      btn.textContent = "👉 BRAZO DERECHO — click para cambiar";
      btn.className = "arm-btn";
    }
  }
  if (lbl) {
    if (isLeftArm) {
      lbl.textContent = "👈 IZQ (espejado)";
      lbl.className = "left";
    } else {
      lbl.textContent = "👉 DER";
      lbl.className = "";
    }
  }
}

// ================================================================
// IMÁGENES DE REFERENCIA
// ================================================================
const REF_IMAGES = {
  lateral: "imagenes%20Rotacare/ejercicio%20en%20camara/lateral.png",
  frontal: "imagenes%20Rotacare/ejercicio%20en%20camara/frontal.png",
  rotacion: "imagenes%20Rotacare/ejercicio%20en%20camara/rotacion.png",
};

function updateRefImage(key) {
  emit("exerciseSelected", { name: key });
  const img = $("ref-img");
  const wrap = $("ref-img-wrap");
  const label = $("ref-img-label");

  if (!wrap) return;

  if (REF_IMAGES[key]) {
    if (img) img.src = REF_IMAGES[key];
    wrap.style.opacity = "1";
    if (label) label.textContent = key.toUpperCase();

    if (key === "rotacion") {
      wrap.style.width = "210px";
      wrap.style.height = "110px";
    } else {
      wrap.style.width = "110px";
      wrap.style.height = "110px";
    }
  } else {
    wrap.style.opacity = "0";
  }
}

// ================================================================
// AUDIO
// ================================================================
let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, type, duration, gain, delay = 0) {
  const ctx = getAudio();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  g.gain.setValueAtTime(gain, ctx.currentTime + delay);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
}

function soundRep(c) {
  const base = 380 + Math.min(c, 10) * 35;
  playTone(base, "sine", 0.1, 0.35);
  playTone(base * 1.26, "sine", 0.07, 0.2, 0.06);
}

function soundMilestone(c) {
  const seqs = {
    3: [523, 659, 784],
    5: [523, 659, 784, 1047],
    8: [523, 659, 784, 1047, 1319],
  };
  (seqs[c] || seqs[3]).forEach((f, i) => playTone(f, "sine", 0.35, 0.22, i * 0.07));
}

function soundBreak() {
  const ctx = getAudio();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.45);
  g.gain.setValueAtTime(0.18, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
  osc.start();
  osc.stop(ctx.currentTime + 0.45);
}

function soundBugSquash() {
  const ctx = getAudio();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  src.buffer = buf;
  src.connect(g);
  g.connect(ctx.destination);
  g.gain.setValueAtTime(0.25, ctx.currentTime);
  src.start();
}

// ================================================================
// GUIDE AUDIOS
// ================================================================
const GUIDE_AUDIOS = {
  lateral: new Audio("music/lateral_guia.mp3"),
  frontal: new Audio("music/frontal_guia.mp3"),
  rotacion: new Audio("music/abduccion_guia.mp3"),
};

function playGuideAudio(key) {
  Object.values(GUIDE_AUDIOS).forEach(a => {
    try {
      a.pause();
      a.currentTime = 0;
    } catch (_) { }
  });
  const audio = GUIDE_AUDIOS[key];
  if (audio) audio.play().catch(() => { });
}

// ================================================================
// MUSICA EXTERNA
// ================================================================
const MUSIC_URL = "music/musica_fondo.mp3";
const MUSIC_RATES = [1.0, 1.08, 1.18, 1.3];
const MUSIC_VOLS = [0.7, 0.85, 1.0, 1.0];
const MUSIC_LABELS = ["🎵 reposo", "🔥 activado x3", "💥 fuego x5", "⚡ modo dios x8"];
let bgAudio = null;
let bgGainNode = null;
let bgSource = null;
let musicOn = false;
let musicLevel = -1;

function initBgAudio() {
  if (bgAudio) return;
  const ctx = getAudio();
  if (!bgGainNode) {
    bgGainNode = ctx.createGain();
    bgGainNode.connect(ctx.destination);
  }
  bgAudio = new Audio();
  bgAudio.src = MUSIC_URL;
  bgAudio.loop = true;
  bgAudio.addEventListener("error", () => {
    uiLog("⚠️ musica_fondo.mp3 no encontrado — coloca tu mp3 en music/", "info");
    bgAudio = null;
    musicOn = false;
    const btn = $("music-btn");
    if (btn) {
      btn.textContent = "▶ ON";
      btn.style.borderColor = "#3dff8f";
      btn.style.color = "#3dff8f";
    }
  }, { once: true });
  bgAudio.addEventListener("canplaythrough", () => {
    if (bgSource) return;
    try {
      bgSource = ctx.createMediaElementSource(bgAudio);
      bgSource.connect(bgGainNode);
    } catch (_) { }
  }, { once: true });
}

function setMusicLevel(level) {
  if (!musicOn || !bgAudio || !bgGainNode) return;
  if (level === musicLevel) return;
  musicLevel = level;
  const volInput = $("sl-vol");
  const vol = volInput ? parseFloat(volInput.value) / 100 : 0.4;
  bgAudio.playbackRate = MUSIC_RATES[level] ?? 1.0;
  const ctx = getAudio();
  bgGainNode.gain.cancelScheduledValues(ctx.currentTime);
  bgGainNode.gain.setValueAtTime(bgGainNode.gain.value, ctx.currentTime);
  bgGainNode.gain.linearRampToValueAtTime(vol * (MUSIC_VOLS[level] ?? 1.0), ctx.currentTime + 0.5);
  const label = $("music-level-label");
  if (label) label.textContent = MUSIC_LABELS[level];
  uiLog(`Música → ${MUSIC_LABELS[level]} (x${MUSIC_RATES[level] ?? 1.0})`, "info");
}

function setMusicVolume(vol) {
  if (!bgGainNode) return;
  bgGainNode.gain.setValueAtTime(vol * (MUSIC_VOLS[musicLevel >= 0 ? musicLevel : 0] ?? 1.0), getAudio().currentTime);
}

function toggleMusic() {
  const btn = $("music-btn");
  if (!btn) return;

  if (!musicOn) {
    initBgAudio();
    if (!bgAudio) return;
    musicOn = true;
    musicLevel = -1;
    bgAudio.play().catch(e => uiLog("Error audio: " + e.message, "bad"));
    btn.textContent = "⏸ OFF";
    btn.style.borderColor = "#ff3d5a";
    btn.style.color = "#ff3d5a";
    setMusicLevel(currentFilterLevel);
  } else {
    musicOn = false;
    try { bgAudio.pause(); } catch (_) { }
    btn.textContent = "▶ ON";
    btn.style.borderColor = "#3dff8f";
    btn.style.color = "#3dff8f";
    const label = $("music-level-label");
    if (label) label.textContent = "🎵 apagado";
  }
}


function startMusic() {
  initBgAudio();
  if (!bgAudio) return;
  musicOn = true;
  musicLevel = -1;
  try { bgAudio.play().catch(() => { }); } catch (_) { }
  setMusicLevel(currentFilterLevel);
}

function stopMusic() {
  musicOn = false;
  try { if (bgAudio) bgAudio.pause(); } catch (_) { }
}

// ================================================================
// MODELOS
// ================================================================
const MODELS = {
  frontal: {
    url: "https://teachablemachine.withgoogle.com/models/JDtn8_a4u/",
    classUp: "frontal-arriba",
    classMid: "frontal-intermedio",
    classDown: "frontal-reposo",
    classBad: "frontal-incorrecto",
  },
  rotacion: {
    url: "https://teachablemachine.withgoogle.com/models/hZVoW_2Sm/",
    classUp: "rotacion-arriba",
    classDown: "rotación-reposo",
    classBad: "rotacion-incorrecta",
  },
};

// ================================================================
// VARIABLES GLOBALES
// ================================================================
let model, webcam;
let modelCache = {};
let ctxCam, ctxOverlay, ctxMirror;
let mirrorCanvas;
let mpPose, mpCamera;
let sharedStream = null;
let sharedVideo = null;
let tmCanvas = null;
let tmCtx = null;
let mpLoopActive = false;
let mpFrameBusy = false;
let angleHistory = [];
const SMOOTH_N = 6;

let running = false;
let selectedKey = "lateral";
let isLeftArm = false;
let repPhase = "down";
let consecUp = 0;
let consecDown = 0;
let repsRight = 0;
let repsLeft = 0;
let totalReps = 0;
let score = 0;


// ================================================================
// CÁMARA COMPARTIDA
// ================================================================
function cameraTrackIsLive() {
  return !!(sharedStream && sharedStream.getVideoTracks().some(t => t.readyState === "live"));
}

async function ensureSharedCamera() {
  if (!sharedVideo) {
    sharedVideo = document.createElement("video");
    sharedVideo.id = "rc-shared-video";
    sharedVideo.autoplay = true;
    sharedVideo.muted = true;
    sharedVideo.playsInline = true;
    sharedVideo.setAttribute("playsinline", "");
    sharedVideo.style.display = "none";
    document.body.appendChild(sharedVideo);
  }

  if (!cameraTrackIsLive()) {
    sharedStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 640 },
      },
      audio: false,
    });
    sharedVideo.srcObject = sharedStream;
  }

  if (sharedVideo.readyState < 2) {
    await new Promise((resolve) => {
      const done = () => {
        sharedVideo.removeEventListener("loadedmetadata", done);
        sharedVideo.removeEventListener("canplay", done);
        resolve();
      };
      sharedVideo.addEventListener("loadedmetadata", done, { once: true });
      sharedVideo.addEventListener("canplay", done, { once: true });
      setTimeout(resolve, 800);
    });
  }

  try { await sharedVideo.play(); } catch (_) { }
  return sharedVideo;
}

function releaseSharedCamera() {
  try {
    if (sharedStream) {
      sharedStream.getTracks().forEach(t => t.stop());
    }
  } catch (_) { }
  sharedStream = null;
  if (sharedVideo) {
    try { sharedVideo.pause(); } catch (_) { }
    sharedVideo.srcObject = null;
  }
}

function drawSharedVideoToCanvas(canvas, mirrored = true) {
  if (!canvas || !sharedVideo) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width || 400;
  const h = canvas.height || 400;
  ctx.save();
  if (mirrored) {
    ctx.scale(-1, 1);
    ctx.drawImage(sharedVideo, -w, 0, w, h);
  } else {
    ctx.drawImage(sharedVideo, 0, 0, w, h);
  }
  ctx.restore();
}

// Config getters (safe)
const confUp = () => {
  const el = $("sl-up");
  return el ? parseInt(el.value) / 100 : 0.8;
};
const confDown = () => {
  const el = $("sl-down");
  return el ? parseInt(el.value) / 100 : 0.75;
};
const framesN = () => {
  const el = $("sl-frames");
  return el ? parseInt(el.value) : 3;
};
const angleUp = () => {
  const el = $("sl-angle-up");
  return el ? parseInt(el.value) : 70;
};
const angleDown = () => {
  const el = $("sl-angle-down");
  return el ? parseInt(el.value) : 20;
};

// ================================================================
// COMBO / RACHA
// ================================================================
let combo = 0;
const COMBO_MAX = 10;
const INACTIVITY_MS = 4000;
let inactivityTimer = null;

function getMultiplier() {
  if (combo >= 8) return 3.0;
  if (combo >= 5) return 2.0;
  if (combo >= 3) return 1.5;
  return 1.0;
}

function getFilterLevel() {
  if (combo >= 8) return 3;
  if (combo >= 5) return 2;
  if (combo >= 3) return 1;
  return 0;
}

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    if (combo > 0) {
      uiLog(`⏱ Inactividad — racha x${combo} perdida`, "bad");
      soundBreak();
      combo = 0;
      uiComboUpdate();
      applyFilter(0);
      startAmbientParticles(0);
      setMusicLevel(0);
    }
  }, INACTIVITY_MS);
}

function addCombo() {
  combo++;
  uiComboUpdate();
  const lvl = getFilterLevel();
  applyFilter(lvl);
  startAmbientParticles(lvl);
  setMusicLevel(lvl);
  if (combo === 3 || combo === 5 || combo === 8) soundMilestone(combo);
  resetInactivityTimer();
}

function resetCombo() {
  combo = 0;
  clearTimeout(inactivityTimer);
  uiComboUpdate();
  applyFilter(0);
  stopAmbientParticles();
  setMusicLevel(0);
}

// ================================================================
// FILTROS DE CÁMARA
// ================================================================
let currentFilterLevel = 0;
const FILTERS = [
  { cam: "", border: "none", shadow: "none" },
  { cam: "saturate(1.4) brightness(1.05)", border: "2px solid rgba(0,229,255,0.7)", shadow: "inset 0 0 30px 8px rgba(0,229,255,0.2)" },
  { cam: "saturate(2) hue-rotate(20deg) brightness(1.1)", border: "3px solid #ffd700", shadow: "inset 0 0 40px 12px rgba(255,215,0,0.25)" },
  { cam: "saturate(3) hue-rotate(-15deg) brightness(1.15) contrast(1.2)", border: "4px solid #ff6b35", shadow: "inset 0 0 50px 18px rgba(255,107,53,0.3)" },
];

function applyFilter(level) {
  currentFilterLevel = level;
  const cam = $("canvas-cam");
  const wrap = document.querySelector(".canvas-wrap");
  const f = FILTERS[level] || FILTERS[0];
  if (cam) cam.style.filter = f.cam;
  if (wrap && !fireActive && !bugActive) {
    wrap.style.border = f.border;
    wrap.style.boxShadow = f.shadow;
    wrap.style.borderRadius = "12px";
  }
}

let displayCtx = null;

// En startDisplayLoop, agrega el fuego al loop de dibujo:
function startDisplayLoop() {
  const display = document.getElementById('canvas-display');
  if (!display) return;
  displayCtx = display.getContext('2d');

  const fireEl = document.getElementById('fire-video');

  function loop() {
    if (!running) return;
    const cam = document.getElementById('canvas-cam');
    const overlay = document.getElementById('canvas-overlay');
    if (displayCtx && cam && overlay) {
      const dw = display.width;
      const dh = display.height;
      displayCtx.drawImage(cam, 0, 0, dw, dh);
      
      // 👇 Dibuja el fuego directo en canvas si está activo
      /*if (fireActive && fireEl && fireEl.complete) {
        displayCtx.globalAlpha = parseFloat(fireEl.style.opacity) || 0;
        displayCtx.drawImage(fireEl, 0, 0, dw, dh);
        displayCtx.globalAlpha = 1;
      }*/

      displayCtx.drawImage(overlay, 0, 0, dw, dh);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

function resizeCanvases() {
  const wrap = document.getElementById('camera-shell');
  if (!wrap) return;

  const rect = wrap.getBoundingClientRect();
  const w = rect.width || window.innerWidth;
  const h = rect.height || window.innerHeight;

  // Solo redimensionar el canvas de display, NUNCA canvas-cam ni canvas-overlay
  const display = document.getElementById('canvas-display');
  if (display) {
    display.width = w;
    display.height = h;
  }

  // canvas-cam y canvas-overlay quedan fijos en 400x400
  const cam = document.getElementById('canvas-cam');
  const overlay = document.getElementById('canvas-overlay');
  if (cam) { cam.width = 400; cam.height = 400; }
  if (overlay) { overlay.width = 400; overlay.height = 400; }

  ctxCam = cam?.getContext("2d") || null;
  ctxOverlay = overlay?.getContext("2d") || null;
}

window.addEventListener('resize', resizeCanvases);

// ================================================================
// PARTÍCULAS
// ================================================================
function spawnParticles(x, y) {
  const wrap = document.querySelector(".canvas-wrap");
  if (!wrap) return;

  const ww = wrap.offsetWidth || 400;
  const wh = wrap.offsetHeight || 400;
  const scaleX = ww / 400;
  const scaleY = wh / 400;
  const px = x * scaleX;
  const py = y * scaleY;

  const count = combo >= 8 ? 55 : combo >= 5 ? 38 : combo >= 3 ? 24 : 12;
  const minSz = combo >= 8 ? 8 : combo >= 5 ? 6 : combo >= 3 ? 5 : 4;
  const maxSz = combo >= 8 ? 22 : combo >= 5 ? 16 : combo >= 3 ? 12 : 9;
  const minSpd = combo >= 8 ? 60 : combo >= 5 ? 50 : combo >= 3 ? 40 : 30;
  const maxSpd = combo >= 8 ? 130 : combo >= 5 ? 110 : combo >= 3 ? 90 : 70;
  const colors = combo >= 8
    ? ["#ff6b35", "#ff9500", "#ffd700", "#fff", "#ff3d5a"]
    : combo >= 5
      ? ["#ffd700", "#fffacd", "#ffaa00", "#fff", "#3dff8f"]
      : combo >= 3
        ? ["#00e5ff", "#3dff8f", "#ffd700", "#fff"]
        : ["#00e5ff", "#3dff8f", "#fff"];

  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    const ang = ((Math.PI * 2) / count) * i + (Math.random() - 0.5) * 0.5;
    const spd = minSpd + Math.random() * (maxSpd - minSpd);
    const sz = minSz + Math.random() * (maxSz - minSz);
    const dur = 700 + Math.random() * 500;
    const col = colors[Math.floor(Math.random() * colors.length)];
    p.className = "particle";
    p.style.cssText = `left:${px}px;top:${py}px;width:${sz}px;height:${sz}px;
      background:${col};border-radius:50%;
      --dx:${Math.cos(ang) * spd}px;--dy:${Math.sin(ang) * spd}px;--dur:${dur}ms;`;
    wrap.appendChild(p);
    setTimeout(() => p.remove(), dur + 50);
  }

  if (combo >= 3) {
    const sc = combo >= 8 ? 16 : combo >= 5 ? 10 : 5;
    const starSz = combo >= 8 ? 14 : combo >= 5 ? 10 : 7;
    for (let i = 0; i < sc; i++) {
      const s = document.createElement("div");
      const dur = 900 + Math.random() * 500;
      const offX = (Math.random() - 0.5) * 80;
      const flyY = -(80 + Math.random() * 120);
      const flyX = (Math.random() - 0.5) * 70;
      s.className = "particle-star";
      s.style.cssText = `left:${px + offX}px;top:${py}px;
        width:${starSz}px;height:${starSz}px;
        background:#ffd700;border-radius:2px;transform:rotate(45deg);
        --dx:${flyX}px;--dy:${flyY}px;--dur:${dur}ms;`;
      wrap.appendChild(s);
      setTimeout(() => s.remove(), dur + 50);
    }
  }

  if (combo >= 5) {
    const ringN = combo >= 8 ? 20 : 14;
    const ringSz = combo >= 8 ? 10 : 7;
    for (let i = 0; i < ringN; i++) {
      const r = document.createElement("div");
      const ang = ((Math.PI * 2) / ringN) * i;
      const rad = 70 + Math.random() * 30;
      const dur = 600 + Math.random() * 400;
      const col = combo >= 8 ? "#ff6b35" : "#ffd700";
      r.className = "particle";
      r.style.cssText = `left:${px}px;top:${py}px;width:${ringSz}px;height:${ringSz}px;
        background:${col};border-radius:50%;
        --dx:${Math.cos(ang) * rad}px;--dy:${Math.sin(ang) * rad}px;--dur:${dur}ms;`;
      wrap.appendChild(r);
      setTimeout(() => r.remove(), dur + 50);
    }
  }

  if (combo >= 8) {
    for (let i = 0; i < 12; i++) {
      const s = document.createElement("div");
      const ang = Math.random() * Math.PI * 2;
      const spd = 100 + Math.random() * 80;
      const dur = 800 + Math.random() * 400;
      s.className = "particle";
      s.style.cssText = `left:${px}px;top:${py}px;
        width:${3 + Math.random() * 3}px;height:${18 + Math.random() * 14}px;
        background:linear-gradient(#fff,#ff6b35);border-radius:2px;
        transform:rotate(${(ang * 180) / Math.PI}deg);
        --dx:${Math.cos(ang) * spd}px;--dy:${Math.sin(ang) * spd}px;--dur:${dur}ms;`;
      wrap.appendChild(s);
      setTimeout(() => s.remove(), dur + 50);
    }
  }
}

function getShoulderPosTM() {
  return isLeftArm ? { x: 120, y: 150 } : { x: 280, y: 150 };
}

// ================================================================
// PARTÍCULAS AMBIENTE
// ================================================================
let ambientParticles = [];
let ambientInterval = null;

function startAmbientParticles(level) {
  stopAmbientParticles();
  if (level < 2) return;

  const wrap = document.querySelector(".canvas-wrap");
  if (!wrap) return;

  const colors = level >= 3 ? ["#ff6b35", "#ffd700", "#ff9500"] : ["#ffd700", "#fffacd", "#ffaa00"];
  const ww = wrap.offsetWidth || 400;
  const wh = wrap.offsetHeight || 400;

  function spawnOne() {
    const side = Math.floor(Math.random() * 4);
    let sx, sy;
    if (side === 0) { sx = Math.random() * ww; sy = 0; }
    else if (side === 1) { sx = ww; sy = Math.random() * wh; }
    else if (side === 2) { sx = Math.random() * ww; sy = wh; }
    else { sx = 0; sy = Math.random() * wh; }

    const dur = 2000 + Math.random() * 2000;
    const p = document.createElement("div");
    p.className = "particle-ambient";
    p.style.cssText = `left:${sx}px;top:${sy}px;
      width:${6 + Math.random() * 8}px;height:${6 + Math.random() * 8}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      --dur:${dur}ms;--fx:${(Math.random() - 0.5) * 100}px;--fy:${(Math.random() - 0.5) * 100}px;`;
    wrap.appendChild(p);
    ambientParticles.push(p);
    setTimeout(() => {
      p.remove();
      ambientParticles = ambientParticles.filter(x => x !== p);
    }, dur * 2 + 100);
  }

  const initial = level >= 3 ? 18 : 12;
  for (let i = 0; i < initial; i++) setTimeout(spawnOne, i * 120);
  ambientInterval = setInterval(spawnOne, level >= 3 ? 280 : 450);
}

function stopAmbientParticles() {
  clearInterval(ambientInterval);
  ambientParticles.forEach(p => p.remove());
  ambientParticles = [];
}

// ================================================================
// SELECCIÓN DE EJERCICIO
// ================================================================
function selectModel(key) {
  selectedKey = key;
  emit("exerciseSelected", { name: key });
  updateRefImage(key);
  playGuideAudio(key);
  uiStatus("Ejercicio: " + key);
}

// ================================================================
// START / STOP
// ================================================================
async function toggleStart() {
  if (running) {
    running = false;
    tmLoopActive = false;
    mpLoopActive = false;
    mpFrameBusy = false;

    if (webcam && typeof webcam.stop === "function") {
      try { webcam.stop(); } catch (_) { }
    }
    webcam = null;

    cancelFireEvent();
    cancelBugEvent();
    resetCombo();

    const btn = $("btn-start");
    if (btn) btn.textContent = "▶ INICIAR";
    uiStatus("Detenido.");
    emit("running", false);
    return;
  }

  resizeCanvases();
  await ensureSharedCamera();

  uiStatus("Iniciando " + selectedKey + "...");
  const btn = $("btn-start");
  if (btn) btn.textContent = "⏳ CARGANDO...";

  try {
    resetCounters();
    running = true;

    if (selectedKey === "lateral") await startLateral();
    else await startTM();

    startDisplayLoop();

    if (btn) btn.textContent = "⏹ DETENER";
    uiStatus("✓ Corriendo: " + selectedKey);
    uiLog("Iniciado: " + selectedKey, "info");
    emit("running", true);
  } catch (e) {
    running = false;
    tmLoopActive = false;
    mpLoopActive = false;
    uiStatus("Error: " + e.message);
    if (btn) btn.textContent = "▶ INICIAR";
    uiLog("Error: " + e.message, "bad");
    console.error(e);
  }
}

// ================================================================
// MODO LATERAL — MediaPipe
// ================================================================
async function startLateral() {
  const vid = await ensureSharedCamera();

  if (!mpPose) {
    mpPose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });
    mpPose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    mpPose.onResults(onMPResults);
  }

  mpLoopActive = true;
  requestAnimationFrame(async function mpTick() {
    if (!mpLoopActive || !running || selectedKey !== "lateral") return;

    if (!mpFrameBusy) {
      mpFrameBusy = true;
      try {
        await mpPose.send({ image: vid });
      } catch (err) {
        console.warn("MediaPipe frame error:", err);
      } finally {
        mpFrameBusy = false;
      }
    }

    requestAnimationFrame(mpTick);
  });
}

function onMPResults(results) {
  if (!running) return;
  if (!ctxCam || !ctxOverlay) return;

  ctxCam.save();
  ctxCam.scale(-1, 1);

  const cW = $('canvas-cam').width, cH = $('canvas-cam').height;
  ctxCam.drawImage(results.image, -cW, 0, cW, cH);
  ctxCam.restore();
  ctxOverlay.clearRect(0, 0, cW, cH);

  if (!results.poseLandmarks) return;

  const lm = results.poseLandmarks;
  const S = isLeftArm ? lm[11] : lm[12];
  const W = isLeftArm ? lm[15] : lm[16];
  const H = isLeftArm ? lm[23] : lm[24];
  if (!S || !W || !H || S.visibility < 0.4 || W.visibility < 0.35) return;

  const deltaZ = W.z - S.z;
  const zThresh = parseFloat($("sl-z")?.value || "50") / 100;
  const zBlocked = deltaZ < -zThresh;
  const dzEl = $("deltaz-display");
  if (dzEl) {
    dzEl.textContent = deltaZ.toFixed(3);
    dzEl.style.color = zBlocked ? "#ff3d5a" : "#3dff8f";
  }

  const tx = H.x - S.x, ty = H.y - S.y, ax = W.x - S.x, ay = W.y - S.y;
  const dot = tx * ax + ty * ay;
  const magT = Math.hypot(tx, ty);
  const magA = Math.hypot(ax, ay);
  if (magT < 0.001 || magA < 0.001) return;

  const raw = Math.round((Math.acos(Math.min(1, Math.max(-1, dot / (magT * magA)))) * 180) / Math.PI);
  angleHistory.push(raw);
  if (angleHistory.length > SMOOTH_N) angleHistory.shift();
  const angle = Math.round(angleHistory.reduce((a, b) => a + b, 0) / angleHistory.length);

  drawMPSkeleton(lm);

  const up = angleUp();
  const pct = Math.min(100, Math.round((angle / up) * 100));
  const col = zBlocked ? "#ff6b35" : pct >= 100 ? "#3dff8f" : pct >= 60 ? "#ffaa00" : "#ff3d5a";

  setText("angle-display", angle + "°");
  setStyle("angle-display", "color", col);
  const bar = $("angle-bar");
  if (bar) {
    bar.style.width = pct + "%";
    bar.style.background = col;
  }

  emit("angle", { value: angle, percent: pct, color: col, zBlocked });

  if (zBlocked) {
    uiPhase("bad", `⚠️ BRAZO AL FRENTE (ΔZ ${deltaZ.toFixed(2)})`);
    uiFeedback("Sube el brazo hacia el LADO", "bad");
    consecUp = 0;
    return;
  }

  processRepAngle(angle);
}

function drawMPSkeleton(lm) {
  if (!ctxOverlay) return;
  const ACTIVE = "#00e5ff";
  const DIM = "rgba(255,255,255,0.2)";
  const activeIdxs = isLeftArm ? [11, 13, 15] : [12, 14, 16];
  const segs = [
    [11, 13, true],
    [13, 15, true],
    [12, 14, false],
    [14, 16, false],
    [11, 12, null],
    [11, 23, null],
    [12, 24, null],
    [23, 24, null],
  ];
  const cw = ctxOverlay.canvas.width;
  const ch = ctxOverlay.canvas.height;
  const px = x => (1 - x) * cw;
  const py = y => y * ch;

  segs.forEach(([a, b, side]) => {
    const la = lm[a], lb = lm[b];
    if (!la || !lb || la.visibility < 0.3 || lb.visibility < 0.3) return;
    const active = side === null || (isLeftArm ? side === true : side === false);
    ctxOverlay.strokeStyle = active ? ACTIVE : DIM;
    ctxOverlay.lineWidth = active ? 3 : 1.5;
    ctxOverlay.beginPath();
    ctxOverlay.moveTo(px(la.x), py(la.y));
    ctxOverlay.lineTo(px(lb.x), py(lb.y));
    ctxOverlay.stroke();
  });

  [11, 12, 13, 14, 15, 16].forEach(i => {
    const p = lm[i];
    if (!p || p.visibility < 0.3) return;
    const act = activeIdxs.includes(i);
    ctxOverlay.beginPath();
    ctxOverlay.arc(px(p.x), py(p.y), act ? 7 : 4, 0, Math.PI * 2);
    ctxOverlay.fillStyle = act ? "#ffaa00" : DIM;
    ctxOverlay.fill();
  });
}

function processRepAngle(angle) {
  const up = angleUp();
  const dn = angleDown();
  const N = framesN();

  if (repPhase === "down") {
    if (angle >= up) {
      consecUp++;
      uiPhase("mid", `↑ SUBIENDO (${consecUp}/${N})`);
      if (consecUp >= N) {
        repPhase = "up";
        consecUp = 0;
        consecDown = 0;
        uiPhase("up", "↓ ARRIBA — ahora baja");
        uiFeedback(`¡Buen rango! ${angle}°`, "ok");
      }
    } else {
      consecUp = 0;
      uiPhase("down", `↓ REPOSO — ángulo: ${angle}° (meta: ${up}°)`);
    }
  } else {
    if (angle <= dn) {
      consecDown++;
      uiPhase("mid", `↓ BAJANDO (${consecDown}/${N})`);
      if (consecDown >= N) {
        repPhase = "down";
        consecDown = 0;
        consecUp = 0;
        countRep();
      }
    } else {
      consecDown = 0;
    }
  }
}

// ================================================================
// MODO TM
// ================================================================
async function startTM() {
  const cfg = MODELS[selectedKey];
  if (!cfg) throw new Error("No hay modelo configurado para: " + selectedKey);

  await ensureSharedCamera();

  if (!modelCache[selectedKey]) {
    modelCache[selectedKey] = await tmPose.load(cfg.url + "model.json", cfg.url + "metadata.json");
  }
  model = modelCache[selectedKey];

  if (!tmCanvas) {
    tmCanvas = document.createElement("canvas");
    tmCanvas.width = 400;
    tmCanvas.height = 400;
    tmCtx = tmCanvas.getContext("2d");
  }

  webcam = {
    canvas: tmCanvas,
    update() {
      drawSharedVideoToCanvas(tmCanvas, true);
    },
    stop() { }
  };

  mirrorCanvas = mirrorCanvas || document.createElement("canvas");
  mirrorCanvas.width = 400;
  mirrorCanvas.height = 400;
  ctxMirror = mirrorCanvas.getContext("2d");

  tmLoopActive = true;
  buildBars(model.getClassLabels());
  requestAnimationFrame(loopTM);
}

async function loopTM() {
  if (!tmLoopActive || !running || selectedKey === "lateral") return;
  if (!webcam || !model || !webcam.canvas) return;
  webcam.update();
  await predictTM();
  requestAnimationFrame(loopTM);
}

async function predictTM() {
  if (!webcam || !webcam.canvas || !model) return;
  const cfg = MODELS[selectedKey];
  if (!cfg) return;

  let input;
  if (isLeftArm) {
    ctxMirror.save();
    ctxMirror.clearRect(0, 0, 400, 400);
    ctxMirror.scale(-1, 1);
    ctxMirror.drawImage(webcam.canvas, -400, 0, 400, 400);
    ctxMirror.restore();
    input = mirrorCanvas;
  } else {
    input = webcam.canvas;
  }

  const { pose, posenetOutput } = await model.estimatePose(input);
  const predictions = await model.predict(posenetOutput);

  if (ctxCam) {
    const dw = ctxCam.canvas.width;
    const dh = ctxCam.canvas.height;
    ctxCam.drawImage(webcam.canvas, 0, 0, dw, dh);
  }

  if (ctxOverlay) {
    ctxOverlay.clearRect(0, 0, ctxOverlay.canvas.width, ctxOverlay.canvas.height);
  }

  if (pose) {
    const dw = ctxOverlay?.canvas.width || 400;
    const dh = ctxOverlay?.canvas.height || 400;
    const scaleX = dw / 400;
    const scaleY = dh / 400;

    const scaledKeypoints = pose.keypoints.map(kp => ({
      ...kp,
      position: {
        x: isLeftArm ? (400 - kp.position.x) * scaleX : kp.position.x * scaleX,
        y: kp.position.y * scaleY,
      }
    }));

    drawArmTM(scaledKeypoints, ctxOverlay);
  }

  updateBars(predictions, cfg);
  processRepTM(predictions, cfg);
}

function drawArmTM(keypoints, ctx) {
  if (!ctx) return;
  const iShoulder = 5, iElbow = 7, iWrist = 9;
  const S = keypoints[iShoulder];
  const E = keypoints[iElbow];
  const W = keypoints[iWrist];
  if (!S || !E || !W) return;
  const MIN = 0.3;

  ctx.lineWidth = 3;
  ctx.strokeStyle = "#00e5ff";
  ctx.lineCap = "round";

  [[S, E], [E, W]].forEach(([a, b]) => {
    if (a.score < MIN || b.score < MIN) return;
    ctx.beginPath();
    ctx.moveTo(a.position.x, a.position.y);
    ctx.lineTo(b.position.x, b.position.y);
    ctx.stroke();
  });

  [
    { kp: S, r: 8, col: "#ffaa00" },
    { kp: E, r: 6, col: "#00e5ff" },
    { kp: W, r: 7, col: "#3dff8f" },
  ].forEach(({ kp, r, col }) => {
    if (kp.score < MIN) return;
    ctx.beginPath();
    ctx.arc(kp.position.x, kp.position.y, r, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(kp.position.x, kp.position.y, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

function processRepTM(predictions, cfg) {
  const prob = {};
  predictions.forEach(p => { prob[p.className] = p.probability; });

  const pUp = prob[cfg.classUp] || 0;
  const pDn = prob[cfg.classDown] || 0;
  const pMid = cfg.classMid ? prob[cfg.classMid] || 0 : 0;
  const pBad = cfg.classBad ? prob[cfg.classBad] || 0 : 0;
  const N = framesN();
  const dom = predictions.reduce((a, b) => a.probability > b.probability ? a : b);

  if (pBad > 0.7) {
    uiPhase("bad", "⚠️ FORMA INCORRECTA");
    uiFeedback("Corrige la postura", "bad");
    consecUp = 0;
    return;
  }

  if (repPhase === "down") {
    if (pUp >= confUp()) {
      consecUp++;
      uiPhase("mid", `↑ SUBIENDO (${consecUp}/${N}) — ${Math.round(pUp * 100)}%`);
      if (consecUp >= N) {
        repPhase = "up";
        consecUp = 0;
        consecDown = 0;
        uiPhase("up", "↓ ARRIBA ✓ — ahora baja");
        uiFeedback("¡Buen rango!", "ok");
      }
    } else {
      if (consecUp > 0) consecUp = Math.max(0, consecUp - 1);
      if (cfg.classMid && pMid > 0.45) {
        uiPhase("mid", `↕ INTERMEDIO — ${Math.round(pMid * 100)}%`);
        uiFeedback("Sigue subiendo...", "mid");
      } else {
        const short = (dom.className || "").split("-")[1] || dom.className;
        uiPhase("down", `↓ REPOSO — ${short} ${Math.round(dom.probability * 100)}%`);
      }
    }
  } else {
    if (pDn >= confDown()) {
      repPhase = "down";
      consecDown = 0;
      consecUp = 0;
      uiPhase("down", "↓ REPOSO — sube el brazo");
      countRep();
    } else if (cfg.classMid && pMid > 0.45) {
      uiPhase("mid", `↕ BAJANDO — ${Math.round(pMid * 100)}%`);
      consecDown = 0;
    } else {
      uiPhase("up", `↓ ARRIBA — baja el brazo (${Math.round(pUp * 100)}%)`);
    }
  }
}

// ================================================================
// CONTAR REP
// ================================================================
function countRep() {
  if (window.RotaCare?.pauseVisionReps) return;

  if (isLeftArm) repsLeft++;
  else repsRight++;

  totalReps++;
  score += Math.round(10 * getMultiplier());

  uiRepUpdate();
  uiComboUpdate();

  soundRep(combo);
  addCombo();

  const pos = selectedKey === "lateral" ? { x: 200, y: 150 } : getShoulderPosTM();
  spawnParticles(pos.x, pos.y);
  uiFlashRep();
  uiLog(`Rep ${totalReps} — ${isLeftArm ? "IZQ" : "DER"} [${selectedKey}]`, "good");

  if (fireActive) onFireRep();
  if (bugActive) onBugRep();
}

// ================================================================
// CAMBIO DE BRAZO / RESET
// ================================================================
function toggleArm() {
  isLeftArm = !isLeftArm;
  repPhase = "down";
  consecUp = 0;
  consecDown = 0;
  angleHistory = [];
  uiArmUpdate();
  emit("armChanged", { isLeftArm });
  uiLog("Cambio → " + (isLeftArm ? "IZQ" : "DER"), "arm");
  uiFeedback("Brazo " + (isLeftArm ? "izquierdo" : "derecho") + " activo", "mid");
  uiPhase("down", "↓ REPOSO — sube el brazo");
}

function resetCounters() {
  repsRight = 0;
  repsLeft = 0;
  totalReps = 0;
  score = 0;
  repPhase = "down";
  consecUp = 0;
  consecDown = 0;
  angleHistory = [];
  isLeftArm = false;

  uiRepUpdate();
  uiArmUpdate();
  uiPhase("down", "↓ REPOSO — sube el brazo");
  uiFeedback("—", "");
  uiLog("Contadores reiniciados", "info");
  emit("resetCounters", true);
}

function resetAll() {
  resetCounters();
  resetCombo();
  stopAmbientParticles();
  cancelFireEvent();
  cancelBugEvent();
  emit("resetAll", true);
}

// ================================================================
// EVENTO FUEGO
// ================================================================
const FIRE_REPS_NEEDED = 5;
let fireActive = false;
let fireRepsLeft = 0;

function toggleFireEvent() {
  if (fireActive) cancelFireEvent();
  else startFireEvent();
}

function startFireEvent() {
  if (fireActive) return;
  if (bugActive) cancelBugEvent();

  fireActive = true;
  fireRepsLeft = FIRE_REPS_NEEDED;

  const btn = $("btn-fire");
  if (btn) {
    btn.classList.add("active");
    btn.textContent = "🔥 APAGANDO... (" + fireRepsLeft + " reps)";
  }

  const vid = $("fire-video");
  if (vid) {
    // Es un gif (<img>), se reinicia cambiando el src brevemente
    const src = vid.src;
    vid.src = "";
    vid.src = src;
    vid.style.opacity = "1";
  }

  /*const vid = $("fire-video");
  if (vid) {
  vid.style.display = "block"; // visible para que el canvas lo lea
  vid.style.opacity = "0";     // pero invisible como elemento HTML
  }*/

  const banner = $("fire-banner");
  if (banner) banner.style.display = "block";
  setText("fire-reps-left", fireRepsLeft + " reps");

  const wrap = document.querySelector(".canvas-wrap");
  if (wrap) wrap.classList.add("fire-active");

  playTone(220, "sawtooth", 0.15, 0.3);
  setTimeout(() => playTone(185, "sawtooth", 0.15, 0.3), 180);
  setTimeout(() => playTone(220, "sawtooth", 0.25, 0.3), 360);

  uiLog("🔥 ¡Evento fuego activado! Haz " + FIRE_REPS_NEEDED + " reps", "bad");
  emit("event:fire:start", { remaining: fireRepsLeft });
}

function onFireRep() {
  if (!fireActive) return;
  fireRepsLeft--;

  setText("fire-reps-left", fireRepsLeft + " reps");
  const btn = $("btn-fire");
  if (btn) btn.textContent = "🔥 APAGANDO... (" + fireRepsLeft + " reps)";

  const pct = fireRepsLeft / FIRE_REPS_NEEDED;
  const vid = $("fire-video");
  if (vid) vid.style.opacity = String(pct);

  emit("event:fire:update", { remaining: fireRepsLeft });

  if (fireRepsLeft <= 0) completeFireEvent();
}

function completeFireEvent() {
  fireActive = false;

  const vid = $("fire-video");
  if (vid) {
    vid.style.opacity = "0";
    setTimeout(() => { try { vid.pause(); } catch (_) { } }, 500);
  }

  /*const vid = $("fire-video");
  if (vid) {
    vid.style.opacity = "0";
    setTimeout(() => {
      vid.pause();
      vid.currentTime = 0;
    }, 300);
  }*/

  const banner = $("fire-banner");
  if (banner) banner.style.display = "none";

  const wrap = document.querySelector(".canvas-wrap");
  if (wrap) wrap.classList.remove("fire-active");

  const btn = $("btn-fire");
  if (btn) {
    btn.classList.remove("active");
    btn.textContent = "🔥 FUEGO";
  }

  const bonus = 30;
  score += bonus;
  setText("count-score", score);
  emit("score", { score });

  [523, 659, 784, 1047].forEach((f, i) => playTone(f, "sine", 0.35, 0.22, i * 0.07));
  uiLog(`✅ ¡Fuego apagado! +${bonus} pts`, "good");
  emit("event:fire:end", { bonus });
}

function cancelFireEvent() {
  fireActive = false;
   const vid = $("fire-video");
   if (vid) {
     vid.style.opacity = "0";
     try { vid.pause(); } catch (_) { }
   }

  /*const vid = $("fire-video");
  if (vid) {
    vid.style.opacity = "0";
    setTimeout(() => {
      vid.pause();
      vid.currentTime = 0;
    }, 300);
  }*/
  const banner = $("fire-banner");
  if (banner) banner.style.display = "none";

  const wrap = document.querySelector(".canvas-wrap");
  if (wrap) wrap.classList.remove("fire-active");

  const btn = $("btn-fire");
  if (btn) {
    btn.classList.remove("active");
    btn.textContent = "🔥 FUEGO";
  }

  uiLog("Evento fuego cancelado", "info");
}

// ================================================================
// EVENTO INSECTOS
// ================================================================
const BUG_TOTAL = 10;
const BUG_EMOJIS = ["🐛", "🦟", "🐜", "🦗", "🐝", "🦂", "🕷️", "🐞"];

let bugActive = false;
let bugCount = 0;
let bugSprites = [];
let bugInterval = null;

function toggleBugEvent() {
  if (bugActive) cancelBugEvent();
  else startBugEvent();
}

function startBugEvent() {
  if (bugActive) return;
  if (fireActive) cancelFireEvent();

  bugActive = true;
  bugCount = BUG_TOTAL;

  const btn = $("btn-bug");
  if (btn) {
    btn.classList.add("active");
    btn.textContent = "🐛 ELIMINANDO... (" + bugCount + ")";
  }

  const wrap = document.querySelector(".canvas-wrap");
  if (wrap) wrap.classList.add("bug-active");

  const banner = $("bug-banner");
  if (banner) banner.style.display = "block";
  setText("bug-count-display", bugCount + " insectos");

  spawnAllBugs();

  playTone(80, "sawtooth", 0.1, 0.2);
  setTimeout(() => playTone(95, "sawtooth", 0.1, 0.2), 120);
  setTimeout(() => playTone(80, "sawtooth", 0.15, 0.2), 240);

  uiLog("🐛 ¡Evento insectos! Elimina " + BUG_TOTAL + " bichos con reps", "bad");
  emit("event:bug:start", { remaining: bugCount });
}

function spawnAllBugs() {
  const wrap = document.querySelector(".canvas-wrap");
  if (!wrap) return;

  const ww = wrap.offsetWidth || 400;
  const wh = wrap.offsetHeight || 400;
  bugSprites = [];

  for (let i = 0; i < BUG_TOTAL; i++) {
    const el = document.createElement("div");
    el.className = "bug-sprite";
    const emoji = BUG_EMOJIS[Math.floor(Math.random() * BUG_EMOJIS.length)];
    el.textContent = emoji;

    const sx = 10 + Math.random() * (ww - 80);
    const sy = 10 + Math.random() * (wh - 80);
    const dur = 2.5 + Math.random() * 3;
    const rx1 = (Math.random() - 0.5) * 120;
    const ry1 = (Math.random() - 0.5) * 80;
    const rx2 = (Math.random() - 0.5) * 120;
    const ry2 = (Math.random() - 0.5) * 80;

    el.style.cssText = `
      left:${sx}px; top:${sy}px;
      --bdur:${dur}s;
      --brot:${Math.random() * 360}deg;
      --bx1:${rx1}px; --by1:${ry1}px;
      --bx2:${rx2}px; --by2:${ry2}px;
      font-size:${1.8 + Math.random() * 1.2}rem;
      opacity:1;
    `;
    wrap.appendChild(el);
    bugSprites.push(el);
  }
}

function onBugRep() {
  if (!bugActive || bugSprites.length === 0) return;
  bugCount--;

  const bug = bugSprites.pop();
  if (bug) {
    bug.style.transition = "transform 0.15s, opacity 0.4s";
    bug.style.transform = "scale(2)";
    bug.style.opacity = "0";
    setTimeout(() => bug.remove(), 500);
    soundBugSquash();
  }

  setText("bug-count-display", Math.max(0, bugCount) + " insectos");

  const btn = $("btn-bug");
  if (btn) btn.textContent = "🐛 ELIMINANDO... (" + Math.max(0, bugCount) + ")";

  emit("event:bug:update", { remaining: bugCount });

  if (bugCount <= 0) completeBugEvent();
}

function completeBugEvent() {
  bugActive = false;

  bugSprites.forEach(b => b.remove());
  bugSprites = [];

  const wrap = document.querySelector(".canvas-wrap");
  if (wrap) wrap.classList.remove("bug-active");

  const banner = $("bug-banner");
  if (banner) banner.style.display = "none";

  const btn = $("btn-bug");
  if (btn) {
    btn.classList.remove("active");
    btn.textContent = "🐛 INSECTOS";
  }

  const bonus = 25;
  score += bonus;
  setText("count-score", score);
  emit("score", { score });

  [330, 440, 550, 660, 880].forEach((f, i) => playTone(f, "sine", 0.3, 0.2, i * 0.06));
  uiLog(`✅ ¡Todos los bichos eliminados! +${bonus} pts`, "good");
  emit("event:bug:end", { bonus });
}

function cancelBugEvent() {
  bugActive = false;
  clearInterval(bugInterval);

  bugSprites.forEach(b => b.remove());
  bugSprites = [];

  const wrap = document.querySelector(".canvas-wrap");
  if (wrap) wrap.classList.remove("bug-active");

  const banner = $("bug-banner");
  if (banner) banner.style.display = "none";

  const btn = $("btn-bug");
  if (btn) {
    btn.classList.remove("active");
    btn.textContent = "🐛 INSECTOS";
  }

  uiLog("Evento insectos cancelado", "info");
}

// ================================================================
// BARS TM
// ================================================================
function buildBars(labels) {
  const c = $("label-container");
  if (!c) return;

  c.innerHTML = "";
  labels.forEach(label => {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `<span class="bar-name">${label}</span>
      <div class="bar-bg"><div class="bar-fill" id="bar-${label}" style="width:0%"></div></div>
      <span class="bar-pct" id="pct-${label}">0%</span>`;
    c.appendChild(row);
  });
}

function updateBars(predictions, cfg) {
  predictions.forEach(p => {
    const val = Math.round(p.probability * 100);
    const bar = $("bar-" + p.className);
    const lbl = $("pct-" + p.className);
    if (!bar) return;
    bar.style.width = val + "%";
    bar.className = "bar-fill" +
      (p.className === cfg.classUp || p.className === cfg.classUpLeft ? " top"
        : p.className === cfg.classBad ? " bad"
          : p.className === cfg.classMid ? " mid" : "");
    if (lbl) lbl.textContent = val + "%";
  });
}

// ================================================================
// API PÚBLICA
// ================================================================
window.VisionSystem = {
  start: async function (ex) {
    selectModel(ex);
    if (!running) await toggleStart();
  },

  stop: function () {
    if (running) toggleStart();
  },

  changeArm: function () {
    toggleArm();
  },

  getReps: function () {
    return totalReps;
  },

  getState: function () {
    return {
      running,
      selectedKey,
      isLeftArm,
      repsLeft,
      repsRight,
      totalReps,
      score,
      combo,
      fireActive,
      bugActive,
    };
  },

  reset: function () {
    resetAll();
  },

  requestCameraPermission: async function () {
    await ensureSharedCamera();
    return true;
  },

  releaseCamera: function () {
    releaseSharedCamera();
  },

  startMusic,
  stopMusic,

  on,
  off,
};

console.log("VisionSystem listo");