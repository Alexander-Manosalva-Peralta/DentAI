/* DentAI – Reconocimiento de Voz Continuo (core/voice.js)
   Integración con Web Speech API (es-PE), Voice Activity Detection (VAD),
   detección de desplazamiento instantáneo y filtro acústico anti-eco */

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
          if (typeof scrollPage === "function") scrollPage("up", 380);
        } else if (/^(?:baja|bajar|baje|abajo)$/i.test(cleanInterim)) {
          state.lastInstantScrollTime = now;
          if (typeof scrollPage === "function") scrollPage("down", 380);
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

      if (typeof handleText === "function") {
        handleText(final);
      }
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
