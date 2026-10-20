const RING_DURATION_MS = 1_000;
const RING_CYCLE_MS = 5_000;

export class RingbackTone {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private cadenceTimer: number | null = null;

  start() {
    if (this.context || typeof window === "undefined") return;

    const context = new AudioContext({ latencyHint: "interactive" });
    const output = context.createGain();
    output.gain.value = 0;
    output.connect(context.destination);

    this.context = context;
    this.output = output;
    this.oscillators = [425, 850].map((frequency, index) => {
      const oscillator = context.createOscillator();
      const level = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      level.gain.value = index === 0 ? 0.72 : 0.08;
      oscillator.connect(level).connect(output);
      oscillator.start();
      return oscillator;
    });

    this.playPulse();
    this.cadenceTimer = window.setInterval(() => this.playPulse(), RING_CYCLE_MS);
    void context.resume().catch(() => this.stop());
  }

  private playPulse() {
    if (!this.context || !this.output) return;
    const now = this.context.currentTime;
    const gain = this.output.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(0, now);
    gain.linearRampToValueAtTime(0.055, now + 0.04);
    gain.setValueAtTime(0.055, now + (RING_DURATION_MS / 1_000) - 0.05);
    gain.linearRampToValueAtTime(0, now + (RING_DURATION_MS / 1_000));
  }

  stop() {
    if (this.cadenceTimer !== null) window.clearInterval(this.cadenceTimer);
    this.cadenceTimer = null;

    const context = this.context;
    const output = this.output;
    const oscillators = this.oscillators;
    this.context = null;
    this.output = null;
    this.oscillators = [];

    if (!context) return;
    const now = context.currentTime;
    if (output) {
      output.gain.cancelScheduledValues(now);
      output.gain.setValueAtTime(output.gain.value, now);
      output.gain.linearRampToValueAtTime(0, now + 0.04);
    }
    oscillators.forEach((oscillator) => oscillator.stop(now + 0.05));
    window.setTimeout(() => void context.close().catch(() => undefined), 70);
  }
}
