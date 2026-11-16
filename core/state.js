/* DentAI – Núcleo de Estado y Utilidades de UI (core/state.js)
   Manejo de estado global, buffers, reactividad y utilidades visuales */

const $ = (id) => document.getElementById(id);

window.DentAIState = {
  mode: "fill",            // "fill" | "write"
  listening: false,
  paused: false,
  isSpeakingTTS: false,    // Bandera anti-eco: silencia el micro mientras el asistente habla
  speakingText: "",        // Texto exacto que el asistente está pronunciando (para descartar su eco)
  lastSpeechTime: 0,       // Momento en que terminó la última pronunciación
  lastNavTarget: "",       // Último módulo navegado (para debounce anti-repetición)
  lastNavTime: 0,          // Momento de la última navegación
  fields: [],              // campos detectados en Smile
  discoveredTabs: [],      // pestañas/módulos detectados en Smile
  pending: new Map(),      // fieldId -> { valor, label }
  anamnesisAwaiting: null, // Campo nombrado sin valor; espera la siguiente intervención durante un minuto.
  lockedFields: new Set(), // IDs de campos rectificados manualmente (protegidos contra sobreescritura de DNI)
  currentPatient: null,    // Datos del paciente activo
  queue: Promise.resolve(),
  tab: null,
  recognition: null,       // Web Speech API
  lastLatency: 0,
  lastInstantScrollTime: 0, // Debounce para scroll instantáneo en palabras cortas (sube/baja)
};
var state = window.DentAIState;

var JUNK = /^(gracias( por ver( el video)?)?|subt[ií]tulos.*|suscr[ií]bete.*|\.+|…|hmm+|eh+|mm+|ah+|oh+|ok)$/i;

/* ---------- Utilidades de Interfaz y Estado ---------- */
function setStatus(t) {
  const el = $("status");
  if (el) el.textContent = t;
}

function banner(msg, type = "warn") {
  const b = $("banner");
  if (!b) return;
  b.className = "banner" + (type === "err" ? " err" : type === "info" ? " info" : "");
  b.innerHTML = msg;
  if (!msg) b.classList.add("hidden");
  else b.classList.remove("hidden");
}

function updatePulseBadge(active, paused = false) {
  const badge = $("pulseBadge");
  const text = $("pulseText");
  if (!badge || !text) return;

  if (!active) {
    badge.className = "pulse-badge inactive";
    text.textContent = "Micrófono inactivo";
    if (typeof OrbVisualizer !== "undefined") OrbVisualizer.setActive(false);
  } else if (paused) {
    badge.className = "pulse-badge paused";
    text.textContent = "Escucha pausada (di 'continuar')";
    if (typeof OrbVisualizer !== "undefined") {
      OrbVisualizer.setActive(true);
      OrbVisualizer.setPaused(true);
    }
  } else {
    badge.className = "pulse-badge";
    text.textContent = "Escucha activa";
    if (typeof OrbVisualizer !== "undefined") {
      OrbVisualizer.setActive(true);
      OrbVisualizer.setPaused(false);
    }
  }
}

function addTranscript(t, isInterim = false) {
  const box = $("transcript");
  if (!box) return;
  if (box.classList.contains("empty")) {
    box.textContent = "";
    box.classList.remove("empty");
  }

  let interimEl = box.querySelector(".interim");
  if (isInterim) {
    if (!interimEl) {
      interimEl = document.createElement("div");
      interimEl.className = "interim";
      box.prepend(interimEl);
    }
    interimEl.textContent = "… " + t;
    return;
  }

  if (interimEl) interimEl.remove();
  const d = document.createElement("div");
  d.textContent = t;
  box.prepend(d);
  while (box.children.length > 8) box.lastChild.remove();
}

function setMode(m) {
  state.mode = m;
  const tag = $("modeTag");
  if (tag) tag.textContent = m === "write" ? "Modo: Redactar" : "Modo: Llenar";
}
