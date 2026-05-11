// app.js — flujo de pantallas + integración con VisionSystem

const ASSET_ROOT = "imagenes%20Rotacare";

const exercises = [
  {
    key: "lateral",
    name: "Elevación Lateral",
    short: "Lateral",
    image: `${ASSET_ROOT}/ejercicios/lateral.png`,
    instruction: "Levanta el brazo hacia un costado, sin superar la altura del hombro.",
    model: "lateral",
    changeMsg: "Ahora vamos con el brazo izquierdo",
    tip: "Mantén el hombro relajado y controla el movimiento sin balancear el torso."
  },
  {
    key: "frontal",
    name: "Elevación Frontal",
    short: "Frontal",
    image: `${ASSET_ROOT}/ejercicios/frontal.png`,
    instruction: "Eleva el brazo al frente con control, hasta la altura del hombro.",
    model: "frontal",
    changeMsg: "Ahora vamos con el brazo izquierdo",
    tip: "Evita inclinar la espalda y mueve el brazo de forma suave."
  },
  {
    key: "rotacion",
    name: "Rotación",
    short: "Rotación",
    image: `${ASSET_ROOT}/ejercicios/rotacion.png`,
    instruction: "Realiza la rotación con el codo cerca del cuerpo y sin movimientos bruscos.",
    model: "rotacion",
    changeMsg: "Ahora vamos con el brazo izquierdo",
    tip: "La clave es la estabilidad: prioriza técnica sobre velocidad."
  }
];

const state = {
  currentIndex: 0,
  routine: [],
  prepTimer: null,
  exerciseTimer: null,
  randomEventTimer: null,
  completeTimer: null,

  // Duración de cada brazo. El flujo queda: derecho 30s → cambio → izquierdo 30s.
  exerciseSeconds: 30,
  currentArm: "right",

  musicStarted: false,
  cameraReady: false,
  routineTotalReps: 0,
  routineMaxStreak: 0,
  currentExerciseMaxStreak: 0,
  completedExerciseKeys: new Set(),
};

const els = {
  prepTitle: () => document.getElementById("prep-title"),
  prepName: () => document.getElementById("prep-name"),
  prepDesc: () => document.getElementById("prep-desc"),
  prepImg: () => document.getElementById("prep-img"),
  prepInstruction: () => document.getElementById("prep-instruction"),
  prepBar: () => document.getElementById("prep-bar"),
  prepCountdown: () => document.getElementById("prep-countdown"),
  prepSeconds: () => document.getElementById("prep-seconds"),
  exerciseName: () => document.getElementById("exercise-name"),
  armLabel: () => document.getElementById("arm-label"),
  changeMessage: () => document.getElementById("change-message"),
  resultLeft: () => document.getElementById("result-left"),
  resultRight: () => document.getElementById("result-right"),
  resultReps: () => document.getElementById("result-reps"),
  totalReps: () => document.getElementById("total-reps"),
  finalTip: () => document.getElementById("final-tip"),
  timeLeft: () => document.getElementById("time-left"),
  countReps: () => document.getElementById("count-reps"),
  countTotal: () => document.getElementById("count-total"),
  countScore: () => document.getElementById("count-score"),
  comboCount: () => document.getElementById("combo-count"),
  resultStreak: () => document.getElementById("result-streak"),
  completeNextCount: () => document.getElementById("complete-next-count"),
  completeNextLabel: () => document.getElementById("complete-next-label"),
  exerciseProgressFill: () => document.getElementById("exercise-progress-fill"),
  changeExerciseName: () => document.getElementById("change-exercise-name"),
  multiplier: () => document.getElementById("multiplier"),
  phaseBox: () => document.getElementById("phase-box"),
  feedback: () => document.getElementById("feedback"),
};

function isExerciseVisible() {
  return document.getElementById("screen-exercise")?.classList.contains("active");
}

function goTo(screen) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(`screen-${screen}`);
  if (target) target.classList.add("active");
}

