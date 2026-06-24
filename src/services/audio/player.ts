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
  // per-slot gain for crossfading; 1 when not active
  fadeGain: GainNode | null;
  trackId: string | null;
  hintedDuration: number;
  preloadFailed: boolean;
}

export class HiResAudioPlayer {
  // ensures catch-up fades near track end blend smoothly rather than cut
  private static readonly MIN_FADE_SECONDS = 0.12;

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
  private crossfadeSeconds = 0;
  private crossfading = false;
  private retiringIndex: 0 | 1 | null = null;
  private crossfadeStartCtxTime: number | null = null;
  private crossfadeFadeSeconds = 0;
  private pendingPreload: HiResTrack | null = null;
  private scrubbing = false;

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
      fadeGain: null,
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
    if (this.crossfading) {
      this.cancelCrossfade();
    }
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
          // not seekable yet; will start at 0 anyway
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
    // standby slot is the outgoing track mid-fade; defer until finalizeCrossfade frees it
    if (this.crossfading) {
      this.pendingPreload = track;
      return;
    }
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
    this.pendingPreload = null;
    if (this.crossfading) {
      // standby slot is in use mid-fade; finalizeCrossfade will clear it
      return;
    }
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
    if (this.crossfading) {
      return this.pendingPreload?.id ?? null;
    }
    const slot = this.standby;
    return slot.preloadFailed ? null : slot.trackId;
  }

  public setCrossfadeDuration(seconds: number): void {
    this.crossfadeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  }

  // prevents crossfade triggering mid-drag; a seek into the fade window would swap the active element and corrupt subsequent seeks
  public setScrubbing(active: boolean): void {
    this.scrubbing = active;
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
    // settle crossfade first so resume starts a clean single track
    if (this.crossfading) {
      this.finalizeCrossfade();
    }
    this.active.audio.pause();
  }

  public stop(): void {
    if (this.crossfading) {
      this.cancelCrossfade();
    }
    this.active.audio.pause();
    try {
      this.active.audio.currentTime = 0;
    } catch {
      // source may already be detached
    }
    this.stopProgressLoop();
  }

  public seek(time: number): void {
    if (this.crossfading) {
      this.finalizeCrossfade();
    }
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
        if (!slot.fadeGain) {
          slot.fadeGain = this.audioContext.createGain();
          slot.fadeGain.gain.value = 1;
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

    this.slots.forEach((slot) => {
      slot.sourceNode?.disconnect();
      slot.fadeGain?.disconnect();
    });
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

    // each slot's fadeGain lets both tracks overlap independently during a crossfade
    const chainHead = chain[0];
    this.slots.forEach((slot) => {
      if (slot.sourceNode && slot.fadeGain) {
        slot.sourceNode.connect(slot.fadeGain);
        slot.fadeGain.connect(chainHead);
      }
    });
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
      this.maybeStartCrossfade();
      this.tickCrossfade();
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

  private maybeStartCrossfade(): void {
    if (this.crossfadeSeconds <= 0 || this.crossfading || this.scrubbing) {
      return;
    }
    const active = this.active;
    if (active.audio.paused || active.audio.ended) {
      return;
    }
    const duration = this.getDuration();
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }
    const remaining = duration - active.audio.currentTime;
    const fade = Math.min(this.crossfadeSeconds, duration);
    if (remaining <= 0 || remaining > fade) {
      return;
    }

    const standby = this.standby;
    const ready = Boolean(
      standby.trackId
      && !standby.preloadFailed
      && standby.audio.src
      && standby.audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA,
    );
    if (!ready) {
      // next track not ready; fall back to ended-driven gapless handoff
      return;
    }

    this.startCrossfade(remaining);
  }

  private startCrossfade(overlap: number): void {
    this.ensureContext();
    if (!this.audioContext) {
      return;
    }
    const fromSlot = this.active;
    const toSlot = this.standby;
    if (!fromSlot.fadeGain || !toSlot.fadeGain || !toSlot.trackId) {
      return;
    }

    const toIndex: 0 | 1 = this.activeIndex === 0 ? 1 : 0;
    const fade = Math.max(HiResAudioPlayer.MIN_FADE_SECONDS, overlap);
    const toTrackId = toSlot.trackId;

    // set crossfading immediately so RAF can't re-enter before play() resolves; clock stays null until begin() so tickCrossfade is a no-op
    this.crossfading = true;
    this.retiringIndex = this.activeIndex;
    this.crossfadeStartCtxTime = null;
    this.crossfadeFadeSeconds = fade;

    // pre-set gains so the incoming track stays muted through play-promise latency
    fromSlot.fadeGain.gain.value = 1;
    toSlot.fadeGain.gain.value = 0;

    try {
      toSlot.audio.currentTime = 0;
    } catch {
      // not seekable yet; will start at 0 anyway
    }

    const begin = () => {
      const now = this.audioContext!.currentTime;
      this.crossfadeStartCtxTime = now;
      this.activeIndex = toIndex;

      // staircase of setValueAtTime runs on the audio thread — avoids RAF jitter and WebKitGTK's unreliable setValueCurveAtTime
      const STEPS = 64;
      fromSlot.fadeGain!.gain.cancelScheduledValues(now);
      fromSlot.fadeGain!.gain.setValueAtTime(1, now);
      toSlot.fadeGain!.gain.cancelScheduledValues(now);
      toSlot.fadeGain!.gain.setValueAtTime(0, now);
      for (let i = 1; i <= STEPS; i++) {
        const t = i / STEPS;
        const stepTime = now + t * fade;
        fromSlot.fadeGain!.gain.setValueAtTime(Math.cos((t * Math.PI) / 2), stepTime);
        toSlot.fadeGain!.gain.setValueAtTime(Math.sin((t * Math.PI) / 2), stepTime);
      }

      this.callbacks.onAutoAdvance?.(toTrackId);
    };

    const playPromise = toSlot.audio.play();
    if (playPromise) {
      playPromise.then(begin).catch((error: unknown) => {
        // next track failed to start; let current track finish and advance via the ended event
        this.crossfading = false;
        this.retiringIndex = null;
        this.crossfadeStartCtxTime = null;
        toSlot.fadeGain!.gain.value = 1;
        toSlot.preloadFailed = true;
        const message = error instanceof Error ? error.message : "Unable to start next track";
        this.callbacks.onError?.(message);
      });
    } else {
      begin();
    }
  }

  // gains are driven by the audio-thread staircase scheduled in begin(); only check for completion here
  private tickCrossfade(): void {
    if (
      !this.crossfading
      || this.crossfadeStartCtxTime === null
      || !this.audioContext
      || this.retiringIndex === null
    ) {
      return;
    }
    const elapsed = this.audioContext.currentTime - this.crossfadeStartCtxTime;
    const t = Math.min(1, Math.max(0, elapsed / this.crossfadeFadeSeconds));
    if (t >= 1) {
      this.finalizeCrossfade();
    }
  }

  private finalizeCrossfade(): void {
    this.crossfadeStartCtxTime = null;
    if (!this.crossfading || this.retiringIndex === null) {
      this.crossfading = false;
      this.retiringIndex = null;
      return;
    }

    const retiring = this.slots[this.retiringIndex];
    retiring.audio.pause();
    try {
      retiring.audio.currentTime = 0;
    } catch {
      // element may already be at its end
    }
    retiring.trackId = null;
    retiring.preloadFailed = false;

    const now = this.audioContext?.currentTime ?? 0;
    if (retiring.fadeGain) {
      retiring.fadeGain.gain.cancelScheduledValues(now);
      retiring.fadeGain.gain.value = 1;
    }
    if (this.active.fadeGain) {
      this.active.fadeGain.gain.cancelScheduledValues(now);
      this.active.fadeGain.gain.value = 1;
    }

    this.crossfading = false;
    this.retiringIndex = null;

    // slot is now free; apply any preload deferred during the fade
    if (this.pendingPreload) {
      const pending = this.pendingPreload;
      this.pendingPreload = null;
      this.preloadNext(pending);
    }
  }

  private cancelCrossfade(): void {
    this.crossfadeStartCtxTime = null;
    this.pendingPreload = null;

    const now = this.audioContext?.currentTime ?? 0;
    this.slots.forEach((slot) => {
      if (slot.fadeGain) {
        slot.fadeGain.gain.cancelScheduledValues(now);
        slot.fadeGain.gain.value = 1;
      }
    });

    if (this.retiringIndex !== null) {
      const retiring = this.slots[this.retiringIndex];
      retiring.audio.pause();
      try {
        retiring.audio.currentTime = 0;
      } catch {
        // element may already be detached
      }
      retiring.trackId = null;
    }

    this.crossfading = false;
    this.retiringIndex = null;
  }

  private handlePlay = (index: 0 | 1) => {
    if (index !== this.activeIndex) return;
    this.callbacks.onPlay?.();
    this.emitProgress(true);
    this.ensureProgressLoop();
  };

  private handlePause = (index: 0 | 1) => {
    if (index !== this.activeIndex) return;
    // pause also fires at natural end; skip to avoid a false pause during gapless swap
    if (this.active.audio.ended) return;
    this.callbacks.onPause?.();
    this.stopProgressLoop();
    this.emitProgress(true);
  };

  private handleEnded = (index: 0 | 1) => {
    // outgoing crossfade track reaching its end naturally is expected; incoming is already playing
    if (this.crossfading && index === this.retiringIndex) return;
    if (index !== this.activeIndex) return;
    this.emitProgress(true);

    const standby = this.standby;
    const canAdvance = Boolean(
      standby.trackId
      && !standby.preloadFailed
      && standby.audio.src
      && standby.audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA,
    );

    if (!canAdvance) {
      this.stopProgressLoop();
      this.callbacks.onEnded?.();
      return;
    }

    // swap in the same task as "ended" so playback never stalls through a load cycle
    this.activeIndex = this.activeIndex === 0 ? 1 : 0;
    const next = this.active;
    if (next.audio.currentTime !== 0) {
      try {
        next.audio.currentTime = 0;
      } catch {
        // not seekable yet; will start at 0 anyway
      }
    }

    const trackId = next.trackId!;
    const playPromise = next.audio.play();
    this.callbacks.onAutoAdvance?.(trackId);
    if (playPromise) {
      playPromise.catch((error: unknown) => {
        // onAutoAdvance already advanced external state; don't re-run ended or we'd double-advance
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
      // preload failed; ended handler falls back to non-gapless advance
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

  /** RMS of the current mixed output — 0 means silence, ~0.3 is a typical music level. */
  public getOutputRms(): number {
    if (!this.analyserNode) return 0;
    const data = new Float32Array(this.analyserNode.fftSize);
    this.analyserNode.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  public getDebugState() {
    return {
      crossfading: this.crossfading,
      retiringIndex: this.retiringIndex,
      activeIndex: this.activeIndex,
      crossfadeProgress: this.crossfadeStartCtxTime !== null && this.audioContext
        ? Math.min(1, (this.audioContext.currentTime - this.crossfadeStartCtxTime) / (this.crossfadeFadeSeconds || 1))
        : null,
      crossfadeFadeSeconds: this.crossfadeFadeSeconds,
      audioContextTime: this.audioContext?.currentTime ?? null,
      audioContextState: this.audioContext?.state ?? null,
      outputRms: this.getOutputRms(),
      slots: this.slots.map((slot) => ({
        trackId: slot.trackId,
        readyState: slot.audio.readyState,
        paused: slot.audio.paused,
        ended: slot.audio.ended,
        currentTime: slot.audio.currentTime,
        duration: slot.audio.duration,
        hasSrc: Boolean(slot.audio.src),
        gain: slot.fadeGain?.gain.value ?? null,
      })),
    };
  }
}
