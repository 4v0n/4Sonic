export interface HiResTrack {
  id: string;
  url: string;
  duration?: number;
}

export interface ParametricEqBand {
  frequency: number;
  q: number;
  gain: number;
  type?: BiquadFilterType;
}

interface PlayerCallbacks {
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onCanPlay?: (duration: number) => void;
  onProgress?: (time: number, duration: number) => void;
  onError?: (message: string) => void;
}

/**
 * Thin Web Audio based wrapper around an HTMLAudioElement. Streams directly from
 * Navidrome/Subsonic endpoints (hi-res capable when the server provides it) and
 * keeps the graph PEQ-ready by routing through an optional filter chain, a
 * dedicated EQ preamp stage, and the user volume gain node.
 */
export class HiResAudioPlayer {
  private readonly audio: HTMLAudioElement;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private preampNode: GainNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private filterNodes: BiquadFilterNode[] = [];
  private preampDb = 0;
  private callbacks: PlayerCallbacks;
  private progressRaf: number | null = null;
  private hintedDuration = 0;
  private frequencyData: Uint8Array | null = null;
  private timeDomainData: Float32Array | null = null;
  private needsGraphRebuild = false;
  private lastProgressEmit = 0;
  private readonly progressIntervalMs = 80;

  public constructor(callbacks?: PlayerCallbacks) {
    this.callbacks = callbacks ?? {};
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.audio.crossOrigin = "anonymous";
    this.audio.setAttribute("playsinline", "true");
    this.audio.autoplay = false;

    this.audio.addEventListener("play", this.handlePlay);
    this.audio.addEventListener("pause", this.handlePause);
    this.audio.addEventListener("ended", this.handleEnded);
    this.audio.addEventListener("loadedmetadata", this.handleLoadedMetadata);
    this.audio.addEventListener("canplay", this.handleCanPlay);
    this.audio.addEventListener("timeupdate", this.handleTimeUpdate);
    this.audio.addEventListener("error", this.handleError);
  }

  public setCallbacks(callbacks: PlayerCallbacks): void {
    this.callbacks = callbacks;
  }

  public setSource(track: HiResTrack): void {
    this.hintedDuration = track.duration ?? 0;
    this.stopProgressLoop();
    this.audio.pause();

    if (this.audio.src !== track.url) {
      this.audio.src = track.url;
    }

    this.audio.currentTime = 0;
    this.audio.load();
  }

  public async play(): Promise<void> {
    this.ensureContext();
    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    const promise = this.audio.play();
    if (promise) {
      await promise;
    }
  }

  public pause(): void {
    this.audio.pause();
  }