function shuffle(arr) {
  return arr
    .map(v => ({ v, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ v }) => v);
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getCurrentExercise() {
  return state.routine[state.currentIndex] || null;
}

function setActiveExerciseUI(ex) {
  if (!ex) return;
  if (els.prepTitle()) els.prepTitle().textContent = ex.name;
  if (els.prepName()) els.prepName().textContent = ex.name;
  if (els.prepDesc()) els.prepDesc().textContent = "Sigue las indicaciones";
  if (els.prepInstruction()) els.prepInstruction().textContent = ex.instruction;
  if (els.prepImg()) {
    els.prepImg().src = ex.image;
    els.prepImg().alt = ex.name;
    els.prepImg().onerror = () => {
      const fallback = els.prepImg().nextElementSibling;
      if (fallback) fallback.style.display = "flex";
      els.prepImg().style.display = "none";
    };
  }
  if (els.exerciseName()) els.exerciseName().textContent = ex.name;
  if (els.changeExerciseName()) els.changeExerciseName().textContent = ex.name;
  if (els.changeMessage()) els.changeMessage().textContent = ex.changeMsg;
  if (els.finalTip()) els.finalTip().textContent = ex.tip;
}

function resetPrepBar() {
  if (els.prepBar()) els.prepBar().style.width = "0%";
  if (els.prepCountdown()) els.prepCountdown().textContent = "Prepárate";
  if (els.prepSeconds()) els.prepSeconds().textContent = "5";
}
function ensureMusicStarted() {
  if (state.musicStarted) return;
  try {
    if (typeof getAudio === "function") getAudio().resume();
    if (window.VisionSystem?.startMusic) {
      window.VisionSystem.startMusic();
    }
    state.musicStarted = true;
  } catch (err) {
    console.warn("No se pudo iniciar la música automáticamente:", err);
  }
}

function bindVisionEvents() {
  if (!window.VisionSystem || !VisionSystem.on) return;

  VisionSystem.on("repUpdate", (data) => {
    // Mostrar el total como contador principal para que sea claro en todos los ejercicios
    if (els.countReps()) els.countReps().textContent = data.total ?? 0;
    if (els.countTotal()) els.countTotal().textContent = data.total ?? 0;
    if (els.countScore()) els.countScore().textContent = data.score ?? 0;
    if (els.comboCount()) els.comboCount().textContent = String(data.combo ?? 0);
  });

  VisionSystem.on("combo", (data) => {
    const streak = Number(data.value ?? 0);
    state.currentExerciseMaxStreak = Math.max(state.currentExerciseMaxStreak, streak);
    state.routineMaxStreak = Math.max(state.routineMaxStreak, streak);
    if (els.comboCount()) els.comboCount().textContent = String(streak);
    if (els.multiplier()) els.multiplier().textContent = `x${(data.multiplier ?? 1).toFixed(1)}`;
  });

  VisionSystem.on("phase", (data) => {
    const el = els.phaseBox();
    if (el) {
      el.className = `phase-box ${data.type || ""}`;
      el.textContent = data.message || "";
    }
  });

  VisionSystem.on("feedback", (data) => {
    const el = els.feedback();
    if (el) {
      el.className = `feedback-box ${data.type || ""}`;
      el.textContent = data.message || "";
    }
  });

  VisionSystem.on("angle", (data) => {
    const el = document.getElementById("angle-display");
    if (el) el.textContent = `${data.value ?? 0}°`;
  });
}

function setMainCounter(value) {
  if (els.countReps()) els.countReps().textContent = String(value);
}

function startPreparation() {
  clearInterval(state.prepTimer);

  goTo("explanation");
  const ex = getCurrentExercise();
  setActiveExerciseUI(ex);
  resetPrepBar();

  let progress = 0;
  let seconds = 5;

  state.prepTimer = setInterval(() => {
    progress += 2;

    if (els.prepBar()) {
      els.prepBar().style.width = `${Math.min(100, progress)}%`;
    }

    const computedSeconds = Math.max(0, 5 - Math.floor((progress / 100) * 5));
    if (computedSeconds !== seconds) {
      seconds = computedSeconds;
      if (els.prepSeconds()) els.prepSeconds().textContent = String(seconds);
    }

    if (progress >= 100) {
      clearInterval(state.prepTimer);
      startExercise();
    }
  }, 100);
}
async function startRoutine() {
  clearInterval(state.prepTimer);
  clearInterval(state.exerciseTimer);
  clearInterval(state.completeTimer);
  stopRandomEvents();

  state.routine = [...exercises];
  state.currentIndex = 0;
  state.currentArm = "right";
  state.routineTotalReps = 0;
  state.routineMaxStreak = 0;
  state.currentExerciseMaxStreak = 0;
  state.completedExerciseKeys = new Set();

  // Activación de audio y permiso de cámara desde el clic del usuario.
  try {
    if (typeof getAudio === "function") {
      await getAudio().resume();
    }

    if (window.VisionSystem?.requestCameraPermission) {
      await VisionSystem.requestCameraPermission();
      state.cameraReady = true;
    }
  } catch (err) {
    console.error("No se pudo preparar la cámara:", err);
    alert("No se pudo acceder a la cámara. Revisa los permisos del navegador y vuelve a intentarlo.");
    goTo("instructions");
    return;
  }

  startPreparation();
}

function startExercise() {
  const ex = getCurrentExercise();
  if (!ex) {
    finishRoutine();
    return;
  }

  clearInterval(state.exerciseTimer);
  clearInterval(state.completeTimer);
  stopRandomEvents();

  goTo("exercise");
  setActiveExerciseUI(ex);

  state.currentArm = "right";
  state.currentExerciseMaxStreak = 0;
  window.RotaCare = window.RotaCare || {};
  window.RotaCare.pauseVisionReps = false;

  if (els.armLabel()) els.armLabel().textContent = "Brazo Derecho";
  if (els.timeLeft()) els.timeLeft().textContent = formatTime(state.exerciseSeconds);
  if (els.exerciseProgressFill()) els.exerciseProgressFill().style.width = "0%";
  if (els.comboCount()) els.comboCount().textContent = "0";
  setMainCounter(0);

  ensureMusicStarted();

  setTimeout(async () => {
    if (!document.getElementById("screen-exercise")?.classList.contains("active")) return;

    if (typeof resizeCanvases === "function") resizeCanvases();

    if (window.VisionSystem) {
      VisionSystem.reset();

      try {
        await VisionSystem.start(ex.model);
      } catch (e) {
        console.error("Error iniciando visión:", e);
        alert("No se pudo iniciar la detección. Revisa la cámara o recarga la página.");
        return;
      }
    }

    startExerciseTimer();
    startRandomEvents();
  }, 500);
}

function startExerciseTimer() {
  clearInterval(state.exerciseTimer);

  let remaining = state.exerciseSeconds;

  if (els.timeLeft()) els.timeLeft().textContent = formatTime(remaining);
  if (els.exerciseProgressFill()) els.exerciseProgressFill().style.width = "0%";

  state.exerciseTimer = setInterval(() => {
    remaining -= 1;
    const safeRemaining = Math.max(0, remaining);
    const elapsed = state.exerciseSeconds - safeRemaining;

    if (els.timeLeft()) els.timeLeft().textContent = formatTime(safeRemaining);
    if (els.exerciseProgressFill()) {
      els.exerciseProgressFill().style.width = `${Math.min(100, (elapsed / state.exerciseSeconds) * 100)}%`;
    }

    if (remaining <= 0) {
      clearInterval(state.exerciseTimer);
      stopRandomEvents();

      if (state.currentArm === "right") {
        showChangeArm();
      } else {
        completeCurrentExercise();
      }
    }
  }, 1000);
}

function startRandomEvents() {
  stopRandomEvents();

  state.randomEventTimer = setInterval(() => {

    if (!window.VisionSystem) return;

    const vs = VisionSystem.getState?.();
    if (!vs) return;


    if (vs.fireActive || vs.bugActive) return;

    const roll = Math.random();

    if (roll < 0.3 && typeof startFireEvent === "function") {
      startFireEvent();
    } 
    else if (roll < 0.6 && typeof startBugEvent === "function") {
      startBugEvent();
    }

  }, 12000); // más frecuente
}

function stopRandomEvents() {
  clearInterval(state.randomEventTimer);
  state.randomEventTimer = null;
}

function showChangeArm() {
  window.RotaCare = window.RotaCare || {};
  window.RotaCare.pauseVisionReps = true;

  goTo("change-arm");

  if (els.changeMessage()) {
    els.changeMessage().textContent = "Ahora vamos con el brazo izquierdo";
  }

  setTimeout(() => {
    state.currentArm = "left";

    if (window.VisionSystem) {
      VisionSystem.changeArm();
    }

    if (els.armLabel()) els.armLabel().textContent = "Brazo Izquierdo";
    if (els.timeLeft()) els.timeLeft().textContent = formatTime(state.exerciseSeconds);
    if (els.exerciseProgressFill()) els.exerciseProgressFill().style.width = "0%";

    window.RotaCare.pauseVisionReps = false;

    goTo("exercise");
    startExerciseTimer();
    startRandomEvents();
  }, 2500);
}

function completeCurrentExercise() {
  stopRandomEvents();
  clearInterval(state.completeTimer);

  window.RotaCare = window.RotaCare || {};
  window.RotaCare.pauseVisionReps = true;

  const stateData = window.VisionSystem?.getState?.() || {};
  const left = stateData.repsLeft ?? 0;
  const right = stateData.repsRight ?? 0;
  const total = stateData.totalReps ?? 0;
  const streak = state.currentExerciseMaxStreak ?? 0;

  state.routineTotalReps += total;

  if (window.VisionSystem) {
    VisionSystem.stop();
  }

  if (els.resultLeft()) els.resultLeft().textContent = left;
  if (els.resultRight()) els.resultRight().textContent = right;
  if (els.resultReps()) els.resultReps().textContent = total;
  if (els.resultStreak()) els.resultStreak().textContent = streak;

  const timeEl = document.getElementById("result-time");
  if (timeEl) timeEl.textContent = formatTime(state.exerciseSeconds * 2);

  goTo("complete-ex");
  startCompleteCountdown();
}

function startCompleteCountdown() {
  clearInterval(state.completeTimer);

  let remaining = 3;
  const isLast = state.currentIndex >= state.routine.length - 1;

  if (els.completeNextLabel()) {
    els.completeNextLabel().textContent = isLast ? "Resumen final en" : "Siguiente ejercicio en";
  }
  if (els.completeNextCount()) els.completeNextCount().textContent = String(remaining);

  state.completeTimer = setInterval(() => {
    remaining -= 1;
    if (els.completeNextCount()) els.completeNextCount().textContent = String(Math.max(0, remaining));

    if (remaining <= 0) {
      clearInterval(state.completeTimer);
      nextExercise();
    }
  }, 1000);
}

function nextExercise() {
  clearInterval(state.completeTimer);
  window.RotaCare = window.RotaCare || {};
  window.RotaCare.pauseVisionReps = false;

  state.currentIndex += 1;

  if (state.currentIndex >= state.routine.length) {
    finishRoutine();
    return;
  }

  startPreparation();
}

function finishRoutine() {
  stopRandomEvents();

  const total = state.routineTotalReps ?? 0;

  if (els.totalReps()) els.totalReps().textContent = total;
  goTo("finish");
}

function restartRoutine() {
  clearInterval(state.prepTimer);
  clearInterval(state.exerciseTimer);
  clearInterval(state.completeTimer);
  stopRandomEvents();

  if (window.VisionSystem) {
    VisionSystem.reset();
    VisionSystem.stop();
  }

  window.RotaCare = window.RotaCare || {};
  window.RotaCare.pauseVisionReps = false;

  state.musicStarted = false;
  state.currentArm = "right";
  state.routineTotalReps = 0;
  state.routineMaxStreak = 0;
  state.currentExerciseMaxStreak = 0;
  state.completedExerciseKeys = new Set();
  goTo("home");
}

function exposeGlobalControls() {
  window.goTo = goTo;
  window.startRoutine = startRoutine;
  window.nextExercise = nextExercise;
  window.restartRoutine = restartRoutine;
}

function initApp() {
  exposeGlobalControls();
  goTo("home");
  bindVisionEvents();
  resetPrepBar();

  const active = getCurrentExercise() || exercises[0];
  setActiveExerciseUI(active);

  const btnOk = document.getElementById("btn-instructions-ok");
  if (btnOk) {
    btnOk.onclick = () => startRoutine();
  }

  console.log("RotaCare UI monolítica inicializada correctamente");
}

let appInitialized = false;
function bootApp() {
  if (appInitialized) return;
  appInitialized = true;
  initApp();
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", bootApp);
} else {
  bootApp();
}

window.addEventListener("pageshow", (event) => {
  // Cuando el navegador restaura la página desde bfcache, se limpia el estado visual.
  if (event.persisted) {
    try { restartRoutine(); } catch (_) { goTo("home"); }
  }
});

window.addEventListener("beforeunload", () => {
  try {
    clearInterval(state.prepTimer);
    clearInterval(state.exerciseTimer);
    clearInterval(state.completeTimer);
    stopRandomEvents();
    if (window.VisionSystem?.releaseCamera) VisionSystem.releaseCamera();
  } catch (e) {
    console.warn("No se pudo limpiar la app antes de recargar:", e);
  }
});