import { Inviter, Registerer, RegistererState, SessionState, UserAgent } from "sip.js";

export type AsteriskSipSession = {
  webSocketUrl: string;
  sipDomain: string;
  extension: string;
  password: string;
  targetExtension: string;
  shared: boolean;
};

type CallCallbacks = {
  onEstablishing?: () => void;
  onEstablished?: () => void;
  onTerminated?: () => void;
  onError?: (message: string) => void;
};

function mediaErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Nenhum microfone foi encontrado. Conecte ou habilite um dispositivo de entrada de áudio e tente novamente.";
  }
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "O acesso ao microfone foi bloqueado. Permita o microfone nas configurações do navegador.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "O microfone está sendo usado ou bloqueado por outro aplicativo. Feche o outro aplicativo e tente novamente.";
  }
  if (name === "OverconstrainedError") {
    return "O microfone disponível não atende à configuração de áudio solicitada.";
  }
  return error instanceof Error ? error.message : "Não foi possível acessar o microfone.";
}

export class AsteriskSipClient {
  private agent: UserAgent | null = null;
  private registerer: Registerer | null = null;
  private inviter: Inviter | null = null;
  private registered = false;
  private fingerprint = "";
  private remoteAudio: HTMLAudioElement | null = null;
  private remoteStream: MediaStream | null = null;
  private remotePeerConnection: RTCPeerConnection | null = null;
  private remoteTrackListener: ((event: RTCTrackEvent) => void) | null = null;

  prepareAudioOutput() {
    this.ensureRemoteAudio();
  }

