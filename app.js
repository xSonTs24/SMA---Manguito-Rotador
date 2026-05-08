// app.js — flujo de pantallas + integración con VisionSystem

const exercises = [
  {
    key: "lateral",
    name: "Elevación Lateral",
    short: "Lateral",
    image: "img/lateral.png",
    instruction: "Levanta el brazo hacia un costado, sin superar la altura del hombro.",
    model: "lateral",
    changeMsg: "Ahora vamos con el brazo izquierdo",
    tip: "Mantén el hombro relajado y controla el movimiento sin balancear el torso."
  },
  {
    key: "frontal",
    name: "Elevación Frontal",
    short: "Frontal",
    image: "img/frontal.png",
    instruction: "Eleva el brazo al frente con control, hasta la altura del hombro.",
    model: "frontal",
    changeMsg: "Ahora vamos con el brazo izquierdo",
    tip: "Evita inclinar la espalda y mueve el brazo de forma suave."
  },
  {
    key: "rotacion",
    name: "Rotación",
    short: "Rotación",
    image: "img/rotacion.png",
    instruction: "Realiza la rotación con el codo cerca del cuerpo y sin movimientos bruscos.",
    model: "rotacion",
    changeMsg: "Ahora vamos con el brazo izquierdo",
    tip: "La clave es la estabilidad: prioriza técnica sobre velocidad."
  },
  {
    key: "lateral",
    name: "Elevación Lateral",
    short: "Lateral",
    image: "img/lateral.png",
    instruction: "Levanta el brazo hacia un costado, sin superar la altura del hombro.",
    model: "lateral",
    changeMsg: "Ahora vamos con el brazo izquierdo",
    tip: "Mantén el hombro relajado y controla el movimiento sin balancear el torso."
  },
  {
    key: "frontal",
    name: "Elevación Frontal",
    short: "Frontal",
    image: "img/frontal.png",
    instruction: "Eleva el brazo al frente con control, hasta la altura del hombro.",
    model: "frontal",
    changeMsg: "Ahora vamos con el brazo izquierdo",
    tip: "Evita inclinar la espalda y mueve el brazo de forma suave."
  },
  {
    key: "rotacion",
    name: "Rotación Interna",
    short: "Rotación",
    image: "img/rotacion.png",
    instruction: "Gira el brazo con el hombro estable y sin forzar el rango.",
    model: "rotacion",
    changeMsg: "Ahora vamos con el brazo izquierdo",
    tip: "Si pierdes control, reduce la velocidad del movimiento."
  },
  {
    key: "lateral",
    name: "Elevación Lateral",
    short: "Lateral",
    image: "img/lateral.png",
    instruction: "Levanta el brazo hacia un costado, sin superar la altura del hombro.",
    model: "lateral",
    changeMsg: "Ahora vamos con el brazo izquierdo",
    tip: "Mantén el hombro relajado y controla el movimiento sin balancear el torso."
  }
];

const state = {
  currentIndex: 0,
  routine: [],
  prepTimer: null,
  exerciseTimer: null,
  randomEventTimer: null,
  exerciseSeconds: 60,
  armSwitchAt: 30,
  musicStarted: false,
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
  multiplier: () => document.getElementById("multiplier"),
  phaseBox: () => document.getElementById("phase-box"),
  feedback: () => document.getElementById("feedback"),
};

function isExerciseVisible() {
  return document.getElementById("exercise-screen")?.classList.contains("active");
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
  if (els.changeMessage()) els.changeMessage().textContent = ex.changeMsg;
  if (els.finalTip()) els.finalTip().textContent = ex.tip;
}

