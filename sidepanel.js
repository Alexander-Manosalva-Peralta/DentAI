/* DentAI – Lógica del panel lateral Manos Libres (Cero Contaminación Cruzada)
   Mapeo semántico para Smile, normalización de números con espacios, filtro anti-eco y validación estricta de fechas. */

const $ = (id) => document.getElementById(id);

const state = {
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
  lockedFields: new Set(), // IDs de campos rectificados manualmente (protegidos contra sobreescritura de DNI)
  currentPatient: null,    // Datos del paciente activo
  queue: Promise.resolve(),
  tab: null,
  recognition: null,       // Web Speech API
  lastLatency: 0,
  lastInstantScrollTime: 0, // Debounce para scroll instantáneo en palabras cortas (sube/baja)
};

const JUNK = /^(gracias( por ver( el video)?)?|subt[ií]tulos.*|suscr[ií]bete.*|\.+|…|hmm+|eh+|mm+|ah+|oh+|ok)$/i;

/* ---------- Síntesis de voz (TTS) con respuestas ultra-cortas y anti-eco ---------- */
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  chrome.storage.local.get("voiceFeedback", ({ voiceFeedback = true }) => {
    if (!voiceFeedback) return;
    try {
      window.speechSynthesis.cancel();

      state.isSpeakingTTS = true;
      state.speakingText = String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
      state.lastSpeechTime = Date.now();

      const u = new SpeechSynthesisUtterance(text);
      u.lang = "es-PE";
      u.rate = 1.15;
      u.pitch = 1.0;

      u.onstart = () => {
        state.isSpeakingTTS = true;
        if (typeof OrbVisualizer !== "undefined") OrbVisualizer.setSpeaking(true);
      };

      const finishSpeech = () => {
        if (typeof OrbVisualizer !== "undefined") OrbVisualizer.setSpeaking(false);
        setTimeout(() => {
          state.isSpeakingTTS = false;
        }, 500);
      };

      u.onend = finishSpeech;
      u.onerror = finishSpeech;

      // Respaldo de seguridad para que nunca se quede trabado
      setTimeout(() => {
        state.isSpeakingTTS = false;
        if (typeof OrbVisualizer !== "undefined") OrbVisualizer.setSpeaking(false);
      }, 2000);

      window.speechSynthesis.speak(u);
    } catch (e) {
      state.isSpeakingTTS = false;
      if (typeof OrbVisualizer !== "undefined") OrbVisualizer.setSpeaking(false);
      console.warn("TTS error:", e);
    }
  });
}

/* ========================================================
   DENTAI APPLE INTELLIGENCE PERSONA ORB CONTROLLER
   Gestión de la cara del robot con ojos cápsula, ondas holográficas fluidas
   y ondas acústicas de sonido estilo Apple (iOS 18 / macOS Sequoia).
   ======================================================== */
const OrbVisualizer = {
  heroCard: null,
  orb: null,
  canvas: null,
  ctx: null,
  animId: null,
  isHearing: false,
  isSpeaking: false,
  isThinking: false,
  speechEnergy: 0,
  targetEnergy: 0,
  phase: 0,
  silenceTimer: null,

  init() {
    this.heroCard = document.querySelector(".orb-hero-card");
    this.orb = $("aiOrb");
    this.canvas = $("orbWaveCanvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    // Click en el orbe para pausar / reanudar
    if (this.orb) {
      this.orb.onclick = () => {
        const badge = $("pulseBadge");
        if (badge) badge.click();
      };
    }

    this.startLoop();
  },

  setHearing(active, energy = 0.85) {
    this.isHearing = active;
    if (active) {
      this.targetEnergy = Math.max(0.65, Math.min(1.0, energy));
      if (this.heroCard) this.heroCard.classList.add("hearing");
      clearTimeout(this.silenceTimer);
      // Volver a modo cara con ojos tras 1.2 segundos de silencio
      this.silenceTimer = setTimeout(() => {
        this.setHearing(false);
      }, 1200);
    } else {
      this.targetEnergy = 0;
      if (this.heroCard) this.heroCard.classList.remove("hearing");
    }
  },

  setSpeaking(active) {
    this.isSpeaking = active;
    if (this.heroCard) {
      if (active) {
        this.heroCard.classList.add("speaking");
        this.targetEnergy = 0.8;
      } else {
        this.heroCard.classList.remove("speaking");
        this.targetEnergy = 0;
      }
    }
  },

  setThinking(active) {
    this.isThinking = active;
    if (this.heroCard) {
      if (active) this.heroCard.classList.add("thinking");
      else this.heroCard.classList.remove("thinking");
    }
  },

  setPaused(paused) {
    if (this.heroCard) {
      if (paused) this.heroCard.classList.add("paused");
      else this.heroCard.classList.remove("paused");
    }
  },

  setActive(active) {
    if (this.heroCard) {
      if (!active) this.heroCard.classList.add("inactive");
      else this.heroCard.classList.remove("inactive");
    }
  },

  startLoop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    const render = () => {
      this.draw();
      this.animId = requestAnimationFrame(render);
    };
    this.animId = requestAnimationFrame(render);
  },

  draw() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Física amortiguada para transiciones fluidas de la onda
    this.speechEnergy += (this.targetEnergy - this.speechEnergy) * 0.16;
    this.phase += 0.06 + this.speechEnergy * 0.08;

    ctx.clearRect(0, 0, w, h);

    // Si no hay energía activa, no dibujar onda para ahorrar GPU
    if (this.speechEnergy < 0.01 && !this.isHearing && !this.isSpeaking) {
      return;
    }

    const centerY = h / 2;
    const maxAmp = 26 * this.speechEnergy;
    const waveWidth = w * 0.82;
    const startX = (w - waveWidth) / 2;
    const endX = startX + waveWidth;

    ctx.save();

    // Capa 1: Cinta de onda holográfica volumétrica 3D (Cian - Azul - Violeta - Magenta, idéntica a Imagen 2)
    ctx.beginPath();
    ctx.moveTo(startX, centerY);
    for (let x = startX; x <= endX; x += 2) {
      const normX = (x - startX) / waveWidth;
      const envelope = Math.sin(normX * Math.PI); // Ventana Hann (0 en bordes, 1 al centro)
      const y = centerY - Math.sin(normX * 9.5 + this.phase) * maxAmp * envelope;
      ctx.lineTo(x, y);
    }
    for (let x = endX; x >= startX; x -= 2) {
      const normX = (x - startX) / waveWidth;
      const envelope = Math.sin(normX * Math.PI);
      const y = centerY + Math.sin(normX * 8 + this.phase + 1.1) * (maxAmp * 0.95) * envelope;
      ctx.lineTo(x, y);
    }
    ctx.closePath();

    const grad1 = ctx.createLinearGradient(startX, centerY - maxAmp, endX, centerY + maxAmp);
    grad1.addColorStop(0, "rgba(56, 189, 248, 0.92)");   // Cian luminoso
    grad1.addColorStop(0.35, "rgba(59, 130, 246, 0.88)"); // Azul Apple
    grad1.addColorStop(0.7, "rgba(168, 85, 247, 0.92)");  // Púrpura eléctrico
    grad1.addColorStop(1, "rgba(236, 72, 153, 0.88)");   // Magenta brillante
    ctx.fillStyle = grad1;
    ctx.shadowColor = "rgba(56, 189, 248, 0.85)";
    ctx.shadowBlur = 12;
    ctx.fill();

    // Capa 2: Resaltado especular en el lomo superior de la onda
    ctx.beginPath();
    ctx.moveTo(startX, centerY);
    for (let x = startX; x <= endX; x += 2) {
      const normX = (x - startX) / waveWidth;
      const envelope = Math.sin(normX * Math.PI);
      const y = centerY - Math.sin(normX * 9.5 + this.phase) * maxAmp * envelope;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 1.6;
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 6;
    ctx.stroke();

    // Capa 3: Resonancia interna translúcida
    ctx.beginPath();
    ctx.moveTo(startX, centerY);
    for (let x = startX; x <= endX; x += 2) {
      const normX = (x - startX) / waveWidth;
      const envelope = Math.sin(normX * Math.PI);
      const y = centerY + Math.cos(normX * 11 - this.phase * 1.2) * (maxAmp * 0.45) * envelope;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(168, 85, 247, 0.55)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
  }
};

/* ---------- Utilidades de Interfaz ---------- */
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

/* ---------- Pestaña activa y Permisos de sitio en Smile ---------- */
async function activeTab() {
  try {
    const [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    state.tab = t || null;
    return t || null;
  } catch (e) {
    console.warn("activeTab error:", e);
    return null;
  }
}

async function checkSite() {
  try {
    const t = await activeTab();
    if (!t || !t.url || !/^https?:/.test(t.url)) {
      banner("Abre la plataforma Smile en la pestaña principal de Chrome.", "info");
      if ($("host")) $("host").textContent = "";
      return false;
    }
    const urlObj = new URL(t.url);
    if ($("host")) $("host").textContent = urlObj.host;

    const origin = urlObj.origin;
    const ok = await chrome.permissions.contains({ origins: [origin + "/*"] });
    if (!ok) {
      banner(`DentAI necesita permiso en <b>${urlObj.host}</b>. <button id="grantSiteBtn" style="padding:4px 8px;font-size:11px;margin-left:6px;border-radius:4px;cursor:pointer;">Autorizar sitio</button>`, "info");
      const gBtn = $("grantSiteBtn");
      if (gBtn) {
        gBtn.onclick = async () => {
          if (await chrome.permissions.request({ origins: [origin + "/*"] })) {
            banner("");
            scan();
          }
        };
      }
      return false;
    }
    banner("");
    return true;
  } catch (e) {
    console.warn("checkSite error:", e);
    return false;
  }
}

/* ---------- Escaneo de campos y pestañas de Smile ---------- */
async function scan() {
  if (!(await checkSite())) return [];
  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId: state.tab.id, allFrames: true },
      func: dentaiScan,
    });
    const all = [];
    let n = 0;
    for (const r of res) {
      for (const f of (r.result || [])) {
        all.push({ ...f, frameId: r.frameId, id: n++ });
      }
    }
    state.fields = all;
    renderFields();
    await scanTabs();
    return all;
  } catch (e) {
    console.warn("Scan error:", e);
    return [];
  }
}

async function scanTabs() {
  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId: state.tab.id, allFrames: false },
      func: dentaiListTabs,
    });
    const tabs = (res && res[0] && res[0].result) || [];
    state.discoveredTabs = tabs;
    renderTabs();
  } catch (e) {
    console.warn("Scan tabs error:", e);
  }
}

function renderTabs() {
  const container = $("tabsDiscovered");
  if (!container) return;
  container.innerHTML = "";
  if (!state.discoveredTabs.length) {
    container.innerHTML = `<span class="empty">Di “ve a preregistro”, “abre agenda”, “ir a servicio”, etc.</span>`;
    return;
  }
  state.discoveredTabs.forEach((tab) => {
    const pill = document.createElement("span");
    pill.className = "tab-pill";
    pill.textContent = tab;
    container.appendChild(pill);
  });
}

function renderFields() {
  const box = $("fields");
  if (!box) return;
  box.innerHTML = "";
  state.fields.forEach((f) => {
    const d = document.createElement("div");
    d.textContent = `${f.etiqueta || "(sin etiqueta)"} · ${f.tipo}` + (f.seccion ? ` · ${f.seccion}` : "");
    box.appendChild(d);
  });
  if (!state.fields.length) box.innerHTML = `<span class="empty">No se detectaron campos de entrada en esta pantalla.</span>`;
}

/* ---------- Navegación por voz entre pestañas de Smile ---------- */
async function navigateToTab(targetName) {
  if (!targetName) return false;

  const now = Date.now();
  const normTarget = targetName.toLowerCase().trim();

  // DEBOUNCE: evitar navegar repetidamente al mismo destino en menos de 2.5 segundos
  if (state.lastNavTarget === normTarget && (now - (state.lastNavTime || 0)) < 2500) {
    console.log("Debounce: ignorando navegación duplicada a ->", targetName);
    return true;
  }
  state.lastNavTarget = normTarget;
  state.lastNavTime = now;

  setStatus(`Buscando pestaña "${targetName}"…`);
  try {
    const t = await activeTab();
    const tabId = (t && t.id) || (state.tab && state.tab.id);
    if (!tabId) {
      setStatus(`Abre Smile en la pestaña principal.`);
      return false;
    }

    const res = await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: dentaiNavigate,
      args: [targetName],
    });

    let found = false;
    let matchedName = targetName;
    let targetUrl = null;

    for (const r of res) {
      if (r.result && r.result.ok) {
        found = true;
        matchedName = r.result.matched || targetName;
        if (r.result.url) {
          targetUrl = r.result.url;
        }
        break;
      }
    }

    if (found) {
      if (/guardar/i.test(matchedName)) {
        speak("Guardando.");
        setStatus("Guardando datos en Smile…");
      } else if (/limpiar/i.test(matchedName)) {
        speak("Formulario limpio.");
        setStatus("Formulario de Smile limpiado.");
      } else {
        speak("Listo.");
        setStatus(`Navegando a: ${matchedName}…`);
      }

      // Si obtuvimos la URL de navegación de Smile, asegurar la navegación con la API de Chrome
      if (targetUrl) {
        try {
          await chrome.tabs.update(tabId, { url: targetUrl });
        } catch (e) {
          console.warn("Tab update error:", e);
        }
      }

      setTimeout(async () => {
        await scan();
        setStatus(`Pestaña "${matchedName}" lista. Escuchando…`);
      }, 1000);
      return true;
    } else {
      speak("No encontrado.");
      setStatus(`Pestaña o botón "${targetName}" no encontrado.`);
      return false;
    }
  } catch (e) {
    console.error("Navigation error:", e);
    setStatus("Error al navegar: " + e.message);
    return false;
  }
}

/* ---------- Desplazamiento por voz (Scroll Manos Libres) ---------- */
async function scrollPage(dir, amount = 380) {
  try {
    const t = await activeTab();
    const tabId = (t && t.id) || (state.tab && state.tab.id);
    if (!tabId) return false;

    await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: dentaiScroll,
      args: [dir, amount]
    });

    // Retroalimentación visual inmediata sin retraso TTS para permitir dictar "baja, baja, baja" fluido
    setStatus(dir === "up" ? "Subiendo formulario…" : "Bajando formulario…");
    return true;
  } catch (e) {
    console.warn("Scroll error:", e);
    return false;
  }
}

/* ---------- Desplazamiento directo a secciones del formulario ---------- */
async function scrollToSection(secName) {
  if (!secName) return false;
  try {
    const t = await activeTab();
    const tabId = (t && t.id) || (state.tab && state.tab.id);
    if (!tabId) return false;

    const res = await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: dentaiScrollToSection,
      args: [secName],
    });

    const anyOk = res && res.some((r) => r.result === true);
    if (anyOk) {
      speak(secName.slice(0, 18) + ".");
      setStatus(`Desplazado a sección ${secName}.`);
      return true;
    }
  } catch (e) {
    console.warn("Scroll to section error:", e);
  }
  return false;
}

/* ---------- CONSULTA DE PACIENTE (BASE DE DATOS CLÍNICA / SUPABASE / RENIEC) ---------- */
async function buscarPaciente(dni, s) {
  if (!dni || dni.length !== 8) return null;

  // 1. Consultar Base de Datos en la Nube (Supabase REST API si está configurada)
  if (s.dbProvider === "supabase" && s.supabaseUrl && s.supabaseKey) {
    try {
      setStatus(`Consultando Supabase para DNI ${dni}…`);
      const baseUrl = s.supabaseUrl.replace(/\/+$/, "");
      const res = await fetch(`${baseUrl}/rest/v1/pacientes?dni=eq.${dni}&select=*`, {
        headers: {
          apikey: s.supabaseKey,
          Authorization: `Bearer ${s.supabaseKey}`,
          Accept: "application/json"
        }
      });
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0) {
          const p = rows[0];
          return {
            origen: "Supabase",
            dni: dni,
            nombres: (p.nombres || p.nombre || "").trim(),
            apellidoPaterno: (p.apellido_paterno || p.apellidoPaterno || "").trim(),
            apellidoMaterno: (p.apellido_materno || p.apellidoMaterno || "").trim(),
            genero: (p.genero || "MASCULINO").toUpperCase(),
            fechaNacimiento: p.fecha_nacimiento || p.fechaNacimiento || "",
            celular: p.celular || p.telefono || "",
            email: p.email || p.correo || "",
            direccion: p.direccion || p.calle || "",
            departamento: p.departamento || "LIMA",
            provincia: p.provincia || "LIMA",
            distrito: p.distrito || ""
          };
        }
      }
    } catch (e) {
      console.warn("Supabase query error:", e);
    }
  }

  // 2. Consultar API REST personalizada (servidor local de la clínica o laptop)
  if (s.dbProvider === "custom_api" && s.customApiUrl) {
    try {
      setStatus(`Consultando API clínica para DNI ${dni}…`);
      const res = await fetch(`${s.customApiUrl}?dni=${dni}`);
      if (res.ok) {
        const p = await res.json();
        if (p && (p.nombres || p.nombre)) {
          return {
            origen: "API Clínica",
            dni: dni,
            nombres: (p.nombres || p.nombre || "").trim(),
            apellidoPaterno: (p.apellido_paterno || p.apellidoPaterno || "").trim(),
            apellidoMaterno: (p.apellido_materno || p.apellidoMaterno || "").trim(),
            genero: (p.genero || "MASCULINO").toUpperCase(),
            fechaNacimiento: p.fecha_nacimiento || p.fechaNacimiento || "",
            celular: p.celular || p.telefono || "",
            email: p.email || p.correo || "",
            direccion: p.direccion || p.calle || "",
            departamento: p.departamento || "LIMA",
            provincia: p.provincia || "LIMA",
            distrito: p.distrito || ""
          };
        }
      }
    } catch (e) {
      console.warn("Custom API query error:", e);
    }
  }

  // 3. Consultar Base de Datos Local / Ficticia (Triaje / Recepción de la clínica)
  try {
    let db = (typeof DEFAULT_PATIENTS_DB !== "undefined") ? DEFAULT_PATIENTS_DB : [];
    if (s.localPatientsDb) {
      try {
        const parsed = JSON.parse(s.localPatientsDb);
        if (Array.isArray(parsed) && parsed.length > 0) db = parsed;
      } catch (err) {}
    }
    const foundLocal = db.find((p) => String(p.dni).replace(/\D/g, "") === dni);
    if (foundLocal) {
      return {
        origen: "Base de Datos Clínica",
        dni: dni,
        nombres: foundLocal.nombres || "",
        apellidoPaterno: foundLocal.apellidoPaterno || foundLocal.apellido_paterno || "",
        apellidoMaterno: foundLocal.apellidoMaterno || foundLocal.apellido_materno || "",
        genero: (foundLocal.genero || "MASCULINO").toUpperCase(),
        fechaNacimiento: foundLocal.fechaNacimiento || foundLocal.fecha_nacimiento || "",
        celular: foundLocal.celular || "",
        email: foundLocal.email || foundLocal.correo || "",
        direccion: foundLocal.direccion || foundLocal.calle || "",
        departamento: foundLocal.departamento || "LIMA",
        provincia: foundLocal.provincia || "LIMA",
        distrito: foundLocal.distrito || ""
      };
    }
  } catch (e) {
    console.warn("Local DB lookup error:", e);
  }

  // 4. Fallback a RENIEC oficial si no estuvo en base de datos
  if (s.dniAutoQuery && s.dniApiToken) {
    setStatus(`Consultando RENIEC para DNI ${dni}…`);
    try {
      const url = `https://api.decolecta.com/v1/reniec/dni?numero=${dni}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${s.dniApiToken}`, Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          origen: "RENIEC",
          dni: dni,
          nombres: (data.nombres || data.nombre || "").trim(),
          apellidoPaterno: (data.apellidoPaterno || data.primer_apellido || data.apellido_paterno || "").trim(),
          apellidoMaterno: (data.apellidoMaterno || data.segundo_apellido || data.apellido_materno || "").trim(),
        };
      }
    } catch (e) {
      console.warn("Fallo consulta DNI RENIEC:", e);
    }
  }

  return null;
}

