/* DentAI – Síntesis de Voz Inteligente (core/tts.js)
   TTS ultra-corto con filtro anti-eco acústico y coordinación de Hero Orb */

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
        state.lastSpeechTime = Date.now();
        if (typeof OrbVisualizer !== "undefined") OrbVisualizer.setSpeaking(true);
      };

      const finishSpeech = () => {
        state.lastSpeechTime = Date.now();
        if (typeof OrbVisualizer !== "undefined") OrbVisualizer.setSpeaking(false);
        setTimeout(() => {
          state.isSpeakingTTS = false;
        }, 600);
      };

      u.onend = finishSpeech;
      u.onerror = finishSpeech;

      // Respaldo de seguridad para que nunca se quede trabado si onend falla
      setTimeout(() => {
        state.isSpeakingTTS = false;
        if (typeof OrbVisualizer !== "undefined") OrbVisualizer.setSpeaking(false);
      }, 5000);

      window.speechSynthesis.speak(u);
    } catch (e) {
      state.isSpeakingTTS = false;
      if (typeof OrbVisualizer !== "undefined") OrbVisualizer.setSpeaking(false);
      console.warn("TTS error:", e);
    }
  });
}
