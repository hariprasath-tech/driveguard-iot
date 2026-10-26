class EmergencySirenSynthesizer {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private isPlaying = false;
  private lfo: OscillatorNode | null = null;

  public start() {
    if (this.isPlaying) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Main siren oscillator
      this.osc = this.ctx.createOscillator();
      this.osc.type = 'sawtooth';
      this.osc.frequency.setValueAtTime(800, this.ctx.currentTime);

      // Low frequency oscillator for pitch modulation (European siren dual-tone oscillation)
      this.lfo = this.ctx.createOscillator();
      this.lfo.type = 'sine';
      this.lfo.frequency.setValueAtTime(1.8, this.ctx.currentTime); // 1.8 Hz sweep

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(350, this.ctx.currentTime); // modulate ±350 Hz

      this.lfo.connect(lfoGain);
      lfoGain.connect(this.osc.frequency);

      // Master gain node
      this.gain = this.ctx.createGain();
      this.gain.gain.setValueAtTime(0.3, this.ctx.currentTime);

      this.osc.connect(this.gain);
      this.gain.connect(this.ctx.destination);

      this.osc.start();
      this.lfo.start();
      this.isPlaying = true;
    } catch (err) {
      console.warn('AudioContext failed to start (interaction needed):', err);
    }
  }

  public stop() {
    if (!this.isPlaying) return;

    try {
      if (this.osc) {
        this.osc.stop();
        this.osc.disconnect();
      }
      if (this.lfo) {
        this.lfo.stop();
        this.lfo.disconnect();
      }
      if (this.ctx) {
        this.ctx.close();
      }
    } catch (err) {
      console.warn('Error stopping siren audio:', err);
    } finally {
      this.osc = null;
      this.lfo = null;
      this.gain = null;
      this.ctx = null;
      this.isPlaying = false;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const sirenSynthesizer = new EmergencySirenSynthesizer();