function poblarCamposPaciente(patient) {
  if (!patient) return [];
  state.currentPatient = patient;

  const addedLabels = [];

  // Nombres y Apellidos (No sobreescribir si fueron rectificados manualmente por voz)
  const nomField = findField(/identificacion/i, /^nombre$/i);
  const patField = findField(/identificacion/i, /primer\s+apellido/i);
  const matField = findField(/identificacion/i, /segundo\s+apellido/i);
  if (nomField && patient.nombres && !state.lockedFields.has(nomField.id)) {
    state.pending.set(nomField.id, { valor: patient.nombres, label: "Nombre" });
    addedLabels.push("Nombre");
  }
  if (patField && patient.apellidoPaterno && !state.lockedFields.has(patField.id)) {
    state.pending.set(patField.id, { valor: patient.apellidoPaterno, label: "Primer Apellido" });
    addedLabels.push("Primer Apellido");
  }
  if (matField && patient.apellidoMaterno && !state.lockedFields.has(matField.id)) {
    state.pending.set(matField.id, { valor: patient.apellidoMaterno, label: "Segundo Apellido" });
    addedLabels.push("Segundo Apellido");
  }

  // Género
  if (patient.genero) {
    const genField = findField(/identificacion/i, /genero|sexo/i);
    if (genField && !state.lockedFields.has(genField.id)) {
      state.pending.set(genField.id, { valor: patient.genero, label: "Género" });
      addedLabels.push("Género");
    }
  }

  // Fecha de Nacimiento
  if (patient.fechaNacimiento) {
    const nacField = findField(/identificacion/i, /nacimiento/i);
    if (nacField && !state.lockedFields.has(nacField.id)) {
      state.pending.set(nacField.id, { valor: patient.fechaNacimiento, label: "Fecha Nacimiento" });
      addedLabels.push("Fecha Nacimiento");
    }
  }

  // Tipo identificación y Documento
  const tipoField = findField(/identificacion/i, /tipo.*ident/i) || findField(null, /tipo.*ident/i);
  const docField = findField(/identificacion/i, /^documento$|dni/i) || findField(null, /^documento$|dni/i);
  if (tipoField && !state.lockedFields.has(tipoField.id)) {
    state.pending.set(tipoField.id, { valor: patient.tipoIdentificacion || "DNI", label: "Tipo identificación" });
    addedLabels.push("Tipo ID");
  }
  if (docField && !state.lockedFields.has(docField.id)) {
    state.pending.set(docField.id, { valor: patient.dni, label: "Documento" });
    addedLabels.push("DNI");
  }

  // Contacto: Celular
  if (patient.celular) {
    const celField = findField(/contacto/i, /celular/i) || findField(null, /celular/i);
    if (celField && !state.lockedFields.has(celField.id)) {
      state.pending.set(celField.id, { valor: patient.celular, label: "Celular" });
      addedLabels.push("Celular");
    }
  }

  // Contacto: Email
  if (patient.email) {
    const emailField = findField(/contacto/i, /email|correo/i) || findField(null, /email|correo/i);
    if (emailField && !state.lockedFields.has(emailField.id)) {
      state.pending.set(emailField.id, { valor: patient.email, label: "Email" });
      addedLabels.push("Email");
    }
  }

  // Dirección: Calle, No. Exterior, Referencia, Departamento, Provincia, Distrito
  if (patient.direccion) {
    const calleField = findField(/direcci[oó]n/i, /^calle$|calle(?!.*ext)|direcci[oó]n(?!.*ext)/i) || findField(null, /^calle$|calle(?!.*ext)|direcci[oó]n(?!.*ext)/i);
    if (calleField && !state.lockedFields.has(calleField.id)) {
      state.pending.set(calleField.id, { valor: patient.direccion, label: "Calle" });
      addedLabels.push("Calle");
    }
  }
  if (patient.numeroExterior) {
    const extField = findField(/direcci[oó]n/i, /exterior|no\.\s*exterior|num_ext|numext|vivienda/i) || findField(null, /exterior|no\.\s*exterior|num_ext|numext|vivienda/i);
    if (extField && !state.lockedFields.has(extField.id)) {
      state.pending.set(extField.id, { valor: patient.numeroExterior, label: "No. Exterior" });
      addedLabels.push("No. Exterior");
    }
  }
  if (patient.referencia) {
    const refField = findField(/direcci[oó]n/i, /referencia/i);
    if (refField && !state.lockedFields.has(refField.id)) {
      state.pending.set(refField.id, { valor: patient.referencia, label: "Referencia" });
      addedLabels.push("Referencia");
    }
  }
  if (patient.departamento) {
    const depField = findField(/direcci[oó]n/i, /departamento/i);
    if (depField) { state.pending.set(depField.id, { valor: patient.departamento, label: "Departamento" }); addedLabels.push("Departamento"); }
  }
  if (patient.provincia) {
    const provField = findField(/direcci[oó]n/i, /provincia/i);
    if (provField) { state.pending.set(provField.id, { valor: patient.provincia, label: "Provincia" }); addedLabels.push("Provincia"); }
  }
  if (patient.distrito) {
    const distField = findField(/direcci[oó]n/i, /distrito/i);
    if (distField) { state.pending.set(distField.id, { valor: patient.distrito, label: "Distrito" }); addedLabels.push("Distrito"); }
  }

  // Otros datos: Cómo se enteró, Estado Civil, Ocupación, Escolaridad, Agenda varias citas
  if (patient.comoSeEntero) {
    const recomField = findField(/otros/i, /como.*entero|recomendad/i) || findField(null, /como.*entero|recomendad/i);
    if (recomField && !state.lockedFields.has(recomField.id)) {
      state.pending.set(recomField.id, { valor: patient.comoSeEntero, label: "Cómo se enteró" });
      addedLabels.push("Cómo se enteró");
    }
  }
  if (patient.estadoCivil) {
    const civilField = findField(/otros/i, /estado.*civil|civil/i) || findField(null, /estado.*civil|civil/i);
    if (civilField && !state.lockedFields.has(civilField.id)) {
      state.pending.set(civilField.id, { valor: patient.estadoCivil, label: "Estado Civil" });
      addedLabels.push("Estado Civil");
    }
  }
  if (patient.ocupacion) {
    const ocupField = findField(/otros/i, /ocupaci|profesi/i) || findField(null, /ocupaci|profesi/i);
    if (ocupField && !state.lockedFields.has(ocupField.id)) {
      state.pending.set(ocupField.id, { valor: patient.ocupacion, label: "Ocupación" });
      addedLabels.push("Ocupación");
    }
  }
  if (patient.escolaridad) {
    const escField = findField(/otros/i, /escolar|estudio/i) || findField(null, /escolar|estudio/i);
    if (escField && !state.lockedFields.has(escField.id)) {
      state.pending.set(escField.id, { valor: patient.escolaridad, label: "Escolaridad" });
      addedLabels.push("Escolaridad");
    }
  }
  if (patient.agendaVariasCitas) {
    const citasField = findField(/otros/i, /agenda.*cita|varias.*cita/i) || findField(null, /agenda.*cita|varias.*cita/i);
    if (citasField && !state.lockedFields.has(citasField.id)) {
      state.pending.set(citasField.id, { valor: patient.agendaVariasCitas, label: "Agenda varias citas" });
      addedLabels.push("Agenda varias citas");
    }
  }

  return addedLabels;
}

/* ---------- EXTRACTORES ROBUSTOS DE DATOS CLÍNICOS ---------- */

// 1. Extraer Fecha de Nacimiento (Soporta "22 02 2006", "22 del 02 2006", "22 de febrero de 2006", etc.)
function extractFechaNacimiento(text) {
  // Debe haber contexto explícito de fecha o nacimiento
  const isDateContext = /(?:fecha|nacimiento|nacido|fec)/i.test(text);
  if (!isDateContext) return null;

  // Formato verbal: "22 de febrero de 2006", "22 de febrero del 2006"
  const meses = {
    enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
    julio: "07", agosto: "08", setiembre: "09", septiembre: "09", octubre: "10",
    noviembre: "11", diciembre: "12",
  };
  const mWord = text.match(/(?:fecha\s*(?:de)?\s*nacimiento|nacimiento|nacido\s*el)?\s*(\b\d{1,2}\b)\s+(?:de\s+)?([a-z]+)\s+(?:del?\s+)?(\b\d{4}\b)/i);
  if (mWord) {
    const d = parseInt(mWord[1], 10);
    const mesNom = mWord[2].toLowerCase();
    const y = parseInt(mWord[3], 10);
    const moStr = meses[mesNom];
    if (moStr && d >= 1 && d <= 31 && y >= 1900 && y <= 2030) {
      return {
        val: `${String(d).padStart(2, "0")}/${moStr}/${y}`,
        raw: mWord[0],
      };
    }
  }

  // Formato numérico con separadores: "22 02 2006", "22 del 02 2006", "22/02/2006", "22-02-2006", "22 del 02 del 2006"
  const mNum = text.match(/(?:fecha\s*(?:de)?\s*nacimiento|nacimiento|nacido\s*el)?\s*(\b\d{1,2}\b)(?:\s*(?:del?|\/|-|\s)\s*)(\b\d{1,2}\b)(?:\s*(?:del?|\/|-|\s)\s*)(\b\d{4}\b)/i);
  if (mNum) {
    const d = parseInt(mNum[1], 10);
    const mo = parseInt(mNum[2], 10);
    const y = parseInt(mNum[3], 10);
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 1900 && y <= 2030) {
      return {
        val: `${String(d).padStart(2, "0")}/${String(mo).padStart(2, "0")}/${y}`,
        raw: mNum[0],
      };
    }
  }

  return null;
}

