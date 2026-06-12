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
  onAutoAdvance?: (trackId: string) => void;
  onCanPlay?: (duration: number) => void;
  onProgress?: (time: number, duration: number) => void;
  onWaiting?: () => void;
  onError?: (message: string) => void;
}

interface AudioSlot {
  audio: HTMLAudioElement;
  sourceNode: MediaElementAudioSourceNode | null;
  trackId: string | null;
  hintedDuration: number;
  preloadFailed: boolean;
}

export class HiResAudioPlayer {
  private readonly slots: [AudioSlot, AudioSlot];
  private activeIndex: 0 | 1 = 0;
  private audioContext: AudioContext | null = null;
  private preampNode: GainNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private filterNodes: BiquadFilterNode[] = [];
  private preampDb = 0;
  private callbacks: PlayerCallbacks;
  private progressRaf: number | null = null;
  private frequencyData: Uint8Array | null = null;
  private timeDomainData: Float32Array | null = null;
  private needsGraphRebuild = false;
  private lastProgressEmit = 0;
  private readonly progressIntervalMs = 80;

  public constructor(callbacks?: PlayerCallbacks) {
    this.callbacks = callbacks ?? {};
    this.slots = [this.createSlot(0), this.createSlot(1)];
  }

  private createSlot(index: 0 | 1): AudioSlot {
    const audio = new Audio();
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audio.setAttribute("playsinline", "true");
    audio.autoplay = false;

    audio.addEventListener("play", () => this.handlePlay(index));
    audio.addEventListener("pause", () => this.handlePause(index));
    audio.addEventListener("ended", () => this.handleEnded(index));
    audio.addEventListener("loadedmetadata", () => this.handleReadiness(index));
    audio.addEventListener("canplay", () => this.handleReadiness(index));
    audio.addEventListener("timeupdate", () => this.handleTimeUpdate(index));
    audio.addEventListener("waiting", () => this.handleWaiting(index));
    audio.addEventListener("playing", () => this.handlePlaying(index));
    audio.addEventListener("error", () => this.handleError(index));

    return {
      audio,
      sourceNode: null,
      trackId: null,
      hintedDuration: 0,
      preloadFailed: false,
    };
  }

  private get active(): AudioSlot {
    return this.slots[this.activeIndex];
  }

  private get standby(): AudioSlot {
    return this.slots[this.activeIndex === 0 ? 1 : 0];
  }

  public setCallbacks(callbacks: PlayerCallbacks): void {
    this.callbacks = callbacks;
  }

  public setSource(track: HiResTrack): void {
    this.stopProgressLoop();
    this.active.audio.pause();

    const standby = this.standby;
    if (standby.trackId === track.id && !standby.preloadFailed && standby.audio.src) {
      this.activeIndex = this.activeIndex === 0 ? 1 : 0;
      this.active.hintedDuration = track.duration ?? 0;
      if (this.active.audio.currentTime !== 0) {
        try {
          this.active.audio.currentTime = 0;
        } catch {
          // Not seekable yet; it will start from 0 anyway.
        }
      }
      return;
    }

    const slot = this.active;
    slot.trackId = track.id;
    slot.hintedDuration = track.duration ?? 0;
    slot.preloadFailed = false;

    if (slot.audio.src !== track.url) {
      slot.audio.src = track.url;
    }
    slot.audio.currentTime = 0;
    slot.audio.load();
  }

  public preloadNext(track: HiResTrack): void {
    const slot = this.standby;
    if (slot.trackId === track.id && slot.audio.src === track.url && !slot.preloadFailed) {
      return;
    }
    slot.trackId = track.id;
    slot.hintedDuration = track.duration ?? 0;
    slot.preloadFailed = false;
    slot.audio.pause();
    slot.audio.src = track.url;
    slot.audio.load();
  }

  public clearPreload(): void {
    const slot = this.standby;
    if (!slot.trackId && !slot.audio.src) {
      return;
    }
    slot.trackId = null;
    slot.hintedDuration = 0;
    slot.preloadFailed = false;
    slot.audio.pause();
    slot.audio.removeAttribute("src");
  }

  public getPreloadedTrackId(): string | null {
    const slot = this.standby;
    return slot.preloadFailed ? null : slot.trackId;
  }

  public async play(): Promise<void> {
    this.ensureContext();
    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    const promise = this.active.audio.play();
    if (promise) {
      await promise;
    }
  }

  public pause(): void {
    this.active.audio.pause();
  }

  public stop(): void {
    this.active.audio.pause();
    try {
      this.active.audio.currentTime = 0;
    } catch {
      // Source may already be detached.
    }
    this.stopProgressLoop();
  }

