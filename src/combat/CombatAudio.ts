/** Original synthesized effects, no external audio files or downloads. */
export class CombatAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private noise?: AudioBuffer;
  volume = 0.35;
  start() {
    try {
      if (!this.context) {
        this.context = new AudioContext(); this.master = this.context.createGain(); this.master.connect(this.context.destination);
        this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
        const samples = this.noise.getChannelData(0); for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      void this.context.resume();
    } catch { /* Silent mode remains playable in restricted embedded browsers. */ }
  }
  play(kind: 'shot' | 'rocket' | 'explosion' | 'reload' | 'hit', distance = 0) {
    const ctx = this.context; if (!ctx || !this.master || !this.noise || ctx.state !== 'running') return;
    this.master.gain.value = this.volume;
    const now = ctx.currentTime, duration = kind === 'explosion' ? 0.7 : kind === 'rocket' ? 0.35 : 0.1;
    const source = ctx.createBufferSource(); source.buffer = this.noise;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = kind === 'explosion' ? 460 : kind === 'reload' ? 3400 : 1900;
    const gain = ctx.createGain(); const loudness = (kind === 'explosion' ? 1 : kind === 'shot' ? 0.35 : 0.18) / (1 + distance / 25);
    gain.gain.setValueAtTime(loudness, now); gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start(now); source.stop(now + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  dispose() { void this.context?.close(); }
}