// 2. Extraer Tipo de Identificación (DNI, CARNET EXTRANJERIA, PASAPORTE, RUC)
function extractTipoIdentificacion(text) {
  const normT = (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // 1. Carnet de Extranjería
  if (/\b(?:carnet|carne)\s*(?:de\s*)?extranjer[ií]a\b/i.test(normT) || /\bextranjer[ií]a\b/i.test(normT)) {
    return { val: "CARNET EXTRANJERIA", label: "Carnet de Extranjería" };
  }

  // 2. Pasaporte
  if (/\bpasaporte\b/i.test(normT)) {
    return { val: "PASAPORTE", label: "Pasaporte" };
  }

  // 3. RUC
  if (/\bruc\b/i.test(normT)) {
    return { val: "RUC", label: "RUC" };
  }

  // 4. DNI
  if (/(?:tipo\s*(?:de\s*)?(?:identificacion|documento)|dito\s*de|cambia[ra]?\s*(?:a|el)?\s*tipo)?\s*(?:es\s*)?dni\b/i.test(normT) ||
      /\b(?:dito\s*de\s*dni|tipo\s*dni)\b/i.test(normT) ||
      /\bdni\b/i.test(normT)) {
    return { val: "DNI", label: "DNI" };
  }

  return null;
}

// 2b. Extraer DNI (8 dígitos con o sin espacios: "72 73 62 89" -> "72736289")
function extractDni(text) {
  // Si el texto habla de fecha, celular o teléfono, NUNCA es DNI
  if (/(?:fecha|nacimiento|nacido|fec)/i.test(text)) return null;
  if (/(?:celular|movil|whatsapp|telefono|fijo|casa|oficina)/i.test(text)) return null;

  // A. Si dice "dni" o "documento"
  const m = text.match(/(?:dni|documento|cedula|identificaci[oó]n)\s*[:=]?\s*([0-9\s]{8,24})/i);
  if (m) {
    const digits = m[1].replace(/\D/g, "");
    if (digits.length === 8) return digits;
  }

  // B. Si el texto contiene la palabra DNI en cualquier parte y hay 8 dígitos
  if (/(?:^|\s)(?:dni|documento)\b/i.test(text)) {
    const digits = text.replace(/\D/g, "");
    if (digits.length === 8) return digits;
  }

  // C. Si son exactamente 8 dígitos puros aislados en el texto
  const allDigits = text.replace(/\D/g, "");
  if (allDigits.length === 8 && !/(?:nombre|apellido|calle|numero)/i.test(text)) {
    return allDigits;
  }

  return null;
}

// 2c. Extraer número de documento general (para Pasaporte, Carnet Extranjería, etc.)
function extractDocNum(text) {
  if (/(?:fecha|nacimiento|celular|telefono|casa|oficina)/i.test(text)) return null;
  const m = text.match(/(?:documento|n[uú]mero\s*(?:de\s*)?documento|num\s*doc)\s*[:=]?\s*([a-z0-9\s]{6,15})/i);
  if (m) {
    const val = m[1].replace(/\s+/g, "").toUpperCase();
    if (val.length >= 6 && val.length <= 15) return val;
  }
  return null;
}

// Lista exhaustiva de palabras del español que JAMÁS pueden ser nombres ni apellidos (conectores, pronombres, verbos, charlas)
const INVALID_NAME_WORDS = new Set([
  // Conjunciones y conectores
  "y", "e", "o", "u", "ni", "que", "pero", "mas", "sino", "aunque", "porque", "pues", "como", "cuando", "donde", "mientras",
  // Preposiciones
  "a", "ante", "bajo", "cabe", "con", "contra", "de", "del", "desde", "durante", "en", "entre", "hacia", "hasta", "mediante", "para", "por", "segun", "según", "sin", "so", "sobre", "tras", "versus", "via", "vía",
  // Pronombres y determinantes
  "yo", "tu", "tú", "el", "él", "ella", "ello", "nosotros", "nosotras", "vosotros", "ellos", "ellas", "usted", "ustedes",
  "me", "te", "se", "nos", "os", "le", "les", "lo", "la", "los", "las", "mi", "mis", "mío", "mia", "mía", "tuyo", "tuya", "suyo", "suya",
  "este", "esta", "esto", "estos", "estas", "ese", "esa", "eso", "esos", "esas", "aquel", "aquella", "aquello",
  "quien", "quién", "quienes", "quiénes", "cual", "cuál", "cuales", "cuáles", "cuyo", "cuya", "que", "qué",
  // Verbos auxiliares y comunes
  "es", "son", "era", "eran", "fue", "fueron", "sea", "sean", "sido", "ser", "soy", "eres", "somos", "erais",
  "esta", "está", "estan", "están", "estaba", "estaban", "estuvo", "estuvieron", "estar", "estoy", "estas", "estás",
  "hay", "haber", "habia", "había", "habian", "habían", "hubo", "haya", "he", "has", "ha", "hemos", "han",
  "tiene", "tienen", "tenia", "tenía", "tenian", "tenían", "tuvo", "tuvieron", "tener", "tengo",
  "dice", "dicen", "dijo", "dijeron", "dijiste", "decia", "decía", "decir", "digo", "dices",
  "hace", "hacen", "hizo", "hicieron", "hacia", "hacía", "hacer", "hago",
  "va", "van", "iba", "iban", "ira", "irá", "iran", "irán", "ir", "voy", "vas", "vamos",
  "ve", "veo", "ves", "vemos", "ven", "vio", "vieron", "veia", "veía", "ver", "mira", "mire", "miren", "mirar",
  "creo", "crees", "cree", "creen", "crei", "creí", "creer",
  "viene", "vienen", "vino", "vinieron", "venir", "vengo",
  "pone", "ponen", "puso", "pusieron", "poner", "pon",
  "toma", "toman", "tomo", "tomó", "tomar",
  "deja", "dejan", "dejo", "dejó", "dejar",
  "queda", "quedan", "quedo", "quedó", "quedar",
  "sabe", "saben", "sabia", "sabía", "supo", "saber",
  "puede", "pueden", "podia", "podía", "pudo", "poder",
  "quiere", "quieren", "queria", "quería", "quiso", "querer",
  // Adverbios, muletillas y ruidos comunes (ej: "o sea sí y tú", "para el fin de máquinas")
  "si", "sí", "no", "ya", "osea", "bien", "mal", "bueno", "claro", "hola", "chau", "adios", "adiós",
  "tambien", "también", "tampoco", "nada", "todo", "algo", "poco", "mucho", "tanto", "demasiado",
  "siempre", "nunca", "jamas", "jamás", "aqui", "aquí", "aca", "acá", "ahi", "ahí", "alli", "allí", "alla", "allá",
  "cerca", "lejos", "arriba", "abajo", "delante", "detras", "detrás", "dentro", "fuera",
  "antes", "despues", "después", "luego", "ahora", "hoy", "ayer", "manana", "mañana", "pronto", "tarde",
  "tipo", "cosa", "cosas", "caso", "forma", "modo", "manera", "parte", "vez", "veces", "fin", "maquina", "maquinas",
  // Vocabulario de consultorio, oficina y controles de interfaz
  "clinica", "clínica", "creu", "upch", "cayetano", "smile", "consultorio", "diente", "dientes", "muela", "muelas",
  "caries", "equipo", "sistema", "plataforma", "tarjeta", "pago", "pagos", "credito", "crédito", "creditos", "créditos",
  "cobranza", "cobranzas", "perito", "peritos", "recepcion", "recepción", "triaje",
  "doctor", "doctora", "asistente", "paciente", "secretaria", "senor", "señor", "senora", "señora",
  "pantalla", "ventana", "boton", "botón", "pestana", "pestaña", "menu", "menú", "modulo", "módulo",
  "registro", "preregistro", "servicio", "agenda", "cita", "citas", "reporte", "fallas",
  "confirmar", "confirmado", "descartar", "cancelar", "borrar", "limpiar", "guardar", "aplicar", "abrir", "navegar",
  "nombre", "nombres", "apellido", "apellidos", "paterno", "materno", "dni", "documento", "celular", "telefono", "teléfono",
  "correo", "email", "arroba", "punto", "calle", "direccion", "dirección", "distrito", "provincia", "departamento",
  "fecha", "nacimiento", "genero", "género", "sexo", "masculino", "femenino"
]);

const CHATTER_WORDS = /\b(equipo|sistema|aplicacion|configuracion|extension|creditos|cobranzas?|clinica|creu|pantalla|pestana|pestaña|campus|completados?|foto|imagen|perito|tarjeta|pago|plataforma|smile|audio|microfono|ruido|exterior|interior|dieron|dice|dice\s+que|estan?|viendo|enseñar|tres|ambos|rondando|quedo|quedan|hablando)\b/i;

// Filtra palabras válidas para nombres propios de personas (descarta ruidos, muletillas y charlas como "o sea sí y tú")
function filterValidNameWords(rawText, maxWords = 3) {
  if (!rawText) return [];
  const cut = rawText.split(/\s+(?:y\s+luego|luego|despu[eé]s|y\s+despu[eé]s|que|para|con|rectifica|edita|cambia|corrige|confirmar|aplicar|descartar|cancelar|baja|sube)\b/i)[0].trim();
  const words = cut.split(/\s+/).filter(Boolean);
  const valid = [];

  for (const w of words) {
    const cleanW = w.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
    if (cleanW.length >= 2 && !INVALID_NAME_WORDS.has(cleanW) && !/\d/.test(w)) {
      let cap = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      // Reparación de truncamiento común por fonética o preposición (ej: "Lexander" o "Alexande" -> "Alexander")
      if (/^(?:alexande|lexander|lexande)$/i.test(cap)) cap = "Alexander";
      if (/^(?:lejandro|leandro)$/i.test(cap) && /^alej/i.test(w)) cap = "Alejandro";
      valid.push(cap);
    }
  }

  return valid.slice(0, maxWords);
}

// Reconcilia el nombre dictado con la grafía oficial de la Base de Datos
// Preserva la grafía de la BD cuando coincide fonéticamente (ej: "Johan" -> "Yojan"),
// y permite rectificar libremente si el usuario dicta un nombre completamente distinto (ej: "Juan", "Alexander").
function reconcileNameWithDb(dictWords, dbName) {
  if (!dictWords || dictWords.length === 0) return "";
  if (!dbName) {
    return dictWords.join(" ");
  }

  const dbWords = dbName.trim().split(/\s+/).filter(Boolean);

  // Normalización fonética profunda en español:
  // Hace que "Johan", "Yojan", "Yohan" coincidan fonéticamente para respetar la grafía de la BD
  const phon = (w) => (w || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/y/g, "j")
    .replace(/h/g, "j")
    .replace(/ll/g, "j")
    .replace(/v/g, "b")
    .replace(/c(?=[ie])/g, "s")
    .replace(/z/g, "s")
    .replace(/k/g, "c")
    .replace(/w/g, "u")
    .replace(/x/g, "j")
    .replace(/j+/g, "j");

  const resultWords = [];

  for (let i = 0; i < dictWords.length; i++) {
    const dw = dictWords[i];
    const dwPhon = phon(dw);

    // Buscar si coincide fonéticamente con alguna palabra del nombre oficial de la BD
    const matchingDbWord = dbWords.find((dbw) => {
      const dbPhon = phon(dbw);
      return dbPhon === dwPhon ||
             dw.toLowerCase() === dbw.toLowerCase() ||
             (dwPhon.length >= 4 && (dbPhon.includes(dwPhon) || dwPhon.includes(dbPhon)));
    });

    if (matchingDbWord) {
      // Usar la grafía exacta oficial de la Base de Datos (ej: "Yojan" con Y)
      resultWords.push(matchingDbWord.charAt(0).toUpperCase() + matchingDbWord.slice(1).toLowerCase());
    } else {
      // Nombre nuevo, rectificado o adicional (ej: "Juan", "Alexander")
      resultWords.push(dw);
    }
  }

  return resultWords.slice(0, 3).join(" ");
}

// 3. Extraer Nombres (Protegido contra preposiciones "a", charlas de fondo, reconciliado con BD)
function extractName(text) {
  if (CHATTER_WORDS.test(text)) return null;

  const m = text.match(/(?:^|\s)(?:(?:el\s+)?paciente\s*(?:es|se\s+llama)|nombres?(?:\s*(?:del\s+paciente))?)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*([a-záéíóúñ\s]+)/i);
  if (m) {
    let name = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    name = name.replace(/\b(?:registrado|di\s*confirmar|confirmar|listo|por\s*favor)\b/gi, "").trim();
    const validWords = filterValidNameWords(name, 3);
    if (validWords.length > 0) {
      const dbName = state.currentPatient?.nombres || "";
      return reconcileNameWithDb(validWords, dbName);
    }
  }
  return null;
}

// 4. Extraer Primer Apellido (Libre de preposición "a", números y charla, máximo 2 palabras)
function extractPrimerApellido(text) {
  if (CHATTER_WORDS.test(text)) return null;
  const m = text.match(/(?:primer\s+apellido|apellido\s+paterno|paterno)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*([a-záéíóúñ\s]+)/i);
  if (m) {
    let val = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    val = val.replace(/\b(?:registrado|di\s*confirmar|confirmar|listo)\b/gi, "").trim();
    const validWords = filterValidNameWords(val, 2);
    if (validWords.length > 0) {
      const dbApe = state.currentPatient?.apellidoPaterno || "";
      return reconcileNameWithDb(validWords, dbApe);
    }
  }
  return null;
}

// 5. Extraer Segundo Apellido (Libre de preposición "a", números y charla, máximo 2 palabras)
function extractSegundoApellido(text) {
  if (CHATTER_WORDS.test(text)) return null;
  const m = text.match(/(?:segundo\s+apellido|apellido\s+materno|materno)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*([a-záéíóúñ\s]+)/i);
  if (m) {
    let val = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    val = val.replace(/\b(?:registrado|di\s*confirmar|confirmar|listo)\b/gi, "").trim();
    const validWords = filterValidNameWords(val, 2);
    if (validWords.length > 0) {
      const dbApe = state.currentPatient?.apellidoMaterno || "";
      return reconcileNameWithDb(validWords, dbApe);
    }
  }
  return null;
}

// 6. Extraer Celular (Estricto: No captura si menciona casa u oficina)
function extractCelular(text) {
  if (/(?:casa|fijo|oficina|trabajo)/i.test(text)) return null;

  // A. Si dice celular / móvil / whatsapp explícito
  const m = text.match(/(?:celular|m[oó]vil|whatsapp)\s*[:=]?\s*([9][0-9\s]{8,15})/i);
  if (m) {
    const digits = m[1].replace(/\D/g, "");
    if (digits.length === 9) return digits;
  }

  // B. Si es un número peruano de 9 dígitos que empieza con 9
  const allDigits = text.replace(/\D/g, "");
  if (allDigits.length === 9 && allDigits.startsWith("9")) {
    if (!/(?:dni|documento|fecha|nacimiento|paterno|materno|nombre|calle)/i.test(text)) {
      return allDigits;
    }
  }

  return null;
}

// 7. Extraer Teléfono Casa (Estricto: Requiere casa o fijo)
function extractTelCasa(text) {
  const isCasa = /(?:tel[eé]fono\s*(?:de\s*)?casa|tel\s*casa|\bcasa\b|tel[eé]fono\s*fijo|\bfijo\b)/i.test(text);
  if (!isCasa) return null;
  if (/(?:oficina|trabajo)/i.test(text)) return null;

  const m = text.match(/(?:tel[eé]fono\s*(?:de\s*)?casa|tel\s*casa|\bcasa\b|tel[eé]fono\s*fijo|\bfijo\b)\s*[:=]?\s*([0-9\s]{6,14})/i);
  if (m) {
    const digits = m[1].replace(/\D/g, "");
    if (digits.length >= 6 && digits.length <= 11) return digits;
  }
  return null;
}

// 7b. Extraer Teléfono Oficina (Estricto: Requiere oficina o trabajo)
function extractTelOficina(text) {
  const isOfi = /(?:tel[eé]fono\s*(?:de\s*)?oficina|tel\s*oficina|\boficina\b|\btrabajo\b)/i.test(text);
  if (!isOfi) return null;

  const m = text.match(/(?:tel[eé]fono\s*(?:de\s*)?oficina|tel\s*oficina|\boficina\b|\btrabajo\b)\s*[:=]?\s*([0-9\s]{6,14})/i);
  if (m) {
    const digits = m[1].replace(/\D/g, "");
    if (digits.length >= 6 && digits.length <= 11) return digits;
  }
  return null;
}

// 8. Extraer Email con normalización fonética y de dominios ultra-robusta
function extractEmail(text) {
  if (!text) return null;

  // Si el doctor dice "correo institucional", "correo upch" o "correo cayetano":
  if (/(?:correo|email)\s*(?:institucional|upch|cayetano|universitario)/i.test(text) && state.currentPatient) {
    const pNom = (state.currentPatient.nombres || "").split(/\s+/)[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const pApe = (state.currentPatient.apellidoPaterno || "").split(/\s+/)[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (pNom && pApe) {
      return `${pNom}.${pApe}@upch.pe`;
    }
  }

  // 1. Verificar si hay mención explícita o implícita de correo
  const hasEmailKeyword = /(?:email|correo(?:\s*electr[oó]nico)?|mail|arroba|@|gmail|hotmail|yahoo|outlook|cayetano|upch|ph\b)/i.test(text);
  if (!hasEmailKeyword) return null;

  // 2. Extraer solo la porción del correo, cortando antes de otros campos dictados
  let raw = text;
  const trigger = text.match(/(?:email|correo(?:\s*electr[oó]nico)?|mail)\s*(?:es|:|del paciente|en)?\s*(.+)/i);
  if (trigger) {
    raw = trigger[1];
  }

  // Cortar si el dictado continúa con otro campo clínico (para que no se pegue al correo)
  raw = raw.split(/\s+(?:celular|tel[eé]fono|tel\b|casa|oficina|dni|documento|fecha|nacimiento|g[eé]nero|sexo|nombre|apellido|calle|direcci[oó]n|confirmar|aplicar|descartar)\b/i)[0];

  raw = raw.replace(/\b(?:por favor|registrado|confirmar|listo|gracias)\b/gi, "").trim();
  if (!raw) return null;

  // 3. Quitar tildes
  let clean = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 4. Normalizar "arroba", "aroba", "at" -> @
  clean = clean.replace(/\s*(?:arroba|arrova|aroba|@|\bat\b)\s*/gi, "@");

  // Si no tiene @, pero menciona proveedores conocidos (ej: "juan perez en gmail", "juan perez hotmail")
  if (!clean.includes("@")) {
    clean = clean.replace(/\b(?:en\s+)?(gmail|hotmail|outlook|yahoo)\b/gi, "@$1.com");
  }

  // Normalizar variaciones orales peruanas para UPCH y Cayetano
  clean = clean
    .replace(/@\s*(?:u\s*p\s*c\s*h|upch|upchh|ph|u\s*p\s*c)\s*(?:\.|\s*(?:punto|dot)\s*)?p(?:e)?\b/gi, "@upch.pe")
    .replace(/@\s*cayetano(?:\.|\s*(?:punto|dot)\s*)?(?:edu)?(?:\.|\s*(?:punto|dot)\s*)?p(?:e)?\b/gi, "@cayetano.edu.pe");

  // Normalizar frases verbales de dominios
  clean = clean
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?edu(?:\.|\s*(?:punto|dot)\s*)?p(?:e)?\b/gi, ".edu.pe")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?com(?:\.|\s*(?:punto|dot)\s*)?p(?:e)?\b/gi, ".com.pe")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?gob(?:\.|\s*(?:punto|dot)\s*)?p(?:e)?\b/gi, ".gob.pe")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?org(?:\.|\s*(?:punto|dot)\s*)?p(?:e)?\b/gi, ".org.pe")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?edu\b/gi, ".edu")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?com\b/gi, ".com")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?net\b/gi, ".net")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?org\b/gi, ".org")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?gob\b/gi, ".gob")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?es\b/gi, ".es")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?pe\b/gi, ".pe")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?p\b/gi, ".pe");

  clean = clean
    .replace(/\s*(?:gui[oó]n\s*bajo|subgui[oó]n|sub\s*gui[oó]n|raya\s*al\s*piso)\s*/gi, "_")
    .replace(/\s*(?:gui[oó]n|raya|menos)\s*/gi, "-")
    .replace(/\s*(?:punto|dot)\s*/gi, ".");

  clean = clean.replace(/\s+/g, "").toLowerCase();
  clean = clean.replace(/[.,;:]+$/, "");
  clean = clean.replace(/\.p$/, ".pe");

  // 7. CORRECCIÓN FONÉTICA CON RESPECTO AL NOMBRE REGISTRADO DEL PACIENTE
  if (state.currentPatient && clean.includes("@")) {
    const [local, domain] = clean.split("@");
    let correctedLocal = local;

    const pNom = (state.currentPatient.nombres || "").split(/\s+/)[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const pApe = (state.currentPatient.apellidoPaterno || "").split(/\s+/)[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Normalizar fonéticamente el nombre en el correo al nombre actual del paciente
    if (pNom && pNom.length >= 3) {
      if (pNom === "yojan" || pNom === "johan") {
        correctedLocal = correctedLocal.replace(/\b(?:johan|joan|yohan|yojhan|llogan|iojan|yojan)\b/gi, pNom);
      } else if (pNom === "michael" || pNom === "michel" || pNom === "maicol") {
        correctedLocal = correctedLocal.replace(/\b(?:michael|michel|maicol|michele|mike)\b/gi, pNom);
      } else {
        const nomJ = pNom.replace(/y/g, "j");
        const nomY = pNom.replace(/j/g, "y");
        if (nomJ !== pNom) correctedLocal = correctedLocal.replace(new RegExp(nomJ, "gi"), pNom);
        if (nomY !== pNom) correctedLocal = correctedLocal.replace(new RegExp(nomY, "gi"), pNom);
      }
    }

    // Normalizar fonéticamente el apellido en el correo al apellido actual del paciente
    if (pApe && pApe.length >= 3) {
      if (pApe === "manosalva" || pApe === "manosalba") {
        correctedLocal = correctedLocal.replace(/\b(?:manosalba|manusalva|manosalba|manos-alva|manos_alva|manosalva)\b/gi, pApe);
      } else {
        const apeB = pApe.replace(/v/g, "b");
        const apeV = pApe.replace(/b/g, "v");
        if (apeB !== pApe) correctedLocal = correctedLocal.replace(new RegExp(apeB, "gi"), pApe);
        if (apeV !== pApe) correctedLocal = correctedLocal.replace(new RegExp(apeV, "gi"), pApe);
      }
    }

    clean = correctedLocal + "@" + domain;
  }

  // Si después del @ no hay ningún punto
  if (clean.includes("@")) {
    const parts = clean.split("@");
    if (!parts[1].includes(".")) {
      if (/upch|cayetano/i.test(parts[1])) {
        clean = parts[0] + "@" + (parts[1].includes("upch") ? "upch.pe" : "cayetano.edu.pe");
      } else {
        clean = parts[0] + "@" + parts[1] + ".com";
      }
    }
  }

  // Extraer el email con regex estándar y terminar en dominios válidos
  const match = clean.match(/([a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:edu\.pe|com\.pe|gob\.pe|org\.pe|edu|com|pe|org|net|gob|io|es|co|mx|ar|cl))/i)
    || clean.match(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);

  return match ? match[1] : null;
}

// 9. Extraer Género
function extractGenero(text) {
  if (/(?:g[eé]nero|sexo)?\s*(?:es|:)?\s*\b(masculino|hombre|var[oó]n)\b/i.test(text)) return "MASCULINO";
  if (/(?:g[eé]nero|sexo)?\s*(?:es|:)?\s*\b(femenino|mujer)\b/i.test(text)) return "FEMENINO";
  return null;
}

// 10. Extraer Calle / Dirección (Dirección general del paciente)
function extractCalle(text) {
  if (!text) return null;
  if (/\b(?:de\s+factura|en\s+factura|para\s+factura)\b/i.test(text)) return null;

  // GUARDIA ESTRICTA: Si es número exterior, vivienda o casa, NUNCA es calle
  if (/(?:n[uú]mero\s+(?:exterior|de\s+vivienda|de\s+casa|de\s+direcci[oó]n|vivienda|casa)|no\.?\s*exterior|num\.?\s*ext|vivienda|sin\s+n[uú]mero|sin\s+numero|\bsn\b)/i.test(text)) {
    return null;
  }

  const m = text.match(/(?:calle|direcci[oó]n|avenida|av\.?|jir[oó]n|jr\.?|pasaje|pje\.?)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*(.+)/i);
  if (m) {
    let val = m[0].trim();
    val = val.replace(/^(?:calle|direcci[oó]n)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*/i, "").trim();
    val = val.split(/\s+(?:n[uú]mero\s+exterior|no\.?\s*exterior|n[uú]mero\s+de\s+vivienda|n[uú]mero\s+de\s+casa|vivienda|referencia|distrito|provincia|departamento|confirmar|aplicar|descartar)\b/i)[0].trim();
    if (val && val.length > 3) return val;
  }
  return null;
}

// 11. Extraer Número Exterior / Número de vivienda / casa (Soporta "sin número", "SN", "S/N" o dígitos)
function extractNumeroExterior(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Si el texto habla explícitamente de DNI o celular o fecha sin mencionar exterior/vivienda/casa, ignorar
  if (/(?:fecha|nacimiento|celular|telefono|dni|documento)/i.test(normT) && 
      !/(?:exterior|vivienda|casa|predio|inmueble|sin\s+numero)/i.test(normT)) {
    return null;
  }

  // A. Coincidencia con "sin número", "SN" o "S/N"
  if (/(?:(?:n[uú]mero\s+(?:exterior(?:\s+de\s+vivienda)?|de\s+vivienda|de\s+casa|de\s+direcci[oó]n|vivienda|casa)|no\.?\s*exterior|num\.?\s*ext|vivienda)\s*)?(?:sin\s+n[uú]mero|sin\s+numero|s\s*\/\s*n|\bsn\b)/i.test(normT)) {
    return "S/N";
  }

  // B. Coincidencia con frase de número exterior / vivienda / casa
  const PAT = /(?:n[uú]mero\s+(?:exterior(?:\s+de\s+vivienda)?|de\s+vivienda|de\s+casa|de\s+direcci[oó]n|vivienda|casa)|no\.?\s*exterior|num\.?\s*ext|vivienda)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*([a-z0-9\s\/-]+)/i;
  const m = text.match(PAT);
  if (m) {
    let val = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    val = val.replace(/^(?:vivienda|casa|predio|exterior)\s+/i, "").trim();
    val = val.split(/\s+(?:calle|direcci[oó]n|referencia|distrito|confirmar|aplicar|descartar)\b/i)[0].trim();
    if (/^(?:sin\s+n[uú]mero|sin\s+numero|s\s*\/\s*n|sn)$/i.test(val)) return "S/N";
    if (val) return val.toUpperCase();
  }

  return null;
}

// 12. Extraer Referencia
function extractReferencia(text) {
  if (!text) return null;
  const m = text.match(/(?:como\s+referencia|referencia|de\s+referencia)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*(.+)/i);
  if (m) {
    let val = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    val = val.split(/\s+(?:calle|n[uú]mero|distrito|confirmar|aplicar|descartar)\b/i)[0].trim();
    if (val && val.length > 2) return val;
  }
  return null;
}

// 13. Extraer Requerimiento de Factura ("Si" / "No")
function extractFactura(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  if (/\bsin\s+factura\b/i.test(normT) || /\bno\s+(?:va\s+a\s+requerir\s+)?factura\b/i.test(normT)) {
    return "No";
  }
  if (/(?:factura|requerir\s+factura)\s*(?:a|es)?\s*no\b/i.test(normT)) {
    return "No";
  }
  if (/(?:con\s+factura|(?:va\s+a\s+)?requerir\s+factura|factura)\s*(?:a|es)?\s*s[ií]\b/i.test(normT) ||
      /\bs[ií]\s+(?:va\s+a\s+requerir\s+)?factura\b/i.test(normT)) {
    return "Si";
  }
  return null;
}

// 14. Extraer "Los datos son iguales a la dirección" ("Si" / "No")
function extractDatosIgualesDireccion(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const isAboutDatosIguales = /(?:datos\s+(?:si\s+)?son\s+iguales|mismos\s+datos\s+(?:que\s+|de\s+)?(?:la\s+)?direcci[oó]n|datos\s+iguales(?:\s+a\s+la\s+direcci[oó]n)?|iguales\s+a\s+la\s+direcci[oó]n)/i.test(normT);
  if (!isAboutDatosIguales) return null;

  if (/\bno\b/i.test(normT) && !/\bs[ií]\b/i.test(normT)) {
    return "No";
  }
  return "Si";
}

// 15. Extraer Cómo se enteró (Dropdown RECOMENDADOR)
function extractComoSeEntero(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const isMatch = /(?:se\s+enter[oó]\s*(?:mediante|por|en|a\s+trav[eé]s\s+de)?|supo\s*(?:mediante|por|en)?|c[oó]mo\s+se\s+enter[oó]|medio\s+(?:de\s+publicidad|recomendador)|recomendador)/i.test(normT);
  if (!isMatch) return null;

  if (/\bfacebook\b/i.test(normT)) return "FACEBOOK";
  if (/\binstagram\b/i.test(normT)) return "INSTAGRAM";
  if (/\btiktok\b/i.test(normT)) return "TIKTOK";
  if (/\brecomendaci[oó]n|recomendado|amigo|familiar\b/i.test(normT)) return "RECOMENDACION";
  if (/\bp[aá]gina\s*web|web|internet\b/i.test(normT)) return "PAGINA WEB";
  if (/\bradio\b/i.test(normT)) return "RADIO";
  if (/\btelevisi[oó]n|tele|tv\b/i.test(normT)) return "TELEVISION";

  const m = text.match(/(?:se\s+enter[oó]\s*(?:mediante|por|en|a\s+trav[eé]s\s+de)?|supo\s*(?:mediante|por|en)?|c[oó]mo\s+se\s+enter[oó])\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*(.+)/i);
  if (m) {
    let val = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    val = val.split(/\s+(?:confirmar|aplicar|estado|ocupacion|descartar)\b/i)[0].trim().toUpperCase();
    if (val) return val;
  }
  return null;
}

// 16. Extraer Estado Civil
function extractEstadoCivil(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const isMatch = /(?:el\s+paciente\s+est[aá]|estado\s+civil|est[aá]\s+(?:soltero|casado|viudo|divorciado|conviviente))/i.test(normT);
  if (!isMatch) return null;

  if (/\bsolter[oa]\b/i.test(normT)) return "SOLTERO";
  if (/\bcasad[oa]\b/i.test(normT)) return "CASADO";
  if (/\bviud[oa]\b/i.test(normT)) return "VIUDO";
  if (/\bdivorciad[oa]\b/i.test(normT)) return "DIVORCIADO";
  if (/\bconviviente\b/i.test(normT)) return "CONVIVIENTE";
  return null;
}

// 17. Extraer Ocupación / Profesión
function extractOcupacion(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const isMatch = /(?:ocupaci[oó]n|profesi[oó]n|trabaja\s*(?:como|en)?|es\s+(?:estudiante|empleado|ingeniero|medico|abogado|comerciante|jubilado))/i.test(normT);
  if (!isMatch) return null;

  if (/\bestudiante\b/i.test(normT)) return "ESTUDIANTE";
  if (/\bemplead[oa]\b/i.test(normT)) return "EMPLEADO";
  if (/\bindependiente\b/i.test(normT)) return "INDEPENDIENTE";
  if (/\bjubilad[oa]\b/i.test(normT)) return "JUBILADO";
  if (/\bama\s+de\s+casa\b/i.test(normT)) return "AMA DE CASA";
  if (/\bcomerciante\b/i.test(normT)) return "COMERCIANTE";
  if (/\bprofesional\b/i.test(normT)) return "PROFESIONAL";

  const m = text.match(/(?:ocupaci[oó]n|profesi[oó]n|trabaja\s*(?:como|en)?)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*(.+)/i);
  if (m) {
    let val = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    val = val.split(/\s+(?:confirmar|aplicar|escolaridad|descartar)\b/i)[0].trim().toUpperCase();
    if (val) return val;
  }
  return null;
}

// 18. Extraer Escolaridad / Estudios
function extractEscolaridad(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const isMatch = /(?:escolaridad|estudios|grado\s+(?:de\s+)?instrucci[oó]n|nivel\s+(?:de\s+)?estudios)/i.test(normT);
  if (!isMatch) return null;

  if (/\bsuperior\s+universitaria|universitaria|universidad\b/i.test(normT)) return "SUPERIOR UNIVERSITARIA";
  if (/\bsuperior\s+no\s+universitaria\b/i.test(normT)) return "SUPERIOR NO UNIVERSITARIA";
  if (/\bt[eé]cnic[oa]\b/i.test(normT)) return "TECNICO";
  if (/\bsecundaria\b/i.test(normT)) return "SECUNDARIA COMPLETA";
  if (/\bprimaria\b/i.test(normT)) return "PRIMARIA COMPLETA";

  const m = text.match(/(?:escolaridad|estudios|grado\s+(?:de\s+)?instrucci[oó]n)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*(.+)/i);
  if (m) {
    let val = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    val = val.split(/\s+(?:confirmar|aplicar|descartar)\b/i)[0].trim().toUpperCase();
    if (val) return val;
  }
  return null;
}

// 19. Extraer Agenda varias citas ("Si" / "No")
function extractAgendaVariasCitas(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const isMatch = /(?:agenda(?:r)?\s+varias\s+citas|varias\s+citas)/i.test(normT);
  if (!isMatch) return null;

  if (/\bno\b/i.test(normT) && !/\bs[ií]\b/i.test(normT)) {
    return "No";
  }
  return "Si";
}

// 20. Extraer Observaciones
function extractObservaciones(text) {
  if (!text) return null;
  const m = text.match(/(?:observaciones|observaci[oó]n|nota\s*cl[ií]nica|nota)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*(.+)/i);
  if (m) {
    let val = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    val = val.split(/\s+(?:confirmar|aplicar|descartar)\b/i)[0].trim();
    if (val && val.length > 2) return val;
  }
  return null;
}

// 21. Extraer Código de Paciente (Pantalla de búsqueda / Preregistro)
function extractCodigo(text) {
  if (!text) return null;
  const m = text.match(/(?:c[oó]digo(?:\s*(?:del\s+paciente))?)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*([a-z0-9-]+)/i);
  if (m) {
    let val = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    if (val && !/^(?:del|paciente|es)$/i.test(val)) return val;
  }
  return null;
}

// 22. Extraer "Mostrar pacientes registrados" (Checkbox de Preregistro)
function extractMostrarPacientesRegistrados(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const isMatch = /(?:mostrar\s+pacientes\s+registrados|pacientes\s+registrados)/i.test(normT);
  if (!isMatch) return null;

  if (/\b(?:no|desmarcar|desactivar|quitar)\b/i.test(normT) && !/\b(?:si|marcar|activar)\b/i.test(normT)) {
    return "false";
  }
  return "true";
}

// 23. Detecta si la pantalla activa es la búsqueda de Preregistro (sin campos de apellidos ni nacimiento)
function isSearchScreen() {
  const hasFormFields = state.fields.some((f) => {
    const et = (f.etiqueta || "").toLowerCase();
    const nm = (f.name || "").toLowerCase();
    return /primer\s+apellido|segundo\s+apellido|nacimiento|celular|calle/i.test(et) ||
           /paterno|materno|fec.*nac/i.test(nm);
  });
  return !hasFormFields;
}

/* ---------- Búsqueda semántica de campos en Smile ---------- */
function findField(secPattern, etPattern) {
  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[*:]+/g, "").trim();
  
  const isCalleSearch = etPattern && /calle/i.test(etPattern.source) && !/ext|exterior/i.test(etPattern.source);

  if (secPattern) {
    return state.fields.find((f) => {
      const secNorm = norm(f.seccion);
      const etNorm = norm(f.etiqueta);
      const nameNorm = norm(f.name);
      const idNorm = norm(f.domId);

      // Si se busca Calle, descartar terminantemente campos de No. Exterior
      if (isCalleSearch && (/exterior|num.*ext|no.*ext|vivienda/i.test(etNorm) || /exterior|num.*ext|no.*ext|vivienda/i.test(nameNorm))) {
        return false;
      }

      return secPattern.test(secNorm) && (etPattern.test(etNorm) || etPattern.test(nameNorm) || etPattern.test(idNorm));
    });
  }

  // Si no se especificó sección, preferir campos que NO sean de factura para evitar sobreescribir datos de facturación
  const nonFactura = state.fields.find((f) => {
    const secNorm = norm(f.seccion);
    if (/factura/i.test(secNorm)) return false;
    const etNorm = norm(f.etiqueta);
    const nameNorm = norm(f.name);
    const idNorm = norm(f.domId);

    if (isCalleSearch && (/exterior|num.*ext|no.*ext|vivienda/i.test(etNorm) || /exterior|num.*ext|no.*ext|vivienda/i.test(nameNorm))) {
      return false;
    }

    return etPattern.test(etNorm) || etPattern.test(nameNorm) || etPattern.test(idNorm);
  });
  if (nonFactura) return nonFactura;

  // Si no se encontró fuera de factura, buscar en cualquier campo
  return state.fields.find((f) => {
    const etNorm = norm(f.etiqueta);
    const nameNorm = norm(f.name);
    const idNorm = norm(f.domId);

    if (isCalleSearch && (/exterior|num.*ext|no.*ext|vivienda/i.test(etNorm) || /exterior|num.*ext|no.*ext|vivienda/i.test(nameNorm))) {
      return false;
    }

    return etPattern.test(etNorm) || etPattern.test(nameNorm) || etPattern.test(idNorm);
  });
}