  public seek(time: number): void {
    const duration = this.getDuration();
    const bounded = Math.max(0, Math.min(time, Number.isFinite(duration) ? duration : Number.MAX_SAFE_INTEGER));
    this.active.audio.currentTime = bounded;
    this.emitProgress(true);
    if (!this.active.audio.paused) {
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
      this.slots.forEach((slot) => {
        slot.audio.volume = clamped;
      });
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
    const { audio, hintedDuration } = this.active;
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      return audio.duration;
    }
    return hintedDuration;
  }

  public getCurrentTime(): number {
    return this.active.audio.currentTime;
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
    if (this.audioContext) {
      for (const slot of this.slots) {
        if (!slot.sourceNode) {
          slot.sourceNode = this.audioContext.createMediaElementSource(slot.audio);
          graphChanged = true;
        }
      }
    }

    if (graphChanged || this.needsGraphRebuild) {
      this.rebuildGraph();
      this.needsGraphRebuild = false;
    }
    this.applyPreamp();
  }

  private rebuildGraph(): void {
    if (!this.audioContext || !this.gainNode || !this.preampNode) {
      return;
    }

    this.slots.forEach((slot) => slot.sourceNode?.disconnect());
    this.filterNodes.forEach((node) => node.disconnect());
    this.preampNode.disconnect();
    this.gainNode.disconnect();
    if (this.analyserNode) {
      this.analyserNode.disconnect();
    }

    const chain: AudioNode[] = [...this.filterNodes, this.preampNode, this.gainNode];
    if (this.analyserNode) {
      chain.push(this.analyserNode);
    }
    chain.push(this.audioContext.destination);

    const chainHead = chain[0];
    this.slots.forEach((slot) => slot.sourceNode?.connect(chainHead));
    for (let i = 0; i < chain.length - 1; i += 1) {
      chain[i].connect(chain[i + 1]);
    }
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

  private handlePlay = (index: 0 | 1) => {
    if (index !== this.activeIndex) return;
    this.callbacks.onPlay?.();
    this.emitProgress(true);
    this.ensureProgressLoop();
  };

  private handlePause = (index: 0 | 1) => {
    if (index !== this.activeIndex) return;
    // A "pause" event also fires as a track reaches its natural end; ignore it
    // so the gapless swap is not reported as a pause.
    if (this.active.audio.ended) return;
    this.callbacks.onPause?.();
    this.stopProgressLoop();
    this.emitProgress(true);
  };

  private handleEnded = (index: 0 | 1) => {
    if (index !== this.activeIndex) return;
    this.emitProgress(true);

    const standby = this.standby;
    const canAdvance = Boolean(
      standby.trackId
      && !standby.preloadFailed
      && standby.audio.src
      && standby.audio.readyState >= HTMLMediaElement.HAVE_METADATA,
    );

    if (!canAdvance) {
      this.stopProgressLoop();
      this.callbacks.onEnded?.();
      return;
    }

    // Gapless handoff: swap to the preloaded element and start it in the same
    // task as the "ended" event so the output never goes through a load cycle.
    this.activeIndex = this.activeIndex === 0 ? 1 : 0;
    const next = this.active;
    if (next.audio.currentTime !== 0) {
      try {
        next.audio.currentTime = 0;
      } catch {
        // Not seekable yet; playback will begin at 0 regardless.
      }
    }

    const trackId = next.trackId!;
    const playPromise = next.audio.play();
    this.callbacks.onAutoAdvance?.(trackId);
    if (playPromise) {
      playPromise.catch((error: unknown) => {
        // onAutoAdvance already moved external state to this track, so report
        // a recoverable error rather than re-running the ended flow (which
        // would advance a second time).
        this.stopProgressLoop();
        const message = error instanceof Error ? error.message : "Unable to start next track";
        this.callbacks.onError?.(message);
      });
    }
  };

  private handleReadiness = (index: 0 | 1) => {
    if (index !== this.activeIndex) return;
    this.emitProgress(true);
    this.callbacks.onCanPlay?.(this.getDuration());
  };

  private handleTimeUpdate = (index: 0 | 1) => {
    if (index !== this.activeIndex) return;
    this.emitProgress();
  };

  private handleWaiting = (index: 0 | 1) => {
    if (index !== this.activeIndex) return;
    this.callbacks.onWaiting?.();
  };

  private handlePlaying = (index: 0 | 1) => {
    if (index !== this.activeIndex) return;
    this.callbacks.onPlay?.();
  };

  private handleError = (index: 0 | 1) => {
    const slot = this.slots[index];
    if (index !== this.activeIndex) {
      // Preload failed: forget it so the ended handler and the store fall back
      // to the regular (non-gapless) advance path.
      slot.preloadFailed = true;
      return;
    }
    const mediaError = slot.audio.error;
    const message = mediaError?.message ?? "Playback error";
    this.callbacks.onError?.(message);
  };

  private emitProgress(force = false): void {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!force && now - this.lastProgressEmit < this.progressIntervalMs) {
      return;
    }
    this.lastProgressEmit = now;
    this.callbacks.onProgress?.(this.active.audio.currentTime, this.getDuration());
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