function resetPrepBar() {
  if (els.prepBar()) els.prepBar().style.width = "0%";
  if (els.prepCountdown()) els.prepCountdown().textContent = "Prepárate";
  if (els.prepSeconds()) els.prepSeconds().textContent = "5s";
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
    if (els.comboCount()) els.comboCount().textContent = `x${data.combo ?? 0}`;
  });

  VisionSystem.on("combo", (data) => {
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

  const totalMs = 500; // 50 pasos x 100ms = 5 segundos
  const circumference = 276.46;
  let progress = 0;
  let seconds = 5;

  const circleFill = document.getElementById("prep-circle-fill");
  const prepSecs = document.getElementById("prep-seconds");

  if (circleFill) circleFill.style.strokeDashoffset = "0";
  if (prepSecs) prepSecs.textContent = "5";

  state.prepTimer = setInterval(() => {
    progress += 2;

    // Animar círculo (va vaciándose)
    if (circleFill) {
      circleFill.style.strokeDashoffset = String((progress / 100) * circumference);
    }

    const computedSeconds = Math.max(0, 5 - Math.floor((progress / 100) * 5));
    if (computedSeconds !== seconds) {
      seconds = computedSeconds;
      if (prepSecs) prepSecs.textContent = String(seconds);
    }

    if (progress >= 100) {
      clearInterval(state.prepTimer);
      startExercise();
    }
  }, 100);
}

function startRoutine() {
  state.routine = shuffle([...exercises]);
  state.currentIndex = 0;

  // 🔥 FORZAR ACTIVACIÓN DE AUDIO
  if (typeof getAudio === "function") {
    getAudio().resume();
  }

  startPreparation();
}

function startExercise() {
  const ex = getCurrentExercise();
  if (!ex) {
    finishRoutine();
    return;
  }

  goTo("exercise");
  setActiveExerciseUI(ex);
  if (els.armLabel()) els.armLabel().textContent = "Brazo Derecho";
  if (els.timeLeft()) els.timeLeft().textContent = formatTime(state.exerciseSeconds);
  setMainCounter(0);

  // Iniciar música una sola vez, ya dentro de la interacción del usuario.
  ensureMusicStarted();

  // Dar tiempo a que la pantalla esté visible antes de arrancar la cámara.
setTimeout(async () => {
    if (typeof resizeCanvases === "function") resizeCanvases();
    if (window.VisionSystem) {
      VisionSystem.reset();

      try {
        await VisionSystem.start(ex.model);
      } catch (e) {
        console.error("Error iniciando visión:", e);
        return;
      }
    }

    startExerciseTimer();
    startRandomEvents();

  }, 800); // ⬅️ más tiempo para render + cámara
}

function startExerciseTimer() {
  clearInterval(state.exerciseTimer);

  let remaining = state.exerciseSeconds;
  let switched = false;

  if (els.timeLeft()) els.timeLeft().textContent = formatTime(remaining);

  state.exerciseTimer = setInterval(() => {
    remaining -= 1;
    if (els.timeLeft()) els.timeLeft().textContent = formatTime(Math.max(0, remaining));

    if (!switched && remaining === state.armSwitchAt) {
      switched = true;
      showChangeArm();
    }

    if (remaining <= 0) {
      clearInterval(state.exerciseTimer);
      stopRandomEvents();
      completeCurrentExercise();
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
  goTo("change-arm");
  if (els.changeMessage()) {
    els.changeMessage().textContent = "Ahora vamos con el brazo izquierdo";
  }

  setTimeout(() => {
    if (window.VisionSystem) {
      VisionSystem.changeArm();
    }
    goTo("exercise");
  }, 2500);
}

function completeCurrentExercise() {
  if (window.VisionSystem) {
    VisionSystem.stop();
  }

  const stateData = window.VisionSystem?.getState?.() || {};
  const left = stateData.repsLeft ?? 0;
  const right = stateData.repsRight ?? 0;
  const total = stateData.totalReps ?? 0;

  if (els.resultLeft()) els.resultLeft().textContent = left;
  if (els.resultRight()) els.resultRight().textContent = right;
  if (els.resultReps()) els.resultReps().textContent = total;

  const timeEl = document.getElementById("result-time");
  if (timeEl) timeEl.textContent = formatTime(state.exerciseSeconds);

  goTo("complete-ex");

  // No hace falta tocar siguiente: avanza solo.
  setTimeout(() => nextExercise(), 2800);
}

function nextExercise() {
  state.currentIndex += 1;

  if (state.currentIndex >= state.routine.length) {
    finishRoutine();
    return;
  }

  startPreparation();
}

function finishRoutine() {
  stopRandomEvents();

  const stateData = window.VisionSystem?.getState?.() || {};
  const total = stateData.totalReps ?? 0;

  if (els.totalReps()) els.totalReps().textContent = total;
  goTo("finish");
}

function restartRoutine() {
  clearInterval(state.prepTimer);
  clearInterval(state.exerciseTimer);
  stopRandomEvents();

  if (window.VisionSystem) {
    VisionSystem.reset();
    VisionSystem.stop();
  }

  state.musicStarted = false;
  goTo("home");
}

function initApp() {
  goTo("home");
  bindVisionEvents();
  resetPrepBar();

  const active = getCurrentExercise() || exercises[0];
  setActiveExerciseUI(active);

  const btnOk = document.getElementById("btn-instructions-ok");
  if (btnOk) btnOk.addEventListener("click", () => startRoutine());
}

window.addEventListener("DOMContentLoaded", () => {
  console.log("UI lista");
  initApp();
});