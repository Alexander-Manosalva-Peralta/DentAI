// Worklet: agrupa muestras Float32 (mono) en bloques de ~100 ms y los envía al panel.
class PcmCapture extends AudioWorkletProcessor {
  constructor() { super(); this.buf = []; this.n = 0; this.target = Math.round(sampleRate / 10); }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      this.buf.push(new Float32Array(ch)); this.n += ch.length;
      if (this.n >= this.target) {
        const out = new Float32Array(this.n); let o = 0;
        for (const b of this.buf) { out.set(b, o); o += b.length; }
        this.port.postMessage(out, [out.buffer]); this.buf = []; this.n = 0;
      }
    }
    return true;
  }
}
registerProcessor("pcm-capture", PcmCapture);