/* ---------- MOTOR DE INTELIGENCIA ARTIFICIAL GOOGLE GEMINI (Primario) ---------- */
async function extractWithGemini(text, s) {
  if (!s.geminiApiKey) return null;

  const campos = state.fields.map((f) => ({
    id: f.id,
    etiqueta: f.etiqueta,
    seccion: f.seccion,
    tipo: f.tipo
  }));

  const model = s.geminiModel || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${s.geminiApiKey}`;

  const systemInstruction = `Eres DentAI, el motor de Inteligencia Artificial para el software dental Smile (UPCH Cayetano / CREO).
Tu objetivo es procesar las conversaciones y dictados capturados en tiempo real en el consultorio dental.

1. FILTRO DE CHARLAS DE FONDO, RUIDO Y CONVERSACIONES CASUALES:
   En la clínica dental hay conversaciones entre secretarias, pacientes, asistentes y odontólogos sobre temas no clínicos (créditos, cobranzas, pagos, chismes, saludos personales como 'hola cómo estás', 'Yuli estaba por ahí', 'Luis volvió hoy a Creu', 'para el fin de máquinas', comentarios incidentales, etc.).
   SI EL TEXTO DICTADO ES UNA CHARLA DE FONDO, CONVERSACIÓN CASUAL O RUIDO SIN INTENCIÓN DE LLENAR EL FORMULARIO CLÍNICO, debes marcar obligatoriamente:
   "es_charla_irrelevante": true.

2. COMANDOS DE ACCIÓN CLÍNICA:
   - "confirmar", "confirmado", "aplicar", "aplicalo", "confirmar datos" -> "comando": "confirmar"
   - "descartar", "descarta", "cancelar propuesta" -> "comando": "descartar". IMPORTANTE: NUNCA interpretes "limpiar", "guardar" o "buscar" como "descartar".
   - "ve a [pestaña]", "ir a [pestaña]", "abre [pestaña]", "ve a guardar", "guardar", "ve a limpiar", "limpiar", "buscar", "busca", "dale buscar", "dale a buscar", "presiona buscar", "preregistro", "pre registro", "dale click en [botón]" -> "comando": "navegar", "destino_navegacion": "<nombre pestaña o botón>"
   - "ve a [sección]", "sube a [sección]", "baja a [sección]" donde sección es "datos de identificación", "contacto", "dirección", "factura" u "otros datos" -> "comando": "seccion", "destino_seccion": "<nombre sección>"
   - "baja", "bajar", "abajo", "scroll down", "más abajo" -> "comando": "bajar"
   - "sube", "subir", "arriba", "scroll up", "más arriba" -> "comando": "subir"

3. EXTRACCIÓN DE DATOS PARA FORMULARIO DE SMILE:
   - Pantalla de Búsqueda / Preregistro:
     * "código 1234", "código del paciente..." -> asigna al campo "Codigo:".
     * "mostrar pacientes registrados" -> "true" al campo "Mostrar pacientes registrados"; "no mostrar pacientes registrados" -> "false".
     * DNI en búsqueda: asigna el número de 8 dígitos al campo "DNI:" o "Documento".
   - DNI peruano: número de 8 dígitos (ej: "72 73 62 89" -> "72736289"). Asígnalo a "dni_para_reniec": "72736289", y agrega a "campos" el campo "Documento" o "DNI:" con ese número y "Tipo identificación" con valor "DNI".
   - Celular vs Teléfono de Casa: Si dice "celular" o número de 9 dígitos que empieza con 9 -> mapear a "Celular". Si dice "teléfono de casa" o fijo -> mapear a "Tel. Casa". Si dice "oficina" -> "Tel. Oficina".
   - Correo electrónico: interpreta "arroba" como @, "punto" como ., extensiones (.edu.pe, .com.pe, .pe, .com, etc.), todo junto sin espacios. Ejemplos: "correo juan arroba cayetano punto edu punto pe" -> "juan@cayetano.edu.pe"; "carlos 24 arroba gmail com" -> "carlos24@gmail.com". Asigna al campo de Email / Correo.
   - Fecha de nacimiento: normaliza a DD/MM/AAAA (ej: "22 02 2006" o "22 de febrero del 2006" -> "22/02/2006").
   - Tipo de identificación: Si dice "tipo de identificación pasaporte", "pasaporte" o "cambia a pasaporte" -> asigna al campo "Tipo identificación" con valor "PASAPORTE". Si dice carnet de extranjería -> "CARNET EXTRANJERIA". Si dice RUC -> "RUC". Si dice DNI -> "DNI".
   - Nombres y Apellidos: NUNCA aceptes palabras comunes en español, muletillas o frases de charla (ej: 'o sea sí y tú', 'para el fin', 'estaba viendo') como si fueran nombres de pacientes. Un nombre de paciente debe ser un antropónimo real (ej: Carlos, María, Yojan, Alexander, Juan, Quispe, Manosalva). NUNCA incluyas la preposición 'a' o 'por' (ej: 'cambia nombre a Alexander' -> valor 'Alexander', NUNCA 'Lexander' ni 'A Alexander'). Si el nombre empieza con A (ej: Alexander, Antonio, Ana), conserva intacta su primera letra 'A'. Limita los nombres a máximo 3 palabras (nombres de pila).
   - Género: "MASCULINO" o "FEMENINO".
   - Dirección del Paciente (Sección Dirección):
     * "calle", "dirección", "avenida" -> asigna a "*Calle" de la sección Dirección.
     * "número exterior", "número de vivienda", "número exterior de vivienda", "número de casa", "vivienda", "número": si dice "sin número", "S/N" o "SN", asigna "S/N". Si dice número (ej: "430", "555"), asigna ese número EXCLUSIVAMENTE a "*No. Exterior" (NUNCA a Calle ni a Dirección).
     * "referencia", "como referencia" -> asigna a "Referencia:".
     * "distrito", "provincia", "departamento" -> asigna a sus selectores correspondientes.
   - Facturación (Sección Factura):
     * "factura sí", "requiere factura sí", "selecciona factura sí", "factura no", "sin factura" -> asigna "Si" o "No" al campo "Va a requerir factura?".
     * "los datos son iguales a la dirección sí", "los datos sí son iguales a la dirección", "mismos datos de dirección" -> asigna "Si" o "No" al campo "Los datos son iguales a la dirección".
     * AISLAMIENTO ESTRICTO: NUNCA toques campos de Factura al editar la dirección o nombre del paciente, y viceversa. Solo edita campos de Factura si el usuario menciona explícitamente "factura" (ej: "calle de factura", "correo de factura") o "razón social".
   - Otros Datos (Sección Otros datos):
     * "cómo se enteró", "se enteró mediante...", "supo por..." -> asigna a "*Como se entero:" (valores: "FACEBOOK", "INSTAGRAM", "TIKTOK", "RECOMENDACION", "PAGINA WEB", "RADIO", "TELEVISION").
     * "estado civil", "el paciente está..." -> asigna a "*Estado Civil:" ("SOLTERO", "CASADO", "VIUDO", "DIVORCIADO", "CONVIVIENTE").
     * "ocupación", "profesión", "trabaja como..." -> asigna a "*Ocupación/profesión:" ("ESTUDIANTE", "EMPLEADO", "INDEPENDIENTE", "JUBILADO", "PROFESIONAL", "COMERCIANTE").
     * "escolaridad", "estudios", "grado de instrucción" -> asigna a "*Escolaridad:" ("SUPERIOR UNIVERSITARIA", "SUPERIOR NO UNIVERSITARIA", "SECUNDARIA COMPLETA", "TECNICO", "PRIMARIA COMPLETA").
     * "agenda varias citas", "agendar varias citas" -> asigna "Si" o "No" al campo "Agenda varias citas".
     * "observaciones", "nota" -> asigna al campo "Observaciones:".
4. Cada campo extraído DEBE incluir el 'id' numérico correspondiente de la lista de campos de Smile.

RESPONDE EXCLUSIVAMENTE UN OBJETO JSON VÁLIDO:
{
  "es_charla_irrelevante": boolean,
  "comando": "confirmar" | "descartar" | "navegar" | "bajar" | "subir" | "seccion" | null,
  "destino_navegacion": string | null,
  "destino_seccion": string | null,
  "dni_para_reniec": string | null,
  "campos": [
    { "id": number, "valor": string, "etiqueta": string }
  ]
}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Campos detectados en Smile:\n${JSON.stringify(campos)}\n\nPestañas detectadas en Smile:\n${JSON.stringify(state.discoveredTabs)}\n\nTranscripción de voz:\n"${text}"`
          }
        ]
      }
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1
    }
  };

  if (typeof OrbVisualizer !== "undefined") OrbVisualizer.setThinking(true);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.warn("Gemini API Error status:", res.status);
      return null;
    }

    const data = await res.json();
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) return null;
    return JSON.parse(rawJson);
  } catch (err) {
    console.error("Gemini invocation failed:", err);
    return null;
  } finally {
    if (typeof OrbVisualizer !== "undefined") OrbVisualizer.setThinking(false);
  }
}

/* ---------- PROCESAR TEXTO POR VOZ ---------- */
function handleText(rawText) {
  state.queue = state.queue.then(() => processText(rawText)).catch((e) => {
    setStatus("Error: " + e.message);
  });
  return state.queue;
}

async function processText(rawText) {
  // ANTI-ECO INTELIGENTE: Solo ignorar si el texto coincide con lo que el asistente pronuncia
  if (state.isSpeakingTTS && state.speakingText) {
    const cleanNorm = (rawText || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
    if (cleanNorm === state.speakingText || state.speakingText.includes(cleanNorm)) {
      return;
    }
  }

  const rawTrimmed = (rawText || "").trim();
  if (!rawTrimmed || JUNK.test(rawTrimmed)) return;

  // Limpiar prefijo opcional de invocación si el doctor lo usó
  let text = rawTrimmed.replace(/^(?:dentai|doctor|asistente)[,\s]*/i, "").trim();
  if (!text) return;

  addTranscript(text);
  const s = await getSettings();

  // Asegurar campos escaneados
  if (!state.fields.length) await scan();

  // Comandos de voz directos (ejecución rápida nativa)
  const normRaw = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,;:]+$/, "").trim();

  // 1. NAVEGACIÓN DIRECTA A SECCIONES DEL FORMULARIO DE SMILE
  // Ejemplos: "ve a Datos de Identificación", "sube a Factura", "ve a Contacto", "ve a Dirección", "sube a Otros datos", "ir a otros datos"
  const SECTION_NAV_REGEX = /^(?:(?:ve\s+a|ir\s+a|sube\s+a|baja\s+a|pasa\s+a|lleva\s+a|mostrar|ver|abrir|abre)\s+)?(?:la\s+secci[oó]n\s+(?:de\s+)?)?(?:secci[oó]n\s+(?:de\s+)?)?(datos\s+de\s+identificaci[oó]n|identificaci[oó]n|contacto|direcci[oó]n|factura|otros\s+datos|otro\s+dato)$/i;
  const secNavMatch = normRaw.match(SECTION_NAV_REGEX);
  if (secNavMatch) {
    const secTarget = secNavMatch[1];
    const ok = await scrollToSection(secTarget);
    if (ok) return;
  }

  // 2. COMANDOS DE SCROLL RÁPIDO (Manos Libres) - Ultra sensible y ejecución inmediata
  // Reconoce con alta sensibilidad: "sube", "subir", "suba", "suve", "tube", "tuve", "arriba", "más arriba", "sube un poco"
  // y "baja", "bajar", "baje", "abajo", "más abajo", "baja un poco"
  const isNavigatingToTarget = /(?:a|hacia|en)\s+(?:datos|identificaci|contacto|direcci|factura|otro|inicio|agenda|servicio|preregistro|guardar|limpiar)/i.test(normRaw);

  if (!isNavigatingToTarget) {
    const IS_SCROLL_UP = /\b(?:sube|subir|suba|suban|subi|subí|suve|suva|tube|tuve|arriba)\b/i;
    const IS_SCROLL_DOWN = /\b(?:baja|bajar|baje|bajan|abajo)\b/i;
    const hasFieldWord = /(?:calle|correo|nombre|apellido|dni|doc|vivienda|exterior|casa|factura|citas)/i.test(normRaw);

    if (IS_SCROLL_UP.test(normRaw) && !hasFieldWord) {
      const count = (normRaw.match(/sube|subir|suba|suve|tube|tuve|arriba/gi) || []).length || 1;
      const delta = Math.min(count, 3) * 380;
      await scrollPage("up", delta);
      return;
    }
    if (IS_SCROLL_DOWN.test(normRaw) && !hasFieldWord) {
      const count = (normRaw.match(/baja|bajar|baje|abajo/gi) || []).length || 1;
      const delta = Math.min(count, 3) * 380;
      await scrollPage("down", delta);
      return;
    }
  }

  if (/^(modo redactar|modo nota)$/i.test(normRaw)) {
    setMode("write");
    speak("Redactar.");
    return;
  }
  if (/^(modo llenar|modo campos)$/i.test(normRaw)) {
    setMode("fill");
    speak("Llenar.");
    return;
  }

  // ACCIONES DIRECTAS EN FORMULARIO DE SMILE: GUARDAR, LIMPIAR Y BUSCAR
  // Prioridad máxima para evitar confusiones con descarte de propuesta
  if (/^(?:(?:ve\s+a|voy\s+a|ir\s+a|abre|abrir|dale\s+clic(?:k)?\s+en|haz\s+clic(?:k)?\s+en|clic(?:k)?\s+en|presiona|presionar|toca)\s+)?(?:guardar|grabar|salvar)$/i.test(normRaw)) {
    await navigateToTab("guardar");
    return;
  }
  if (/^(?:(?:ve\s+a|voy\s+a|ir\s+a|abre|abrir|dale\s+clic(?:k)?\s+en|haz\s+clic(?:k)?\s+en|clic(?:k)?\s+en|presiona|presionar|toca)\s+)?(?:limpiar|reset|borrar\s+formulario|limpiar\s+formulario)$/i.test(normRaw)) {
    await navigateToTab("limpiar");
    return;
  }
  if (/^(?:(?:ve\s+a|voy\s+a|ir\s+a|abre|abrir|dale\s+(?:a\s+)?|dar\s+|haz\s+|presiona|presionar|toca|clic(?:k)?\s+(?:en\s+)?)\s*)?(?:buscar|busca|buscar\s+paciente|busca\s+paciente)$/i.test(normRaw)) {
    // Si hay campos pendientes en la búsqueda (ej: DNI o Nombre), aplicarlos primero antes de presionar buscar
    if (state.pending.size > 0) {
      await apply();
      await new Promise((r) => setTimeout(r, 250));
    }
    await navigateToTab("buscar");
    return;
  }

  // Navegación de pestañas, módulos y botones de acción de Smile (ej: "inicio", "agenda", "servicio", "preregistro")
  // A. Coincidencia con frase de acción o navegación
  const ACTION_PHRASE_REGEX = /^(?:ir\s+a|ve\s+a|abre|abrir|pasa\s+a|cambia\s+a|cambiar\s+a|ver|pestana|pestaña|menu|menú|modulo|módulo|dale\s+(?:a\s+)?(?:clic|click|presionar|tocar)?|dar\s+|haz\s+clic\s+en|haz\s+click\s+en|clic\s+en|click\s+en|presiona|presionar|toca|voy\s+a)\s+(.+)/i;
  const navMatch = text.match(ACTION_PHRASE_REGEX);
  if (navMatch) {
    const target = navMatch[1].replace(/[.,;]+$/, "").trim();
    if (target) {
      const ok = await navigateToTab(target);
      if (ok) return;
    }
  }

  // B. Coincidencia directa por nombre de módulo o botón de Smile
  const DIRECT_MODULES = /^(?:inicio|preregistro|pre registro|pre-registro|servicio|agenda|citas|reporte|reporte de fallas|nuevo|nuevo preregistro|nuevo registro|nuevos registro|nuevo paciente|crear preregistro|crear paciente|modificar|buscar|busca)$/i;
  if (DIRECT_MODULES.test(normRaw)) {
    const ok = await navigateToTab(normRaw);
    if (ok) return;
  }

  // COMANDO CONFIRMAR PROPUESTA: Escribe los campos pendientes en Smile
  if (/^(?:confirmar|confirmado|aplicar|aplicalo|confirmar\s+datos|aplicar\s+datos|listo\s+confirmar|ya\s+confirmar)$/i.test(normRaw) ||
      (/\b(?:confirmar|confirmado|aplicar|aplicalo)\b/i.test(normRaw) &&
       !/(?:dni|documento|celular|tel[eé]fono|correo|email|fecha|nacimiento|calle|nombre|apellido|pasaporte|carnet|ruc|guardar|limpiar)/i.test(normRaw))) {
    await apply();
    return;
  }

  // COMANDO DESCARTAR / CANCELAR PROPUESTA: Limpia la propuesta actual del asistente
  if (/^(?:descartar|descartalo|cancelar|cancelalo|descartar\s+propuesta|cancelar\s+propuesta)$/i.test(normRaw) ||
      (/\b(?:descartar|descartalo|cancelar|cancelalo)\b/i.test(normRaw) &&
       !/(?:dni|documento|celular|tel[eé]fono|correo|email|fecha|nacimiento|calle|nombre|apellido|pasaporte|carnet|ruc|guardar|limpiar)/i.test(normRaw))) {
    discard();
    speak("Borrado.");
    return;
  }

  // FILTRO ANTI-ECO DEL PROPIO ASISTENTE:
  // 1. Descartar si el texto capturado coincide con lo que el asistente acaba de decir por TTS
  if (state.speakingText) {
    const timeSinceSpeech = Date.now() - (state.lastSpeechTime || 0);
    if (timeSinceSpeech < 2500) {
      const cleanNorm = normRaw.replace(/[^a-z0-9\s]/g, "").trim();
      if (cleanNorm === state.speakingText || state.speakingText.includes(cleanNorm)) {
        console.log("Anti-echo: Descartado eco del asistente ->", normRaw);
        return;
      }
    }
  }

  // 2. Solo descartar si el texto capturado es EXCLUSIVAMENTE una palabra corta de confirmación que dice el asistente
  const PURE_TTS_WORDS = /^(?:listo|anotado|llenado|borrado|abriendo|redactar|llenar|error)[.!\s]*$/i;
  if (PURE_TTS_WORDS.test(normRaw)) {
    console.log("Anti-echo: Descartada palabra suelta de TTS ->", normRaw);
    return;
  }

  // ACCIONES DIRECTAS DE FACTURACIÓN Y CHECKBOXES RÁPIDOS
  const facDirect = extractFactura(text);
  if (facDirect && /(?:factura|requerir)/i.test(normRaw)) {
    const f = findField(/factura/i, /factura/i) || findField(null, /factura/i);
    if (f) {
      state.pending.set(f.id, { valor: facDirect, label: "Va a requerir factura?" });
      renderPending();
      speak("Listo.");
      setStatus(`Factura: ${facDirect}.`);
      await apply();
      setTimeout(async () => { await scan(); }, 600);
      return;
    }
  }

  const igDirect = extractDatosIgualesDireccion(text);
  if (igDirect) {
    const f = findField(/factura/i, /igual.*direc/i) || findField(null, /igual.*direc/i);
    if (f) {
      state.pending.set(f.id, { valor: igDirect, label: "Los datos son iguales a la dirección" });
      renderPending();
      speak("Listo.");
      setStatus(`Datos iguales a dirección: ${igDirect}.`);
      await apply();
      setTimeout(async () => { await scan(); }, 600);
      return;
    }
  }

  const citasDirect = extractAgendaVariasCitas(text);
  if (citasDirect && /(?:agenda|citas)/i.test(normRaw)) {
    const f = findField(/otros/i, /agenda.*cita|varias.*cita/i) || findField(null, /agenda.*cita|varias.*cita/i);
    if (f) {
      state.pending.set(f.id, { valor: citasDirect, label: "Agenda varias citas" });
      renderPending();
      speak("Listo.");
      setStatus(`Agenda varias citas: ${citasDirect}.`);
      await apply();
      return;
    }
  }

  // ACCIÓN DIRECTA: NÚMERO EXTERIOR / VIVIENDA / CASA / SIN NÚMERO
  // Atiende directamente dictados como "número exterior 555", "número exterior de vivienda 555", "vivienda 555", "sin número"
  const numExtDirect = extractNumeroExterior(text);
  if (numExtDirect && /(?:exterior|vivienda|casa|predio|sin\s+numero|\bsn\b)/i.test(normRaw)) {
    const f = findField(/direcci[oó]n/i, /exterior|no\.\s*exterior|num_ext|numext|vivienda/i) || findField(null, /exterior|no\.\s*exterior|num_ext|numext|vivienda/i);
    if (f) {
      state.pending.set(f.id, { valor: numExtDirect, label: "No. Exterior" });
      state.lockedFields.add(f.id);
      renderPending();
      speak("Listo.");
      setStatus(`No. Exterior: "${numExtDirect}". Di "confirmar".`);
      return;
    }
  }

  // ACCIÓN DIRECTA: CALLE / DIRECCIÓN GENERAL (Protegido contra exterior y vivienda)
  const calleDirect = extractCalle(text);
  if (calleDirect && /(?:calle|direcci[oó]n|avenida|jir[oó]n|pasaje)/i.test(normRaw) && !/(?:exterior|vivienda|casa|factura)/i.test(normRaw)) {
    const f = findField(/direcci[oó]n/i, /^calle$|calle(?!.*ext)|direcci[oó]n(?!.*ext)/i) || findField(null, /^calle$|calle(?!.*ext)|direcci[oó]n(?!.*ext)/i);
    if (f) {
      state.pending.set(f.id, { valor: calleDirect, label: "Calle" });
      state.lockedFields.add(f.id);
      renderPending();
      speak("Listo.");
      setStatus(`Calle: "${calleDirect}". Di "confirmar".`);
      return;
    }
  }

  // ACCIÓN DIRECTA: REFERENCIA
  const refDirect = extractReferencia(text);
  if (refDirect) {
    const f = findField(/direcci[oó]n/i, /referencia/i) || findField(null, /referencia/i);
    if (f) {
      state.pending.set(f.id, { valor: refDirect, label: "Referencia" });
      state.lockedFields.add(f.id);
      renderPending();
      speak("Listo.");
      setStatus(`Referencia: "${refDirect}". Di "confirmar".`);
      return;
    }
  }

  // ACCIÓN DIRECTA: CÓDIGO DE PACIENTE (Pantalla de búsqueda / Preregistro)
  const codDirect = extractCodigo(text);
  if (codDirect && /c[oó]digo/i.test(normRaw)) {
    const f = findField(null, /c[oó]digo/i);
    if (f) {
      state.pending.set(f.id, { valor: codDirect, label: "Código" });
      state.lockedFields.add(f.id);
      renderPending();
      speak("Listo.");
      setStatus(`Código: "${codDirect}". Di "confirmar" o "buscar".`);
      return;
    }
  }

  // ACCIÓN DIRECTA: MOSTRAR PACIENTES REGISTRADOS (Checkbox de Preregistro)
  const mostrarRegDirect = extractMostrarPacientesRegistrados(text);
  if (mostrarRegDirect && /mostrar|paciente|registrado/i.test(normRaw)) {
    const f = findField(null, /mostrar.*paciente|paciente.*registrado/i);
    if (f) {
      const boolVal = mostrarRegDirect === "true";
      state.pending.set(f.id, { valor: String(boolVal), label: "Mostrar pacientes registrados" });
      renderPending();
      speak("Listo.");
      setStatus(`Mostrar pacientes registrados: ${boolVal ? "Sí" : "No"}.`);
      await apply();
      return;
    }
  }

  // COMANDOS DE CORRECCIÓN / RECTIFICACIÓN / EDICIÓN DE CAMPOS
  const CORR_VERBS = "(?:cambia|cambiar|corrige|corregir|modifica|modificar|edita|editar|rectifica|rectificar|selecciona|seleccionar|marca|marcar|pon|poner)";
  const FIELD_TYPES = [
    "primer\\s+nombre", "segundo\\s+nombre", "nombres?",
    "primer\\s+apellido", "apellido\\s+paterno", "paterno",
    "segundo\\s+apellido", "apellido\\s+materno", "materno",
    "c[oó]digo(?:\\s+del\\s+paciente)?",
    "mostrar\\s+pacientes\\s+registrados", "pacientes\\s+registrados",
    "celular", "tel[eé]fono(?:\\s+de\\s+casa|\\s+casa|\\s+fijo)?", "casa", "fijo",
    "tel[eé]fono(?:\\s+de\\s+oficina|\\s+oficina|\\s+trabajo)?", "oficina", "trabajo",
    "calle\\s+de\\s+factura", "direcci[oó]n\\s+de\\s+factura",
    "correo\\s+de\\s+factura", "email\\s+de\\s+factura",
    "raz[oó]n\\s+social",
    "los\\s+datos\\s+(?:si\\s+)?son\\s+iguales(?:\\s+a\\s+la\\s+direcci[oó]n)?",
    "datos\\s+iguales(?:\\s+a\\s+la\\s+direcci[oó]n)?",
    "factura", "va\\s+a\\s+requerir\\s+factura",
    "calle", "direcci[oó]n",
    "n[uú]mero\\s+exterior(?:\\s+de\\s+vivienda)?", "n[uú]mero\\s+de\\s+vivienda", "n[uú]mero\\s+de\\s+casa", "n[uú]mero\\s+de\\s+direcci[oó]n", "no\\.?\\s*exterior", "vivienda", "n[uú]mero",
    "referencia", "distrito", "provincia", "departamento",
    "fecha", "nacimiento", "g[eé]nero", "sexo",
    "tipo(?:\\s+de)?\\s+identificaci[oó]n", "documento", "dni",
    "c[oó]mo\\s+se\\s+enter[oó]", "como\\s+se\\s+entero", "recomendador", "medio",
    "estado\\s+civil", "ocupaci[oó]n", "profesi[oó]n", "escolaridad", "estudios",
    "agenda(?:r)?\\s+varias\\s+citas", "varias\\s+citas",
    "observaciones", "observaci[oó]n", "nota"
  ].join("|");
  const corrMatch = text.match(new RegExp(`^${CORR_VERBS}\\s+(?:el\\s+|la\\s+)?(${FIELD_TYPES})(?:\\s+(?:\\ba\\b|\\bpor\\b|\\bes\\b|\\bde\\b))?\\s*[:=]?\\s*(.+)`, "i"));
  if (corrMatch) {
    const fieldType = corrMatch[1].toLowerCase();
    let rawVal = corrMatch[2].trim();

    // 1. Quitar preposiciones y conectores iniciales como "a", "por", "es", ":", "de" sin dañar nombres que inician con A (ej: Alexander, Antonio, Ana)
    let cleanVal = rawVal.replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();

    // 2. Cortar si el dictado continúa con charla o conector de siguiente acción
    cleanVal = cleanVal.split(/\s+(?:y\s+luego|luego|despu[eé]s|y\s+despu[eé]s|para|con|rectifica|edita|cambia|corrige|confirmar|aplicar|descartar|cancelar|baja|sube)\b/i)[0].trim();

    // RAMA A1: PRIMER NOMBRE ESPECÍFICO (ej: "cambia el primer nombre a Juan")
    if (/^primer\s+nombre$/i.test(fieldType)) {
      const validWords = filterValidNameWords(cleanVal, 1);
      if (validWords.length > 0) {
        const nomField = findField(/identificacion/i, /^nombre$/i) || findField(null, /^nombre$/i);
        const currVal = state.pending.get(nomField?.id)?.valor || state.currentPatient?.nombres || "";
        const currWords = currVal.trim().split(/\s+/).filter(Boolean);
        const newFirst = validWords[0];
        const secondPart = currWords.slice(1).join(" ");
        const finalName = secondPart ? `${newFirst} ${secondPart}` : newFirst;

        if (nomField) {
          state.pending.set(nomField.id, { valor: finalName, label: "Nombre" });
          state.lockedFields.add(nomField.id);
          if (state.currentPatient) state.currentPatient.nombres = finalName;
          renderPending();
          speak("Listo.");
          setStatus(`Primer nombre rectificado a "${newFirst}". Di "confirmar".`);
          return;
        }
      }
    }

    // RAMA A2: SEGUNDO NOMBRE ESPECÍFICO (ej: "cambia el segundo nombre a Alexander")
    if (/^segundo\s+nombre$/i.test(fieldType)) {
      const validWords = filterValidNameWords(cleanVal, 2);
      if (validWords.length > 0) {
        const nomField = findField(/identificacion/i, /^nombre$/i) || findField(null, /^nombre$/i);
        const currVal = state.pending.get(nomField?.id)?.valor || state.currentPatient?.nombres || "";
        const currWords = currVal.trim().split(/\s+/).filter(Boolean);
        const firstPart = currWords[0] || (state.currentPatient?.nombres ? state.currentPatient.nombres.split(/\s+/)[0] : "");
        const newSecond = validWords.join(" ");
        const finalName = firstPart ? `${firstPart} ${newSecond}` : newSecond;

        if (nomField) {
          state.pending.set(nomField.id, { valor: finalName, label: "Nombre" });
          state.lockedFields.add(nomField.id);
          if (state.currentPatient) state.currentPatient.nombres = finalName;
          renderPending();
          speak("Listo.");
          setStatus(`Segundo nombre rectificado a "${newSecond}". Di "confirmar".`);
          return;
        }
      }
    }

    // RAMA A3: NOMBRE / NOMBRES GENERAL (ej: "cambia el nombre a Juan", "cambia el nombre a Johan Alexander")
    if (/^nombres?$/i.test(fieldType)) {
      const validWords = filterValidNameWords(cleanVal, 3);
      if (validWords.length > 0) {
        const dbName = state.currentPatient?.nombres || "";
        const formattedName = reconcileNameWithDb(validWords, dbName);
        const nomField = findField(/identificacion/i, /^nombre$/i) || findField(null, /^nombre$/i);
        if (nomField && formattedName) {
          state.pending.set(nomField.id, { valor: formattedName, label: "Nombre" });
          state.lockedFields.add(nomField.id); // Bloqueado para que el DNI no lo sobreescriba
          if (state.currentPatient) {
            state.currentPatient.nombres = formattedName;
          }
          renderPending();
          speak("Listo.");
          setStatus(`Nombre rectificado a "${formattedName}". Di "confirmar".`);
          return;
        }
      } else {
        console.log("Ruido descartado en rectificación de nombre ->", cleanVal);
        setStatus("Ignorado: no se detectó un nombre válido de persona.");
        return;
      }
    }

    // RAMA B: PRIMER APELLIDO / PATERNO (Reconciliado con BD)
    if (/primer\s+apellido|apellido\s+paterno|paterno/i.test(fieldType)) {
      const validWords = filterValidNameWords(cleanVal, 2);
      if (validWords.length > 0) {
        const dbApe = state.currentPatient?.apellidoPaterno || "";
        const formattedApe = reconcileNameWithDb(validWords, dbApe);
        const patField = findField(/identificacion/i, /primer\s+apellido/i) || findField(null, /primer\s+apellido/i);
        if (patField && formattedApe) {
          state.pending.set(patField.id, { valor: formattedApe, label: "Primer Apellido" });
          state.lockedFields.add(patField.id);
          if (state.currentPatient) {
            state.currentPatient.apellidoPaterno = formattedApe;
          }
          renderPending();
          speak("Listo.");
          setStatus(`Primer apellido rectificado a "${formattedApe}". Di "confirmar".`);
          return;
        }
      } else {
        setStatus("Ignorado: no se detectó un apellido válido.");
        return;
      }
    }

    // RAMA C: SEGUNDO APELLIDO / MATERNO (Reconciliado con BD)
    if (/segundo\s+apellido|apellido\s+materno|materno/i.test(fieldType)) {
      const validWords = filterValidNameWords(cleanVal, 2);
      if (validWords.length > 0) {
        const dbApe = state.currentPatient?.apellidoMaterno || "";
        const formattedApe = reconcileNameWithDb(validWords, dbApe);
        const matField = findField(/identificacion/i, /segundo\s+apellido/i) || findField(null, /segundo\s+apellido/i);
        if (matField && formattedApe) {
          state.pending.set(matField.id, { valor: formattedApe, label: "Segundo Apellido" });
          state.lockedFields.add(matField.id);
          if (state.currentPatient) {
            state.currentPatient.apellidoMaterno = formattedApe;
          }
          renderPending();
          speak("Listo.");
          setStatus(`Segundo apellido rectificado a "${formattedApe}". Di "confirmar".`);
          return;
        }
      } else {
        setStatus("Ignorado: no se detectó un apellido válido.");
        return;
      }
    }

    // RAMA D: CELULAR O TELÉFONOS
    if (/celular/i.test(fieldType)) {
      const dig = cleanVal.replace(/\D/g, "");
      const f = findField(/contacto/i, /celular/i) || findField(null, /celular/i);
      if (f && dig) {
        state.pending.set(f.id, { valor: dig, label: "Celular" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Celular corregido a ${dig}. Di "confirmar".`);
        return;
      }
    }

    if (/casa|fijo/i.test(fieldType)) {
      const dig = cleanVal.replace(/\D/g, "");
      const f = findField(/contacto/i, /tel.*casa|telefono.*casa/i) || findField(null, /tel.*casa/i);
      if (f && dig) {
        state.pending.set(f.id, { valor: dig, label: "Tel. Casa" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Teléfono de casa corregido a ${dig}. Di "confirmar".`);
        return;
      }
    }

    if (/oficina|trabajo/i.test(fieldType)) {
      const dig = cleanVal.replace(/\D/g, "");
      const f = findField(/contacto/i, /tel.*ofi|telefono.*ofi/i) || findField(null, /tel.*ofi/i);
      if (f && dig) {
        state.pending.set(f.id, { valor: dig, label: "Tel. Oficina" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Teléfono de oficina corregido a ${dig}. Di "confirmar".`);
        return;
      }
    }

    // RAMA FACTURA AISLADA (Calle de factura, Correo de factura, Razón Social, Toggle Factura, Toggle Datos Iguales)
    if (/calle\s+de\s+factura|direcci[oó]n\s+de\s+factura/i.test(fieldType)) {
      const f = findField(/factura/i, /calle|direcci[oó]n/i);
      if (f && cleanVal) {
        state.pending.set(f.id, { valor: cleanVal, label: "Calle (Factura)" });
        renderPending();
        speak("Listo.");
        setStatus(`Calle de factura: "${cleanVal}". Di "confirmar".`);
        return;
      }
    }

    if (/correo\s+de\s+factura|email\s+de\s+factura/i.test(fieldType)) {
      const em = extractEmail(cleanVal) || cleanVal.replace(/\s+/g, "").toLowerCase();
      const f = findField(/factura/i, /correo|email/i);
      if (f && em) {
        state.pending.set(f.id, { valor: em, label: "Correo (Factura)" });
        renderPending();
        speak("Listo.");
        setStatus(`Correo de factura: ${em}. Di "confirmar".`);
        return;
      }
    }

    if (/raz[oó]n\s+social/i.test(fieldType)) {
      const f = findField(/factura/i, /raz[oó]n\s+social/i) || findField(null, /raz[oó]n\s+social/i);
      if (f && cleanVal) {
        state.pending.set(f.id, { valor: cleanVal.toUpperCase(), label: "Razón Social" });
        renderPending();
        speak("Listo.");
        setStatus(`Razón Social: "${cleanVal.toUpperCase()}". Di "confirmar".`);
        return;
      }
    }

    if (/^factura$|^va\s+a\s+requerir\s+factura$/i.test(fieldType)) {
      const facVal = /^(?:no|false|0|desactivar)$/i.test(cleanVal) ? "No" : "Si";
      const f = findField(/factura/i, /factura/i) || findField(null, /factura/i);
      if (f) {
        state.pending.set(f.id, { valor: facVal, label: "Va a requerir factura?" });
        renderPending();
        speak("Listo.");
        setStatus(`Factura: ${facVal}.`);
        await apply();
        setTimeout(async () => { await scan(); }, 600);
        return;
      }
    }

    if (/datos\s+(?:si\s+)?son\s+iguales|datos\s+iguales/i.test(fieldType)) {
      const igVal = /^(?:no|false|0)$/i.test(cleanVal) ? "No" : "Si";
      const f = findField(/factura/i, /igual.*direc/i) || findField(null, /igual.*direc/i);
      if (f) {
        state.pending.set(f.id, { valor: igVal, label: "Los datos son iguales a la dirección" });
        renderPending();
        speak("Listo.");
        setStatus(`Datos iguales a dirección: ${igVal}.`);
        await apply();
        setTimeout(async () => { await scan(); }, 600);
        return;
      }
    }

    // RAMA E: DIRECCIÓN / CALLE (Exclusivo Sección Dirección de Paciente)
    if (/^calle$|^direcci[oó]n$/i.test(fieldType)) {
      const f = findField(/direcci[oó]n/i, /^calle$|calle(?!.*ext)|direcci[oó]n(?!.*ext)/i) || findField(null, /^calle$|calle(?!.*ext)|direcci[oó]n(?!.*ext)/i);
      if (f && cleanVal) {
        state.pending.set(f.id, { valor: cleanVal, label: "Calle" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Dirección corregida a "${cleanVal}". Di "confirmar".`);
        return;
      }
    }

    // RAMA E2: NO. EXTERIOR / NÚMERO DE VIVIENDA / CASA / SIN NÚMERO
    if (/exterior|vivienda|n[uú]mero\s+de\s+casa|n[uú]mero\s+de\s+direcci[oó]n|^n[uú]mero$/i.test(fieldType)) {
      let extVal = cleanVal;
      if (/^(?:sin\s+n[uú]mero|sin\s+numero|sn|s\/n)$/i.test(cleanVal)) extVal = "S/N";
      const f = findField(/direcci[oó]n/i, /exterior|no\.\s*exterior|num_ext|numext|vivienda/i) || findField(null, /exterior|no\.\s*exterior|num_ext|numext|vivienda/i);
      if (f && extVal) {
        state.pending.set(f.id, { valor: extVal, label: "No. Exterior" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`No. Exterior corregido a "${extVal}". Di "confirmar".`);
        return;
      }
    }

    // RAMA E3: REFERENCIA
    if (/referencia/i.test(fieldType)) {
      const f = findField(/direcci[oó]n/i, /referencia/i);
      if (f && cleanVal) {
        state.pending.set(f.id, { valor: cleanVal, label: "Referencia" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Referencia corregida a "${cleanVal}". Di "confirmar".`);
        return;
      }
    }

    // RAMA F: CORREO / EMAIL
    if (/correo|email/i.test(fieldType)) {
      const em = extractEmail(cleanVal) || cleanVal.replace(/\s+/g, "").toLowerCase();
      const f = findField(/contacto/i, /email|correo/i) || findField(null, /email|correo/i);
      if (f && em) {
        state.pending.set(f.id, { valor: em, label: "Email" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Correo corregido a ${em}. Di "confirmar".`);
        return;
      }
    }

    // RAMA G: FECHA DE NACIMIENTO
    if (/fecha|nacimiento/i.test(fieldType)) {
      const nac = extractFechaNacimiento(cleanVal) || extractFechaNacimiento("fecha nacimiento " + cleanVal);
      const f = findField(/identificacion/i, /nacimiento/i);
      if (f && nac) {
        state.pending.set(f.id, { valor: nac.val, label: "Fecha Nacimiento" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Fecha corregida a ${nac.val}. Di "confirmar".`);
        return;
      }
    }

    // RAMA H: DISTRITO
    if (/distrito/i.test(fieldType)) {
      const f = findField(/direccion/i, /distrito/i);
      if (f && cleanVal) {
        state.pending.set(f.id, { valor: cleanVal.toUpperCase(), label: "Distrito" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Distrito corregido a "${cleanVal}". Di "confirmar".`);
        return;
      }
    }

    // RAMA I: TIPO DE IDENTIFICACIÓN
    if (/tipo.*ident|tipo/i.test(fieldType)) {
      const tipoObj = extractTipoIdentificacion(cleanVal);
      const f = findField(/identificacion/i, /tipo.*ident/i) || findField(null, /tipo.*ident/i);
      if (f && tipoObj) {
        state.pending.set(f.id, { valor: tipoObj.val, label: "Tipo identificación" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Tipo de identificación cambiado a ${tipoObj.label}.`);
        await apply();
        return;
      }
    }

    // RAMA J: DOCUMENTO / DNI
    if (/documento|dni/i.test(fieldType)) {
      const dig = cleanVal.replace(/\D/g, "");
      const f = findField(/identificacion/i, /^documento$/i) || findField(null, /documento/i);
      if (f && dig) {
        state.pending.set(f.id, { valor: dig, label: "Documento" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Documento corregido a ${dig}. Di "confirmar".`);
        return;
      }
    }

    // RAMA K: CÓMO SE ENTERÓ
    if (/c[oó]mo\s+se\s+enter[oó]|como\s+se\s+entero|recomendador|medio/i.test(fieldType)) {
      const recomVal = extractComoSeEntero(cleanVal) || cleanVal.toUpperCase();
      const f = findField(/otros/i, /como.*entero|recomendad/i) || findField(null, /como.*entero|recomendad/i);
      if (f && recomVal) {
        state.pending.set(f.id, { valor: recomVal, label: "Cómo se enteró" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Cómo se enteró: "${recomVal}". Di "confirmar".`);
        return;
      }
    }

    // RAMA L: ESTADO CIVIL
    if (/estado\s+civil/i.test(fieldType)) {
      const civVal = extractEstadoCivil(cleanVal) || cleanVal.toUpperCase();
      const f = findField(/otros/i, /estado.*civil|civil/i) || findField(null, /estado.*civil|civil/i);
      if (f && civVal) {
        state.pending.set(f.id, { valor: civVal, label: "Estado Civil" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Estado Civil: "${civVal}". Di "confirmar".`);
        return;
      }
    }

    // RAMA M: OCUPACIÓN / PROFESIÓN
    if (/ocupaci[oó]n|profesi[oó]n/i.test(fieldType)) {
      const ocupVal = extractOcupacion(cleanVal) || cleanVal.toUpperCase();
      const f = findField(/otros/i, /ocupaci|profesi/i) || findField(null, /ocupaci|profesi/i);
      if (f && ocupVal) {
        state.pending.set(f.id, { valor: ocupVal, label: "Ocupación" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Ocupación: "${ocupVal}". Di "confirmar".`);
        return;
      }
    }

    // RAMA N: ESCOLARIDAD / ESTUDIOS
    if (/escolaridad|estudios/i.test(fieldType)) {
      const escVal = extractEscolaridad(cleanVal) || cleanVal.toUpperCase();
      const f = findField(/otros/i, /escolar|estudio/i) || findField(null, /escolar|estudio/i);
      if (f && escVal) {
        state.pending.set(f.id, { valor: escVal, label: "Escolaridad" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Escolaridad: "${escVal}". Di "confirmar".`);
        return;
      }
    }

    // RAMA O: AGENDA VARIAS CITAS
    if (/agenda(?:r)?\s+varias\s+citas|varias\s+citas/i.test(fieldType)) {
      const citVal = /^(?:no|false|0)$/i.test(cleanVal) ? "No" : "Si";
      const f = findField(/otros/i, /agenda.*cita|varias.*cita/i) || findField(null, /agenda.*cita|varias.*cita/i);
      if (f) {
        state.pending.set(f.id, { valor: citVal, label: "Agenda varias citas" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Agenda varias citas: ${citVal}.`);
        await apply();
        return;
      }
    }

    // RAMA P: OBSERVACIONES / NOTA
    if (/observaci[oó]n|observaciones|nota/i.test(fieldType)) {
      const f = findField(/otros/i, /observaci|nota/i) || findField(null, /observaci|nota/i);
      if (f && cleanVal) {
        state.pending.set(f.id, { valor: cleanVal, label: "Observaciones" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Observaciones: "${cleanVal}". Di "confirmar".`);
        return;
      }
    }

    // RAMA Q: CÓDIGO (Pantalla de búsqueda / Preregistro)
    if (/c[oó]digo/i.test(fieldType)) {
      const f = findField(null, /c[oó]digo/i);
      if (f && cleanVal) {
        state.pending.set(f.id, { valor: cleanVal, label: "Código" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Código: "${cleanVal}". Di "confirmar" o "buscar".`);
        return;
      }
    }

    // RAMA R: MOSTRAR PACIENTES REGISTRADOS (Checkbox de Preregistro)
    if (/mostrar.*paciente|paciente.*registrado/i.test(fieldType)) {
      const boolVal = !/^(?:no|false|0|desactivar|quitar)$/i.test(cleanVal);
      const f = findField(null, /mostrar.*paciente|paciente.*registrado/i);
      if (f) {
        state.pending.set(f.id, { valor: String(boolVal), label: "Mostrar pacientes registrados" });
        renderPending();
        speak("Listo.");
        setStatus(`Mostrar pacientes registrados: ${boolVal ? "Sí" : "No"}.`);
        await apply();
        return;
      }
    }
  }

  // PROTECCIÓN DE TOKENS Y SOLICITUDES DIARIAS:
  // Si son murmullos cortos o monosílabos sin números ni datos clínicos, no llamar a Gemini para no quemar la cuota diaria
  const words = text.split(/\s+/).filter(Boolean);
  const hasNumbers = /\d/.test(text);
  const hasClinicalWord = /(?:dni|documento|tipo|pasaporte|carnet|extranjer|ruc|nombre|apellido|fecha|nacimiento|celular|telefono|tel|correo|email|arroba|genero|sexo|masculino|femenino|calle|direccion|exterior|vivienda|casa|referencia|factura|razon|entero|recomendad|civil|soltero|casado|ocupacion|profesion|estudiante|escolaridad|citas|observacion|inicio|agenda|servicio|preregistro|reporte|sube|subir|baja|bajar|arriba|abajo|seccion)/i.test(normRaw);

  if (words.length < 2 && !hasNumbers && !hasClinicalWord) {
    return;
  }

  // ==========================================
  // MOTOR 1: INTELIGENCIA ARTIFICIAL GOOGLE GEMINI (MOTOR PRIMARIO)
  // ==========================================
  if (s.geminiApiKey) {
    setStatus("Analizando con Gemini…");
    const aiResult = await extractWithGemini(text, s);

    if (aiResult) {
      // 1. Filtro inteligente de charlas de fondo y ruido ambiental
      if (aiResult.es_charla_irrelevante) {
        console.log("DentAI IA: Charla de fondo ignorada ->", text);
        setStatus("Charla de fondo ignorada. Escuchando…");
        return;
      }

      // 2. Comandos interpretados por IA
      if (aiResult.comando === "confirmar") {
        await apply();
        return;
      }
      if (aiResult.comando === "descartar") {
        discard();
        speak("Borrado.");
        return;
      }
      if (aiResult.comando === "navegar" && aiResult.destino_navegacion) {
        await navigateToTab(aiResult.destino_navegacion);
        return;
      }
      if (aiResult.comando === "seccion" && aiResult.destino_seccion) {
        await scrollToSection(aiResult.destino_seccion);
        return;
      }
      if (aiResult.comando === "bajar") {
        await scrollPage("down");
        return;
      }
      if (aiResult.comando === "subir") {
        await scrollPage("up");
        return;
      }

      let dniFetched = false;
      // 3. Consulta DNI en Base de Datos Clínica / RENIEC si la IA detectó DNI de 8 dígitos
      if (aiResult.dni_para_reniec && s.dniAutoQuery && !isSearchScreen()) {
        const patient = await buscarPaciente(aiResult.dni_para_reniec, s);
        if (patient) {
          poblarCamposPaciente(patient);
          dniFetched = true;
          speak(`${patient.nombres}.`);
        }
      }

      // 4. Campos estructurados por la IA
      if (aiResult.campos && Array.isArray(aiResult.campos) && aiResult.campos.length > 0) {
        const addedLabels = [];
        for (const c of aiResult.campos) {
          const f = state.fields.find((x) => x.id === c.id);
          if (f && c.valor != null && String(c.valor).trim() !== "") {
            let val = String(c.valor).trim();
            // Limpieza estricta de preposición "a", filtro de ruido y reconciliación con BD oficial
            if (/nombre/i.test(f.etiqueta || c.etiqueta)) {
              val = val.replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
              const validWords = filterValidNameWords(val, 3);
              if (validWords.length === 0) continue; // Descartar si era ruido o charla
              const dbName = state.currentPatient?.nombres || "";
              val = reconcileNameWithDb(validWords, dbName);
              state.lockedFields.add(f.id);
              if (state.currentPatient) state.currentPatient.nombres = val;
            }
            if (/primer\s+apellido/i.test(f.etiqueta || c.etiqueta)) {
              val = val.replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
              const validWords = filterValidNameWords(val, 2);
              if (validWords.length === 0) continue;
              const dbApe = state.currentPatient?.apellidoPaterno || "";
              val = reconcileNameWithDb(validWords, dbApe);
              state.lockedFields.add(f.id);
              if (state.currentPatient) state.currentPatient.apellidoPaterno = val;
            }
            if (/segundo\s+apellido/i.test(f.etiqueta || c.etiqueta)) {
              val = val.replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
              const validWords = filterValidNameWords(val, 2);
              if (validWords.length === 0) continue;
              const dbApe = state.currentPatient?.apellidoMaterno || "";
              val = reconcileNameWithDb(validWords, dbApe);
              state.lockedFields.add(f.id);
              if (state.currentPatient) state.currentPatient.apellidoMaterno = val;
            }
            state.pending.set(f.id, { valor: val, label: f.etiqueta || c.etiqueta });
            addedLabels.push(f.etiqueta || "campo");
          }
        }
        renderPending();
        if (!dniFetched) {
          speak("Listo.");
        }
        setStatus(`Campos listos: ${addedLabels.join(", ")}. Di "confirmar".`);
        return;
      } else if (dniFetched) {
        renderPending();
        setStatus("Datos de RENIEC listos. Di 'confirmar'.");
        return;
      }
    }
  }

  // ==========================================
  // MOTOR 2: REGLAS CLÍNICAS LOCALES (MOTOR DE RESPALDO)
  // Se ejecuta si no hay clave de Gemini o si falló la conexión
  // ==========================================
  const detectedLabels = [];

  // --- PASO 1: DETECCIÓN DE FECHA DE NACIMIENTO ---
  const nacObj = extractFechaNacimiento(text);
  if (nacObj) {
    const nacField = findField(/identificacion/i, /nacimiento/i);
    if (nacField) {
      state.pending.set(nacField.id, { valor: nacObj.val, label: "Fecha Nacimiento" });
      detectedLabels.push("Fecha de nacimiento");
      text = text.replace(nacObj.raw, "").replace(/fecha\s*(?:de)?\s*nacimiento|nacimiento|nacido\s*el/gi, "").trim();
    }
  }

  // --- PASO 2: DETECCIÓN DE TIPO DE IDENTIFICACIÓN ---
  const tipoObj = extractTipoIdentificacion(text);
  if (tipoObj) {
    const tipoField = findField(/identificacion/i, /tipo.*ident|tipo.*doc/i) || findField(null, /tipo.*ident|tipo.*doc/i);
    if (tipoField) {
      state.pending.set(tipoField.id, { valor: tipoObj.val, label: "Tipo identificación" });
      detectedLabels.push(`Tipo de identificación (${tipoObj.label})`);

      // Si el doctor dijo "cambia...", aplicar de inmediato en Smile
      if (/\b(?:cambia|cambiar|selecciona|poner|actualiza)\b/i.test(normRaw)) {
        renderPending();
        speak("Listo.");
        setStatus(`Tipo de identificación cambiado a ${tipoObj.label}.`);
        await apply();
        return;
      }
    }
  }

  // --- PASO 3: DETECCIÓN DE DNI / DOCUMENTO ---
  const dniVal = extractDni(text);
  if (dniVal) {
    const docField = findField(/identificacion/i, /^documento$|dni/i) || findField(null, /^documento$|dni/i);
    const tipoField = findField(/identificacion/i, /tipo.*ident/i) || findField(null, /tipo.*ident/i);

    if (docField) {
      state.pending.set(docField.id, { valor: dniVal, label: docField.etiqueta || "DNI" });
      detectedLabels.push("DNI");
    }
    if (tipoField && !state.pending.has(tipoField.id)) {
      state.pending.set(tipoField.id, { valor: "DNI", label: "Tipo identificación" });
    }

    const isSearchMode = isSearchScreen();
    if (!isSearchMode && s.dniAutoQuery) {
      const patient = await buscarPaciente(dniVal, s);
      if (patient) {
        const added = poblarCamposPaciente(patient);
        const full = `${patient.nombres} ${patient.apellidoPaterno || ""} ${patient.apellidoMaterno || ""}`.trim();
        renderPending();
        speak(`${patient.nombres} cargado.`);
        setStatus(`Paciente: ${full} (${patient.origen || "DB"}). ${added.length} campos listos. Di "confirmar".`);
        return;
      }
    } else if (isSearchMode && docField) {
      renderPending();
      speak("DNI listo.");
      setStatus(`DNI: ${dniVal}. Di "confirmar" o "buscar".`);
      return;
    }
  } else {
    const otherDoc = extractDocNum(text);
    if (otherDoc) {
      const docField = findField(/identificacion/i, /^documento$|dni/i) || findField(null, /^documento$|dni/i);
      if (docField) {
        state.pending.set(docField.id, { valor: otherDoc, label: "Documento" });
        detectedLabels.push("Documento");
      }
    }
  }

  // --- PASO 4: DETECCIÓN DE NOMBRE ---
  const nameVal = extractName(text);
  if (nameVal) {
    const nomField = findField(/identificacion/i, /^nombre$/i) || findField(null, /^nombre$/i);
    if (nomField) {
      state.pending.set(nomField.id, { valor: nameVal, label: "Nombre" });
      state.lockedFields.add(nomField.id);
      if (state.currentPatient) state.currentPatient.nombres = nameVal;
      detectedLabels.push("Nombre");
    }
  }

  // --- PASO 5: DETECCIÓN DE PRIMER APELLIDO ---
  const patVal = extractPrimerApellido(text);
  if (patVal) {
    const patField = findField(/identificacion/i, /primer\s+apellido/i);
    if (patField) {
      state.pending.set(patField.id, { valor: patVal, label: "Primer Apellido" });
      state.lockedFields.add(patField.id);
      if (state.currentPatient) state.currentPatient.apellidoPaterno = patVal;
      detectedLabels.push("Primer apellido");
    }
  }

  // --- PASO 6: DETECCIÓN DE SEGUNDO APELLIDO ---
  const matVal = extractSegundoApellido(text);
  if (matVal) {
    const matField = findField(/identificacion/i, /segundo\s+apellido/i);
    if (matField) {
      state.pending.set(matField.id, { valor: matVal, label: "Segundo Apellido" });
      state.lockedFields.add(matField.id);
      if (state.currentPatient) state.currentPatient.apellidoMaterno = matVal;
      detectedLabels.push("Segundo apellido");
    }
  }

  // --- PASO 7: TELÉFONOS (CASA VS OFICINA VS CELULAR) ---
  const telCasaVal = extractTelCasa(text);
  if (telCasaVal) {
    const telCasaField = findField(/contacto/i, /tel.*casa|telefono.*casa/i) || findField(null, /tel.*casa/i);
    if (telCasaField) {
      state.pending.set(telCasaField.id, { valor: telCasaVal, label: "Tel. Casa" });
      detectedLabels.push("Teléfono de casa");
    }
  }

  const telOfiVal = extractTelOficina(text);
  if (telOfiVal) {
    const telOfiField = findField(/contacto/i, /tel.*ofi|telefono.*ofi/i) || findField(null, /tel.*ofi/i);
    if (telOfiField) {
      state.pending.set(telOfiField.id, { valor: telOfiVal, label: "Tel. Oficina" });
      detectedLabels.push("Teléfono de oficina");
    }
  }

  const celVal = extractCelular(text);
  if (celVal) {
    const celField = findField(/contacto/i, /celular/i) || findField(null, /celular/i);
    if (celField) {
      state.pending.set(celField.id, { valor: celVal, label: "Celular" });
      detectedLabels.push("Celular");
    }
  }

  // --- PASO 8: DETECCIÓN DE EMAIL (SOPORTE .PE, .EDU.PE, .COM, ETC.) ---
  const emailVal = extractEmail(text);
  if (emailVal) {
    const emailField = findField(/contacto/i, /email|correo/i) || findField(null, /email|correo/i);
    if (emailField) {
      state.pending.set(emailField.id, { valor: emailVal, label: "Email" });
      detectedLabels.push("Email");
    }
  }

  // --- PASO 9: DETECCIÓN DE GÉNERO ---
  const genVal = extractGenero(text);
  if (genVal) {
    const genField = findField(/identificacion/i, /genero|sexo/i) || findField(null, /genero|sexo/i);
    if (genField) {
      state.pending.set(genField.id, { valor: genVal, label: "Género" });
      detectedLabels.push("Género");
    }
  }

  // --- PASO 10: CALLE / DIRECCIÓN ---
  const calleVal = extractCalle(text);
  if (calleVal) {
    const calleField = findField(/direcci[oó]n/i, /^calle$|calle(?!.*ext)|direcci[oó]n(?!.*ext)/i) || findField(null, /^calle$|calle(?!.*ext)|direcci[oó]n(?!.*ext)/i);
    if (calleField) {
      state.pending.set(calleField.id, { valor: calleVal, label: "Calle" });
      detectedLabels.push("Calle");
    }
  }

  // --- PASO 11: NO. EXTERIOR / NÚMERO DE VIVIENDA / CASA / SIN NÚMERO ---
  const numExtVal = extractNumeroExterior(text);
  if (numExtVal) {
    const extField = findField(/direcci[oó]n/i, /exterior|no\.\s*exterior|num_ext|numext|vivienda/i) || findField(null, /exterior|no\.\s*exterior|num_ext|numext|vivienda/i);
    if (extField) {
      state.pending.set(extField.id, { valor: numExtVal, label: "No. Exterior" });
      detectedLabels.push("No. Exterior");
    }
  }

  // --- PASO 12: REFERENCIA ---
  const refVal = extractReferencia(text);
  if (refVal) {
    const refField = findField(/direcci[oó]n/i, /referencia/i);
    if (refField) {
      state.pending.set(refField.id, { valor: refVal, label: "Referencia" });
      detectedLabels.push("Referencia");
    }
  }

  // --- PASO 13: FACTURA ---
  const facVal = extractFactura(text);
  if (facVal) {
    const facField = findField(/factura/i, /factura/i) || findField(null, /factura/i);
    if (facField) {
      state.pending.set(facField.id, { valor: facVal, label: "Va a requerir factura?" });
      detectedLabels.push(`Factura (${facVal})`);
    }
  }

  // --- PASO 14: DATOS IGUALES A DIRECCIÓN ---
  const igVal = extractDatosIgualesDireccion(text);
  if (igVal) {
    const igField = findField(/factura/i, /igual.*direc/i) || findField(null, /igual.*direc/i);
    if (igField) {
      state.pending.set(igField.id, { valor: igVal, label: "Los datos son iguales a la dirección" });
      detectedLabels.push(`Datos iguales a dirección (${igVal})`);
    }
  }

  // --- PASO 15: CÓMO SE ENTERÓ ---
  const recomVal = extractComoSeEntero(text);
  if (recomVal) {
    const recomField = findField(/otros/i, /como.*entero|recomendad/i) || findField(null, /como.*entero|recomendad/i);
    if (recomField) {
      state.pending.set(recomField.id, { valor: recomVal, label: "Cómo se enteró" });
      detectedLabels.push(`Cómo se enteró (${recomVal})`);
    }
  }

  // --- PASO 16: ESTADO CIVIL ---
  const civVal = extractEstadoCivil(text);
  if (civVal) {
    const civField = findField(/otros/i, /estado.*civil|civil/i) || findField(null, /estado.*civil|civil/i);
    if (civField) {
      state.pending.set(civField.id, { valor: civVal, label: "Estado Civil" });
      detectedLabels.push(`Estado Civil (${civVal})`);
    }
  }

  // --- PASO 17: OCUPACIÓN / PROFESIÓN ---
  const ocupVal = extractOcupacion(text);
  if (ocupVal) {
    const ocupField = findField(/otros/i, /ocupaci|profesi/i) || findField(null, /ocupaci|profesi/i);
    if (ocupField) {
      state.pending.set(ocupField.id, { valor: ocupVal, label: "Ocupación" });
      detectedLabels.push(`Ocupación (${ocupVal})`);
    }
  }

  // --- PASO 18: ESCOLARIDAD / ESTUDIOS ---
  const escVal = extractEscolaridad(text);
  if (escVal) {
    const escField = findField(/otros/i, /escolar|estudio/i) || findField(null, /escolar|estudio/i);
    if (escField) {
      state.pending.set(escField.id, { valor: escVal, label: "Escolaridad" });
      detectedLabels.push(`Escolaridad (${escVal})`);
    }
  }

  // --- PASO 19: AGENDA VARIAS CITAS ---
  const citasVal = extractAgendaVariasCitas(text);
  if (citasVal) {
    const citasField = findField(/otros/i, /agenda.*cita|varias.*cita/i) || findField(null, /agenda.*cita|varias.*cita/i);
    if (citasField) {
      state.pending.set(citasField.id, { valor: citasVal, label: "Agenda varias citas" });
      detectedLabels.push(`Agenda varias citas (${citasVal})`);
    }
  }

  // --- PASO 20: OBSERVACIONES ---
  const obsVal = extractObservaciones(text);
  if (obsVal) {
    const obsField = findField(/otros/i, /observaci|nota/i) || findField(null, /observaci|nota/i);
    if (obsField) {
      state.pending.set(obsField.id, { valor: obsVal, label: "Observaciones" });
      detectedLabels.push("Observaciones");
    }
  }

  // RESPUESTA DE MOTOR LOCAL
  if (detectedLabels.length > 0) {
    renderPending();
    speak("Listo.");
    setStatus(`Campos listos: ${detectedLabels.join(", ")}. Di "confirmar" para llenar en Smile.`);
    return;
  }

  if (!s.geminiApiKey) {
    setStatus("Escuchando… (Conecta tu clave de Google Gemini para filtrado inteligente)");
  } else {
    setStatus("Escuchando dictado clínico…");
  }
}

/* ---------- Propuesta de llenado en el panel ---------- */
function renderPending() {
  const box = $("pending");
  if (!box) return;
  box.innerHTML = "";

  if (!state.pending.size) {
    box.className = "empty";
    box.textContent = "Esperando dictado (ej: “DNI 72 73 62 89”, “fecha de nacimiento 22 02 2006”)…";
  } else {
    box.className = "";
  }

  for (const [id, v] of state.pending) {
    const f = state.fields.find((x) => x.id === id);
    if (!f) continue;
    const d = document.createElement("div");
    d.className = "item";
    const long = f.tipo === "textarea" || f.tipo === "richtext" || v.valor.length > 60;
    d.innerHTML = `<label></label>${long ? "<textarea rows=3></textarea>" : "<input>"}`;
    d.querySelector("label").textContent = (f.etiqueta || "(campo)") + (f.seccion ? " — " + f.seccion : "");
    const inp = d.querySelector("input,textarea");
    inp.value = v.valor;
    inp.oninput = () => (v.valor = inp.value);
    box.appendChild(d);
  }

  if ($("count")) $("count").textContent = state.pending.size ? `(${state.pending.size})` : "";
}

function discard() {
  state.pending.clear();
  if (state.lockedFields) state.lockedFields.clear();
  state.currentPatient = null;
  if ($("result")) $("result").innerHTML = "";
  renderPending();
}

/* ---------- Aplicar datos en Smile ---------- */
async function apply() {
  if (!state.pending.size) {
    setStatus("No hay datos pendientes para llenar en Smile. Dicta datos o un DNI.");
    const resultBox = $("result");
    if (resultBox) {
      resultBox.innerHTML = `<div class="empty" style="color:var(--apple-secondary);">No hay campos pendientes en la propuesta. Habla al micrófono o dicta un DNI.</div>`;
    }
    const pBox = $("pending");
    if (pBox) {
      pBox.style.transition = "background 0.2s";
      pBox.style.background = "rgba(0, 113, 227, 0.08)";
      setTimeout(() => { pBox.style.background = ""; }, 400);
    }
    return;
  }
  if (!(await checkSite())) return;

  const byFrame = new Map();
  for (const [id, v] of state.pending) {
    const f = state.fields.find((x) => x.id === id);
    if (!f) continue;
    if (!byFrame.has(f.frameId)) byFrame.set(f.frameId, []);
    byFrame.get(f.frameId).push({
      key: f.key,
      valor: v.valor,
      id,
      domId: f.domId,
      name: f.name,
      etiqueta: f.etiqueta,
      seccion: f.seccion,
      tipo: f.tipo,
    });
  }

  const ok = [], fail = [];
  for (const [frameId, items] of byFrame) {
    try {
      const [r] = await chrome.scripting.executeScript({
        target: { tabId: state.tab.id, frameIds: [frameId] },
        func: dentaiFill,
        args: [items],
      });
      (r.result || []).forEach((x, i) => (x.ok ? ok : fail).push({ ...x, id: items[i].id }));
    } catch (e) {
      items.forEach((i) => fail.push({ id: i.id, motivo: e.message }));
    }
  }

  const name = (id) => (state.fields.find((x) => x.id === id) || {}).etiqueta || "campo";
  const resultBox = $("result");
  if (resultBox) {
    resultBox.innerHTML =
      (ok.length ? `<div class="good">${ok.length} campo(s) llenado(s) en Smile exitosamente.</div>` : "") +
      fail.map((f) => `<div class="fail">${name(f.id)}: ${f.motivo || "falló"}</div>`).join("");
  }

  if (ok.length > 0) {
    speak("Llenado.");
    setStatus(`${ok.length} campo(s) llenado(s) en Smile exitosamente.`);
    state.pending.clear();
    renderPending();
  } else {
    speak("Error.");
    setStatus("Revisa los campos en pantalla.");
  }

  const s = await getSettings();
  await addLog({
    fecha: new Date().toISOString(),
    operador: s.operador,
    modo: state.mode,
    sitio: state.tab ? new URL(state.tab.url).host : "",
    ok: ok.length,
    fallidos: fail.length,
    latenciaMs: state.lastLatency || 0,
  });
}

/* ---------- Reconocimiento de Voz Continuo (Web Speech API) con Anti-Eco ---------- */
function initWebSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    banner("Tu navegador no soporta Web Speech API. Usa Google Chrome.", "err");
    return false;
  }

  if (state.recognition) {
    try { state.recognition.abort(); } catch (e) {}
  }

  const r = new SpeechRecognition();
  r.continuous = true;
  r.interimResults = true;
  r.lang = "es-PE";

  r.onstart = () => {
    state.listening = true;
    updatePulseBadge(true, state.paused);
    setStatus("Manos libres activo. Escuchando…");
  };

  r.onresult = (ev) => {
    let interim = "";
    let final = "";
    for (let i = ev.resultIndex; i < ev.results.length; ++i) {
      if (ev.results[i].isFinal) final += ev.results[i][0].transcript;
      else interim += ev.results[i][0].transcript;
    }

    if (interim) {
      if (typeof OrbVisualizer !== "undefined") OrbVisualizer.setHearing(true, 0.9);
      const cleanInterim = interim.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (!cleanInterim.startsWith("abriendo") && !(state.isSpeakingTTS && cleanInterim === state.speakingText)) {
        addTranscript(interim, true);
        const mBar = $("meterBar");
        if (mBar) mBar.style.width = "70%";
      }

      // DESPLAZAMIENTO INSTANTÁNEO POR VOZ (Ultra sensible y baja latencia en palabras cortas de scroll)
      const now = Date.now();
      if ((now - (state.lastInstantScrollTime || 0)) > 600) {
        if (/^(?:sube|subir|suba|suve|tube|tuve|arriba)$/i.test(cleanInterim)) {
          state.lastInstantScrollTime = now;
          scrollPage("up", 380);
        } else if (/^(?:baja|bajar|baje|abajo)$/i.test(cleanInterim)) {
          state.lastInstantScrollTime = now;
          scrollPage("down", 380);
        }
      }
    }

    if (final) {
      if (typeof OrbVisualizer !== "undefined") OrbVisualizer.setHearing(true, 0.75);
      const mBar = $("meterBar");
      if (mBar) mBar.style.width = "25%";

      const cleanFinal = final.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();

      // Si el desplazamiento instantáneo ya ejecutó este scroll hace menos de 800ms, evitar repetición innecesaria
      const now = Date.now();
      if ((now - (state.lastInstantScrollTime || 0)) < 800 && /^(?:sube|subir|suba|suve|tube|tuve|arriba|baja|bajar|baje|abajo)$/i.test(cleanFinal)) {
        return;
      }

      // ANTI-ECO TOTAL:
      // Si el texto final coincide con lo que el asistente acaba de decir por TTS o es un eco residual de navegación
      const timeSinceSpeech = Date.now() - (state.lastSpeechTime || 0);
      if (timeSinceSpeech < 2500 && state.speakingText) {
        if (cleanFinal === state.speakingText ||
            cleanFinal.includes(state.speakingText) ||
            state.speakingText.includes(cleanFinal) ||
            cleanFinal.startsWith("abriendo")) {
          console.log("Anti-echo: Descartado eco de TTS ->", final);
          return;
        }
      }

      // Si el asistente está hablando y el texto es estrictamente una de las palabras que dice el asistente, ignorar
      if (state.isSpeakingTTS && /^(?:listo|anotado|llenado|borrado|abriendo|error)\.?$/i.test(final.trim())) {
        console.log("Anti-echo: Descartado eco de TTS ->", final.trim());
        return;
      }

      handleText(final);
    }
  };

  r.onerror = (ev) => {
    console.warn("Speech recognition error:", ev.error);
    state.listening = false;
    updatePulseBadge(false, state.paused);
    if (ev.error === "not-allowed") {
      banner(`Permiso de micrófono requerido. <a href="mic.html" target="_blank" style="text-decoration:underline;font-weight:bold;">Conceder permiso aquí ↗</a>`, "err");
    } else if (!state.paused && ev.error !== "aborted") {
      setTimeout(() => {
        startListening();
      }, 300);
    }
  };

  r.onend = () => {
    state.listening = false;
    updatePulseBadge(false, state.paused);
    if (!state.paused) {
      setTimeout(() => {
        startListening();
      }, 200);
    }
  };

  state.recognition = r;
  return true;
}

function startListening() {
  if (state.listening && !state.paused) return;
  if (!state.recognition) initWebSpeech();
  try {
    state.recognition.start();
  } catch (e) {
    initWebSpeech();
    try {
      state.recognition.start();
    } catch (err) {
      console.warn("No se pudo iniciar reconocimiento:", err);
    }
  }
}

function setMode(m) {
  state.mode = m;
  const tag = $("modeTag");
  if (tag) tag.textContent = m === "write" ? "Modo: Redactar" : "Modo: Llenar";
}

/* ---------- Inicialización ---------- */
function init() {
  try {
    if (typeof OrbVisualizer !== "undefined") {
      OrbVisualizer.init();
    }

    const optLink = $("optLink");
    if (optLink) optLink.onclick = (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); };

    const applyBtn = $("applyBtn");
    if (applyBtn) {
      applyBtn.onclick = async () => {
        applyBtn.style.opacity = "0.7";
        try {
          await apply();
        } finally {
          applyBtn.style.opacity = "1";
        }
      };
    }

    const discardBtn = $("discardBtn");
    if (discardBtn) {
      discardBtn.onclick = () => {
        discard();
        speak("Borrado.");
        setStatus("Propuesta descartada.");
      };
    }

    // Control manual del micrófono en el badge pulsante
    const pulseBadge = $("pulseBadge");
    if (pulseBadge) {
      pulseBadge.style.cursor = "pointer";
      pulseBadge.title = "Clic para pausar o reactivar el micrófono";
      pulseBadge.onclick = () => {
        if (!state.listening) {
          startListening();
        } else {
          state.paused = !state.paused;
          updatePulseBadge(state.listening, state.paused);
          if (state.paused) {
            try { state.recognition.stop(); } catch (e) {}
            setStatus("Micrófono pausado. Clic para reactivar.");
          } else {
            try { state.recognition.start(); } catch (e) {}
            setStatus("Manos libres activo. Escuchando…");
          }
        }
      };
    }

    // Control rápido para silenciar / activar respuestas de voz del asistente
    const voiceToggleBtn = $("voiceToggleBtn");
    if (voiceToggleBtn) {
      const updateVoiceUI = (active) => {
        const textSpan = $("voiceBtnText");
        if (textSpan) textSpan.textContent = active ? "Voz activa" : "Silencio";
        voiceToggleBtn.className = "apple-pill-btn" + (active ? " active" : "");
        voiceToggleBtn.title = active ? "Respuestas habladas activas. Clic para silenciar asistente." : "Asistente silenciado. Clic para activar respuestas habladas.";
      };

      getSettings().then((s) => updateVoiceUI(s.voiceFeedback !== false)).catch(console.warn);

      voiceToggleBtn.onclick = async () => {
        const curr = await getSettings();
        const next = !curr.voiceFeedback;
        await chrome.storage.local.set({ voiceFeedback: next });
        updateVoiceUI(next);
        if (next) {
          speak("Listo.");
          setStatus("Respuestas de voz activadas.");
        } else {
          window.speechSynthesis.cancel();
          setStatus("Asistente silenciado.");
        }
      };
    }

    // Conexión rápida con Google Gemini API
    const saveKeyBtn = $("saveKeyBtn");
    const editKeyBtn = $("editKeyBtn");
    const geminiQuickKey = $("geminiQuickKey");
    const aiConfigBox = $("aiConfigBox");
    const aiConnectedBox = $("aiConnectedBox");

    if (saveKeyBtn && geminiQuickKey) {
      saveKeyBtn.onclick = async () => {
        const key = geminiQuickKey.value.trim();
        if (!key) {
          alert("Pega tu clave gratuita de Google Gemini (inicia con AIzaSy...)");
          geminiQuickKey.focus();
          return;
        }
        await chrome.storage.local.set({ geminiApiKey: key, aiProvider: "gemini" });
        if (aiConfigBox) aiConfigBox.classList.add("hidden");
        if (aiConnectedBox) aiConnectedBox.classList.remove("hidden");
        speak("IA Conectada.");
        setStatus("Gemini conectado. Filtrado y extracción inteligente activos.");
      };

      geminiQuickKey.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          saveKeyBtn.click();
        }
      });
    }

    if (editKeyBtn) {
      editKeyBtn.onclick = () => {
        if (aiConnectedBox) aiConnectedBox.classList.add("hidden");
        if (aiConfigBox) aiConfigBox.classList.remove("hidden");
        if (geminiQuickKey) geminiQuickKey.focus();
      };
    }

    // Iniciar reconocimiento de voz de inmediato
    initWebSpeech();
    startListening();

    // Cargar ajustes y actualizar estado de IA Gemini
    getSettings().then((s) => {
      if (s.geminiApiKey) {
        if (aiConfigBox) aiConfigBox.classList.add("hidden");
        if (aiConnectedBox) aiConnectedBox.classList.remove("hidden");
        if (geminiQuickKey) geminiQuickKey.value = s.geminiApiKey;
      } else {
        if (aiConfigBox) aiConfigBox.classList.remove("hidden");
        if (aiConnectedBox) aiConnectedBox.classList.add("hidden");
      }
    }).catch(console.warn);

    // Conectar eventos de pestañas
    if (chrome.tabs && chrome.tabs.onActivated) {
      chrome.tabs.onActivated.addListener(() => { checkSite().then((ok) => ok && scan()).catch(console.warn); });
    }
    if (chrome.tabs && chrome.tabs.onUpdated) {
      chrome.tabs.onUpdated.addListener((id, info) => {
        if (info.status === "complete" && state.tab && id === state.tab.id) {
          checkSite().then((ok) => ok && scan()).catch(console.warn);
        }
      });
    }

    // Escanear pestaña en segundo plano
    checkSite().then(async (ok) => {
      if (ok) await scan();
    }).catch(console.warn);

  } catch (err) {
    console.error("DentAI Init Error:", err);
    setStatus("Error al iniciar: " + err.message);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
