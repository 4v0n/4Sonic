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
 * keeps the graph PEQ-ready by routing through a GainNode and an optional chain
 * of peaking filters.
 */
export class HiResAudioPlayer {
  private readonly audio: HTMLAudioElement;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private filterNodes: BiquadFilterNode[] = [];
  private callbacks: PlayerCallbacks;
  private progressRaf: number | null = null;
  private hintedDuration = 0;

  public constructor(callbacks?: PlayerCallbacks) {
    this.callbacks = callbacks ?? {};
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.audio.crossOrigin = "anonymous";
    this.audio.playsInline = true;
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
    this.callbacks.onProgress?.(this.audio.currentTime, this.getDuration());
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

  public setParametricEq(bands: ParametricEqBand[]): void {
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

    this.rebuildGraph();
  }

  public getDuration(): number {
    if (Number.isFinite(this.audio.duration) && this.audio.duration > 0) {
      return this.audio.duration;
    }
    return this.hintedDuration;
  }

  private ensureContext(): void {
    if (typeof window === "undefined") {
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      return;
    }

    if (!this.audioContext) {
      this.audioContext = new AudioCtx();
    }
    if (!this.gainNode && this.audioContext) {
      this.gainNode = this.audioContext.createGain();
    }
    if (!this.sourceNode && this.audioContext) {
      this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
    }

    this.rebuildGraph();
  }

  private rebuildGraph(): void {
    if (!this.audioContext || !this.sourceNode || !this.gainNode) {
      return;
    }

    this.sourceNode.disconnect();
    this.filterNodes.forEach((node) => node.disconnect());
    this.gainNode.disconnect();

    let head: AudioNode = this.sourceNode;
    const chain: AudioNode[] = [...this.filterNodes, this.gainNode, this.audioContext.destination];
    chain.forEach((node) => {
      head.connect(node);
      head = node;
    });
  }

  private ensureProgressLoop(): void {
    if (this.progressRaf !== null) return;
    const tick = () => {
      this.callbacks.onProgress?.(this.audio.currentTime, this.getDuration());
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
    this.ensureProgressLoop();
  };

  private handlePause = () => {
    this.callbacks.onPause?.();
    this.stopProgressLoop();
    this.callbacks.onProgress?.(this.audio.currentTime, this.getDuration());
  };

  private handleEnded = () => {
    this.stopProgressLoop();
    this.callbacks.onEnded?.();
  };

  private handleLoadedMetadata = () => {
    this.callbacks.onCanPlay?.(this.getDuration());
  };

  private handleCanPlay = () => {
    this.callbacks.onCanPlay?.(this.getDuration());
  };

  private handleTimeUpdate = () => {
    this.callbacks.onProgress?.(this.audio.currentTime, this.getDuration());
  };

  private handleError = () => {
    const mediaError = this.audio.error;
    const message = mediaError?.message ?? "Playback error";
    this.callbacks.onError?.(message);
  };
}