  async prepareMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("O navegador não permite acesso ao microfone.");
    if (navigator.mediaDevices.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (!devices.some((device) => device.kind === "audioinput")) {
        throw new Error("Nenhum microfone foi encontrado. Conecte ou habilite um dispositivo de entrada de áudio e tente novamente.");
      }
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      throw new Error(mediaErrorMessage(error));
    }
  }

  async connect(config: AsteriskSipSession) {
    const fingerprint = `${config.webSocketUrl}|${config.sipDomain}|${config.extension}`;
    if (this.agent && this.registered && this.fingerprint === fingerprint) return;
    await this.dispose();

    const uri = UserAgent.makeURI(`sip:${config.extension}@${config.sipDomain}`);
    if (!uri) throw new Error("Configuração do ramal SIP inválida.");
    const agent = new UserAgent({
      uri,
      transportOptions: { server: config.webSocketUrl },
      authorizationUsername: config.extension,
      authorizationPassword: config.password,
      displayName: `OnTarget ${config.extension}`,
      logLevel: "warn",
      delegate: {
        onDisconnect: () => { this.registered = false; },
      },
    });
    const registerer = new Registerer(agent, { expires: 300 });
    this.agent = agent;
    this.registerer = registerer;
    this.fingerprint = fingerprint;

    await agent.start();
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        registerer.stateChange.removeListener(listener);
        reject(new Error("O Asterisk não confirmou o registro do ramal."));
      }, 12_000);
      const listener = (state: RegistererState) => {
        if (state === RegistererState.Registered) {
          window.clearTimeout(timeout);
          registerer.stateChange.removeListener(listener);
          this.registered = true;
          resolve();
        } else if (state === RegistererState.Terminated) {
          window.clearTimeout(timeout);
          registerer.stateChange.removeListener(listener);
          reject(new Error("O registro SIP foi encerrado pelo Asterisk."));
        }
      };
      registerer.stateChange.addListener(listener);
      void registerer.register().catch((error) => {
        window.clearTimeout(timeout);
        registerer.stateChange.removeListener(listener);
        reject(error);
      });
    });
  }

  async startCall(config: AsteriskSipSession, callbacks: CallCallbacks = {}) {
    await this.connect(config);
    if (!this.agent || !this.registered) throw new Error("Ramal SIP não registrado.");
    if (this.inviter) throw new Error("Já existe uma chamada SIP em andamento.");
    const target = UserAgent.makeURI(`sip:${config.targetExtension}@${config.sipDomain}`);
    if (!target) throw new Error("Extensão interna de telefonia inválida.");

    const inviter = new Inviter(this.agent, target, {
      sessionDescriptionHandlerOptions: { constraints: { audio: true, video: false } },
    });
    this.inviter = inviter;
    inviter.stateChange.addListener((state) => {
      if (state === SessionState.Establishing) callbacks.onEstablishing?.();
      if (state === SessionState.Established) {
        void this.attachRemoteAudio(inviter, callbacks.onError).catch((error) => callbacks.onError?.(error.message));
        callbacks.onEstablished?.();
      }
      if (state === SessionState.Terminated) {
        this.clearRemoteAudio();
        if (this.inviter === inviter) this.inviter = null;
        callbacks.onTerminated?.();
      }
    });
    try {
      await inviter.invite();
      // O receiver costuma ser criado antes de a sessão chegar a Established.
      // Conectá-lo aqui evita perder o primeiro evento `track` do WebRTC.
      await this.attachRemoteAudio(inviter, callbacks.onError);
    } catch (error) {
      if (this.inviter === inviter) this.inviter = null;
      throw new Error(mediaErrorMessage(error));
    }
  }

  private ensureRemoteAudio() {
    if (this.remoteAudio) return this.remoteAudio;
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.playsInline = true;
    audio.muted = false;
    audio.volume = 1;
    audio.setAttribute("aria-hidden", "true");
    audio.style.position = "fixed";
    audio.style.width = "1px";
    audio.style.height = "1px";
    audio.style.opacity = "0";
    audio.style.pointerEvents = "none";
    document.body.appendChild(audio);
    this.remoteAudio = audio;
    return audio;
  }

  private async playRemoteAudio(onError?: (message: string) => void) {
    const audio = this.ensureRemoteAudio();
    if (!this.remoteStream || this.remoteStream.getAudioTracks().length === 0) return;
    if (audio.srcObject !== this.remoteStream) audio.srcObject = this.remoteStream;
    try {
      await audio.play();
    } catch (error) {
      const message = error instanceof DOMException && error.name === "NotAllowedError"
        ? "O navegador bloqueou o áudio da ligação. Clique novamente em Ligar com Onvox para liberar a reprodução."
        : `Não foi possível reproduzir o áudio recebido: ${error instanceof Error ? error.message : "erro desconhecido"}.`;
      onError?.(message);
      throw new Error(message);
    }
  }

  private addRemoteTrack(track: MediaStreamTrack, onError?: (message: string) => void) {
    if (track.kind !== "audio") return;
    const stream = this.remoteStream || new MediaStream();
    this.remoteStream = stream;
    if (!stream.getTracks().some((item) => item.id === track.id)) stream.addTrack(track);
    track.enabled = true;
    track.addEventListener("unmute", () => { void this.playRemoteAudio(onError).catch(() => undefined); }, { once: true });
    void this.playRemoteAudio(onError).catch(() => undefined);
  }

  private async attachRemoteAudio(inviter: Inviter, onError?: (message: string) => void) {
    const handler = inviter.sessionDescriptionHandler as { peerConnection?: RTCPeerConnection } | undefined;
    const peerConnection = handler?.peerConnection;
    if (!peerConnection) throw new Error("Canal de áudio WebRTC indisponível.");

    this.ensureRemoteAudio();
    if (this.remotePeerConnection !== peerConnection) {
      if (this.remotePeerConnection && this.remoteTrackListener) {
        this.remotePeerConnection.removeEventListener("track", this.remoteTrackListener);
      }
      this.remotePeerConnection = peerConnection;
      this.remoteTrackListener = (event: RTCTrackEvent) => {
        this.addRemoteTrack(event.track, onError);
        for (const stream of event.streams) {
          for (const track of stream.getAudioTracks()) this.addRemoteTrack(track, onError);
        }
      };
      peerConnection.addEventListener("track", this.remoteTrackListener);
    }

    for (const receiver of peerConnection.getReceivers()) {
      if (receiver.track) this.addRemoteTrack(receiver.track, onError);
    }
    await this.playRemoteAudio(onError);
  }

  async endCall() {
    const inviter = this.inviter;
    if (!inviter) return;
    try {
      if (inviter.state === SessionState.Established) await inviter.bye();
      else if (inviter.state === SessionState.Establishing) await inviter.cancel();
    } finally {
      this.clearRemoteAudio();
      if (this.inviter === inviter) this.inviter = null;
    }
  }

  private clearRemoteAudio() {
    if (this.remotePeerConnection && this.remoteTrackListener) {
      this.remotePeerConnection.removeEventListener("track", this.remoteTrackListener);
    }
    this.remotePeerConnection = null;
    this.remoteTrackListener = null;
    this.remoteStream = null;
    if (!this.remoteAudio) return;
    this.remoteAudio.pause();
    this.remoteAudio.srcObject = null;
    this.remoteAudio.remove();
    this.remoteAudio = null;
  }

  async dispose() {
    await this.endCall().catch(() => undefined);
    const registerer = this.registerer;
    const agent = this.agent;
    this.registerer = null;
    this.agent = null;
    this.registered = false;
    this.fingerprint = "";
    if (registerer) await registerer.unregister().catch(() => undefined);
    if (agent) await agent.stop().catch(() => undefined);
    this.clearRemoteAudio();
  }
}
