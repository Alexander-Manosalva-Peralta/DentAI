/* DentAI – Controlador del Hero Orb Estilo Apple (core/orb.js)
   Gestión de la cara del robot con ojos cápsula, ondas holográficas fluidas
   y ondas acústicas de sonido estilo Apple (iOS 18 / macOS Sequoia). */

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

    // Capa 1: Cinta de onda holográfica volumétrica 3D (Cian - Azul - Violeta - Magenta)
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
