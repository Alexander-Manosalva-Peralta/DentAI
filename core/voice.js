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
    if (state.paused) {
      setStatus("Micrófono inactivo. Di 'activar' o 'continuar' para reanudar.");
    } else {
      setStatus("Manos libres activo. Escuchando…");
    }
  };

  r.onresult = (ev) => {
    // Si el micrófono está inactivo:
    if (state.paused) {
      let final = "";
      for (let i = ev.resultIndex; i < ev.results.length; ++i) {
        if (ev.results[i].isFinal) final += ev.results[i][0].transcript;
      }
      if (final) {
        const cleanFinal = final.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
        // Solo despierta con "activar" o "continuar"
        const isWakeUp = /^(?:activar(?:\s+(?:el\s+)?micr[oó]fono|\s+(?:el\s+)?audio)?|activa|continuar|reanudar|empezar)$/i.test(cleanFinal);
        if (isWakeUp) {
          state.paused = false;
          updatePulseBadge(true, false);
          setStatus("Escucha activa. Escuchando…");
          if (typeof speak === "function") speak("Micrófono activo.");
          addTranscript(final);
        } else {
          console.log("Micrófono inactivo: ignorando orden ->", final.trim());
        }
      }
      return;
    }

    let interim = "";
    let final = "";
    for (let i = ev.resultIndex; i < ev.results.length; ++i) {
      if (ev.results[i].isFinal) final += ev.results[i][0].transcript;
      else interim += ev.results[i][0].transcript;
    }

    if (interim) {
      // Ignorar resultados provisionales si el asistente está hablando para evitar eco
      if (state.isSpeakingTTS) return;

      if (typeof OrbVisualizer !== "undefined") OrbVisualizer.setHearing(true, 0.9);
      const cleanInterim = interim.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (!cleanInterim.startsWith("abriendo") && !(state.isSpeakingTTS && cleanInterim === state.speakingText)) {
        const dispInterim = interim.replace(/\b([a-záéíóúñ]{1,4})\b(?:\s+\1\b){2,}/gi, "");
        addTranscript(dispInterim, true);
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
      // ANTI-ECO TOTAL:
      // 1. Si el asistente está hablando activamente por los altavoces, ignorar cualquier audio captado por el micrófono
      const questionShortcut = typeof anamnesisQuestionShortcut === "function"
        && anamnesisQuestionShortcut(final) !== null
        && state.fields.some((f) => f.contexto === "anamnesis")
        && !state.anamnesisAwaiting?.literal && !state.anamnesisAwaiting?.numeric;
      if (state.isSpeakingTTS && !questionShortcut) {
        console.log("Anti-echo: Audio captado mientras el asistente habla -> descartado:", final.trim());
        return;
      }

      if (typeof OrbVisualizer !== "undefined") OrbVisualizer.setHearing(true, 0.75);
      const mBar = $("meterBar");
      if (mBar) mBar.style.width = "25%";

      const cleanFinal = final.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();

      // Si el desplazamiento instantáneo ya ejecutó este scroll hace menos de 800ms, evitar repetición innecesaria
      const now = Date.now();
      if ((now - (state.lastInstantScrollTime || 0)) < 800 && /^(?:sube|subir|suba|suve|tube|tuve|arriba|baja|bajar|baje|abajo)$/i.test(cleanFinal)) {
        return;
      }

      // 2. Si el texto final coincide con lo que el asistente acaba de decir por TTS o es un eco residual de navegación
      const timeSinceSpeech = Date.now() - (state.lastSpeechTime || 0);
      if (timeSinceSpeech < 1500) {
        if (/^(?:abierto|seleccionado|listo|anotado|llenado|borrado|abriendo|guardando|formulario limpio|error)\.?$/i.test(cleanFinal) ||
            cleanFinal === state.speakingText ||
            (cleanFinal.length >= 12 && cleanFinal.split(/\s+/).length >= 3 && state.speakingText
              && (cleanFinal.includes(state.speakingText) || state.speakingText.includes(cleanFinal)))) {
          console.log("Anti-echo: Descartado eco residual de TTS ->", final.trim());
          return;
        }
      }

      if (typeof handleText === "function") {
        let cleanText = final.replace(/\b([a-záéíóúñ]{1,4})\b(?:\s+\1\b){2,}/gi, "");
        cleanText = cleanText.replace(/^(?:\s*(?:ta|te|ti|to|tu|pa|pe|eh|em|um|uh|ah)\b)+/gi, "").trim();
        handleText(cleanText || final);
      }
    }
  };

  r.onerror = (ev) => {
    console.warn("Speech recognition error:", ev.error);
    state.listening = false;
    updatePulseBadge(false, state.paused);
    if (ev.error === "not-allowed") {
      banner(`Permiso de micrófono requerido. <a href="mic.html" target="_blank" style="text-decoration:underline;font-weight:bold;">Conceder permiso aquí ↗</a>`, "err");
    } else if (ev.error === "audio-capture") {
      banner(`No se detectó audio en el micrófono. Verifica que el micrófono USB esté encendido (luz azul fija) y seleccionado en chrome://settings/content/microphone`, "err");
    } else if (ev.error !== "aborted") {
      setTimeout(() => {
        startListening();
      }, 300);
    }
  };

  r.onend = () => {
    state.listening = false;
    updatePulseBadge(false, state.paused);
    setTimeout(() => {
      startListening();
    }, 200);
  };

  // Escuchar conexión y desconexión de micrófonos USB (como Hippo M31)
  if (typeof navigator !== "undefined" && navigator.mediaDevices && !state.hasDeviceChangeListener) {
    state.hasDeviceChangeListener = true;
    navigator.mediaDevices.addEventListener("devicechange", () => {
      console.log("DentAI: Cambio de dispositivo de audio detectado (USB/Bluetooth). Reiniciando escucha...");
      if (state.recognition) {
        try { state.recognition.abort(); } catch (e) {}
      }
      setTimeout(() => {
        initWebSpeech();
        startListening();
      }, 400);
    });
  }

  state.recognition = r;
  return true;
}

function startListening() {
  if (state.listening) return;
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
