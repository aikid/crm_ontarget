const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333").replace(/\/$/, "");

type AudioBridgeOptions = {
  onError?: (message: string) => void;
  onEnded?: () => void;
};

export class ThreeCxAudioBridge {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private socket: WebSocket | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private capture: AudioWorkletNode | null = null;
  private silentGain: GainNode | null = null;
  private nextPlaybackTime = 0;
  private remainder = new Uint8Array(0);
  private connectedCallId: string | null = null;
  private options: AudioBridgeOptions;

  constructor(options: AudioBridgeOptions = {}) {
    this.options = options;
  }

  async prepare() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("O navegador não permite acesso ao microfone.");
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });
    this.context = new AudioContext({ latencyHint: "interactive" });
    await this.context.resume();
  }

  async connect(callId: string) {
    if (this.connectedCallId === callId) return;
    if (!this.context || !this.stream) await this.prepare();
    const protocol = API_URL.startsWith("https:") ? "wss:" : "ws:";
    const api = new URL(API_URL);
    const socketUrl = `${protocol}//${api.host}${api.pathname.replace(/\/$/, "")}/api/telephony/calls/${encodeURIComponent(callId)}/media`;

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(socketUrl);
      socket.binaryType = "arraybuffer";
      this.socket = socket;
      let settled = false;
      const fail = (message: string) => {
        this.options.onError?.(message);
        if (!settled) { settled = true; reject(new Error(message)); }
      };
      socket.onerror = () => fail("Não foi possível conectar o áudio da ligação.");
      socket.onclose = (event) => {
        if (!settled) fail(event.reason || "A conexão de áudio foi encerrada.");
      };
      socket.onmessage = (event) => {
        if (typeof event.data === "string") {
          const message = JSON.parse(event.data) as { type: string; message?: string };
          if (message.type === "ready") {
            void this.startCapture().then(() => {
              this.connectedCallId = callId;
              if (!settled) { settled = true; resolve(); }
            }).catch((error) => fail(error instanceof Error ? error.message : "Falha ao abrir o microfone."));
          }
          if (message.type === "error") fail(message.message || "Falha no áudio da 3CX.");
          if (message.type === "ended") this.options.onEnded?.();
          return;
        }
        this.playPcm(new Uint8Array(event.data as ArrayBuffer));
      };
    });
  }

  private async startCapture() {
    if (!this.context || !this.stream || this.capture) return;
    const processorSource = `
      class OnTargetPcmCapture extends AudioWorkletProcessor {
        constructor() { super(); this.phase = 0; this.samples = []; }
        process(inputs) {
          const input = inputs[0] && inputs[0][0];
          if (!input) return true;
          for (let i = 0; i < input.length; i++) {
            this.phase += 8000;
            if (this.phase >= sampleRate) {
              this.phase -= sampleRate;
              const value = Math.max(-1, Math.min(1, input[i]));
              this.samples.push(value < 0 ? value * 32768 : value * 32767);
              if (this.samples.length === 160) {
                const pcm = new Int16Array(this.samples);
                this.port.postMessage(pcm.buffer, [pcm.buffer]);
                this.samples = [];
              }
            }
          }
          return true;
        }
      }
      registerProcessor("ontarget-pcm-capture", OnTargetPcmCapture);
    `;
    const moduleUrl = URL.createObjectURL(new Blob([processorSource], { type: "text/javascript" }));
    try { await this.context.audioWorklet.addModule(moduleUrl); } finally { URL.revokeObjectURL(moduleUrl); }
    this.source = this.context.createMediaStreamSource(this.stream);
    this.capture = new AudioWorkletNode(this.context, "ontarget-pcm-capture");
    this.silentGain = this.context.createGain();
    this.silentGain.gain.value = 0;
    this.capture.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(event.data);
    };
    this.source.connect(this.capture).connect(this.silentGain).connect(this.context.destination);
  }

  private playPcm(chunk: Uint8Array) {
    if (!this.context) return;
    const joined = new Uint8Array(this.remainder.length + chunk.length);
    joined.set(this.remainder);
    joined.set(chunk, this.remainder.length);
    const usable = joined.length - (joined.length % 2);
    this.remainder = joined.slice(usable);
    if (!usable) return;

    const view = new DataView(joined.buffer, joined.byteOffset, usable);
    const audioBuffer = this.context.createBuffer(1, usable / 2, 8000);
    const channel = audioBuffer.getChannelData(0);
    for (let index = 0; index < channel.length; index++) channel[index] = view.getInt16(index * 2, true) / 32768;
    const player = this.context.createBufferSource();
    player.buffer = audioBuffer;
    player.connect(this.context.destination);
    const startAt = Math.max(this.context.currentTime + 0.02, this.nextPlaybackTime);
    player.start(startAt);
    this.nextPlaybackTime = startAt + audioBuffer.duration;
  }

  close() {
    this.connectedCallId = null;
    this.socket?.close(1000, "Chamada encerrada");
    this.socket = null;
    this.capture?.disconnect();
    this.source?.disconnect();
    this.silentGain?.disconnect();
    this.capture = null;
    this.source = null;
    this.silentGain = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    void this.context?.close();
    this.context = null;
    this.remainder = new Uint8Array(0);
    this.nextPlaybackTime = 0;
  }
}