  public stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.stopProgressLoop();
  }

  public seek(time: number): void {
    const duration = this.getDuration();
    const bounded = Math.max(0, Math.min(time, Number.isFinite(duration) ? duration : Number.MAX_SAFE_INTEGER));
    this.audio.currentTime = bounded;
    this.emitProgress(true);
    if (!this.audio.paused) {
      this.ensureProgressLoop();
    }
  }

  public setVolume(value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    this.ensureContext();

    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
      this.gainNode.gain.setTargetAtTime(clamped, this.audioContext.currentTime, 0.01);
    } else {
      this.audio.volume = clamped;
    }
  }

  public setParametricEq(bands: ParametricEqBand[], preampDb: number = 0): void {
    this.ensureContext();
    if (!this.audioContext) {
      return;
    }

    this.filterNodes.forEach((node) => node.disconnect());
    this.filterNodes = bands.map((band) => {
      const node = this.audioContext!.createBiquadFilter();
      node.type = band.type ?? "peaking";
      node.frequency.value = band.frequency;
      node.Q.value = band.q;
      node.gain.value = band.gain;
      return node;
    });
    this.preampDb = preampDb;
    this.applyPreamp();

    this.needsGraphRebuild = true;
    this.rebuildGraph();
  }

  public getDuration(): number {
    if (Number.isFinite(this.audio.duration) && this.audio.duration > 0) {
      return this.audio.duration;
    }
    return this.hintedDuration;
  }

  public getCurrentTime(): number {
    return this.audio.currentTime;
  }

  private ensureContext(): void {
    if (typeof window === "undefined") {
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      return;
    }

    let graphChanged = false;

    if (!this.audioContext) {
      this.audioContext = new AudioCtx({ latencyHint: "playback" });
      graphChanged = true;
    }
    if (!this.gainNode && this.audioContext) {
      this.gainNode = this.audioContext.createGain();
      graphChanged = true;
    }
    if (!this.preampNode && this.audioContext) {
      this.preampNode = this.audioContext.createGain();
      graphChanged = true;
    }
    if (!this.analyserNode && this.audioContext) {
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.minDecibels = -90;
      this.analyserNode.maxDecibels = -10;
      this.analyserNode.smoothingTimeConstant = 0.85;
      this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.timeDomainData = new Float32Array(this.analyserNode.fftSize);
      graphChanged = true;
    }
    if (!this.sourceNode && this.audioContext) {
      this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
      graphChanged = true;
    }

    if (graphChanged || this.needsGraphRebuild) {
      this.rebuildGraph();
      this.needsGraphRebuild = false;
    }
    this.applyPreamp();
  }

  private rebuildGraph(): void {
    if (!this.audioContext || !this.sourceNode || !this.gainNode || !this.preampNode) {
      return;
    }

    this.sourceNode.disconnect();
    this.filterNodes.forEach((node) => node.disconnect());
    this.preampNode.disconnect();
    this.gainNode.disconnect();
    if (this.analyserNode) {
      this.analyserNode.disconnect();
    }

    let head: AudioNode = this.sourceNode;
    const chain: AudioNode[] = [...this.filterNodes, this.preampNode, this.gainNode];
    if (this.analyserNode) {
      chain.push(this.analyserNode);
    }
    chain.push(this.audioContext.destination);
    chain.forEach((node) => {
      head.connect(node);
      head = node;
    });
  }

  private applyPreamp(): void {
    if (!this.preampNode || !this.audioContext) {
      return;
    }
    const linearGain = Math.pow(10, this.preampDb / 20);
    this.preampNode.gain.cancelScheduledValues(this.audioContext.currentTime);
    this.preampNode.gain.setTargetAtTime(linearGain, this.audioContext.currentTime, 0.01);
  }

  private ensureProgressLoop(): void {
    if (this.progressRaf !== null) return;
    this.emitProgress(true);
    const tick = () => {
      this.emitProgress();
      this.progressRaf = requestAnimationFrame(tick);
    };
    this.progressRaf = requestAnimationFrame(tick);
  }

  private stopProgressLoop(): void {
    if (this.progressRaf !== null) {
      cancelAnimationFrame(this.progressRaf);
      this.progressRaf = null;
    }
  }

  private handlePlay = () => {
    this.callbacks.onPlay?.();
    this.emitProgress(true);
    this.ensureProgressLoop();
  };

  private handlePause = () => {
    this.callbacks.onPause?.();
    this.stopProgressLoop();
    this.emitProgress(true);
  };

  private handleEnded = () => {
    this.stopProgressLoop();
    this.emitProgress(true);
    this.callbacks.onEnded?.();
  };

  private handleLoadedMetadata = () => {
    this.emitProgress(true);
    this.callbacks.onCanPlay?.(this.getDuration());
  };

  private handleCanPlay = () => {
    this.emitProgress(true);
    this.callbacks.onCanPlay?.(this.getDuration());
  };

  private handleTimeUpdate = () => {
    this.emitProgress();
  };

  private handleError = () => {
    const mediaError = this.audio.error;
    const message = mediaError?.message ?? "Playback error";
    this.callbacks.onError?.(message);
  };

  private emitProgress(force = false): void {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!force && now - this.lastProgressEmit < this.progressIntervalMs) {
      return;
    }
    this.lastProgressEmit = now;
    this.callbacks.onProgress?.(this.audio.currentTime, this.getDuration());
  }

  public getFrequencyData(): Uint8Array | null {
    this.ensureContext();
    if (!this.analyserNode) {
      return null;
    }
    if (!this.frequencyData || this.frequencyData.length !== this.analyserNode.frequencyBinCount) {
      this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);
    }
    this.analyserNode.getByteFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  public getTimeDomainData(): Float32Array | null {
    this.ensureContext();
    if (!this.analyserNode) {
      return null;
    }
    if (!this.timeDomainData || this.timeDomainData.length !== this.analyserNode.fftSize) {
      this.timeDomainData = new Float32Array(this.analyserNode.fftSize);
    }
    this.analyserNode.getFloatTimeDomainData(this.timeDomainData);
    return this.timeDomainData;
  }

  public getSampleRate(): number | null {
    return this.audioContext?.sampleRate ?? null;
  }
}
