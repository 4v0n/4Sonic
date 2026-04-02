import { useEffect, useMemo, useRef, useState } from "react";
import { usePlaybackStore } from "../store/playbackStore";
import { useUiPreferencesStore } from "../store/uiPreferencesStore";
import type { VisualizerPoint } from "../types/visualizer";
import { RealFft, applyHannWindow } from "../utils/fft";

const MIN_FREQ = 20;
const MAX_FREQ = 20000;
const BAND_COUNT = 48;
const DISPLAY_DB_FLOOR = -96;
const DISPLAY_DB_CEILING = 0;
const ATTACK_ALPHA = 0.45;
const RELEASE_ALPHA = 0.2;

type VisualizerBand = VisualizerPoint & {
  fMin: number;
  fMax: number;
};

type BinRange = {
  start: number;
  end: number;
};

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

const createBands = (count: number): VisualizerBand[] => {
  const bands: VisualizerBand[] = [];
  const logMin = Math.log10(MIN_FREQ);
  const logMax = Math.log10(MAX_FREQ);
  const logStep = (logMax - logMin) / count;

  for (let i = 0; i < count; i += 1) {
    const fMin = Math.pow(10, logMin + i * logStep);
    const fMax = Math.pow(10, logMin + (i + 1) * logStep);
    const fCenter = Math.sqrt(fMin * fMax);
    const name = fCenter < 1000 ? `${Math.round(fCenter)}Hz` : `${(fCenter / 1000).toFixed(1)}kHz`;

    bands.push({
      name,
      fMin,
      fMax,
      fCenter,
      normalizedPeakRatio: 0,
    });
  }

  return bands;
};

const createEmptyData = (bands: VisualizerBand[]): VisualizerPoint[] => (
  bands.map((band) => ({ name: band.name, fCenter: band.fCenter, normalizedPeakRatio: 0 }))
);

const mapBandsToBins = (bands: VisualizerBand[], sampleRate: number, fftSize: number): BinRange[] => {
  const nyquist = sampleRate / 2;
  const maxBin = fftSize / 2;
  const binHz = sampleRate / fftSize;

  return bands.map((band) => {
    const fMin = Math.max(1, Math.min(band.fMin, nyquist));
    const fMax = Math.max(fMin, Math.min(band.fMax, nyquist));

    let start = Math.max(1, Math.floor(fMin / binHz));
    let end = Math.min(maxBin - 1, Math.ceil(fMax / binHz));

    if (end < start) {
      const nearest = Math.max(1, Math.min(maxBin - 1, Math.round(band.fCenter / binHz)));
      start = nearest;
      end = nearest;
    }

    return { start, end };
  });
};

export const useAudioVisualizerData = (): VisualizerPoint[] => {
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const getTimeDomainData = usePlaybackStore((state) => state.getTimeDomainData);
  const getSampleRate = usePlaybackStore((state) => state.getSampleRate);
  const visualizerResponse = useUiPreferencesStore((state) => state.visualizerResponse);
  const visualizerFps = useUiPreferencesStore((state) => state.visualizerFps);

  const bands = useMemo(() => createBands(BAND_COUNT), []);
  const emptyData = useMemo(() => createEmptyData(bands), [bands]);

  const [data, setData] = useState<VisualizerPoint[]>(emptyData);
  const lastDataRef = useRef<VisualizerPoint[]>(emptyData);

  const fftRef = useRef<RealFft | null>(null);
  const fftSizeRef = useRef(0);
  const windowedBufferRef = useRef<Float32Array>(new Float32Array(0));
  const realBufferRef = useRef<Float32Array>(new Float32Array(0));
  const imagBufferRef = useRef<Float32Array>(new Float32Array(0));
  const binRangesRef = useRef<BinRange[]>([]);
  const mappingMetaRef = useRef<{ sampleRate: number; fftSize: number } | null>(null);

  useEffect(() => {
    lastDataRef.current = emptyData;
  }, [emptyData]);

  useEffect(() => {
    let raf: number | null = null;
    let lastFrameTs = 0;
    const frameIntervalMs = 1000 / Math.max(15, visualizerFps);
    const response = Math.max(0.05, Math.min(1, visualizerResponse));

    const initializeFftState = (fftSize: number): void => {
      if (fftSizeRef.current === fftSize && fftRef.current) {
        return;
      }

      fftRef.current = new RealFft(fftSize);
      fftSizeRef.current = fftSize;
      windowedBufferRef.current = new Float32Array(fftSize);
      realBufferRef.current = new Float32Array(fftSize);
      imagBufferRef.current = new Float32Array(fftSize);
      mappingMetaRef.current = null;
    };

    const ensureBandMappings = (sampleRate: number, fftSize: number): void => {
      if (
        mappingMetaRef.current
        && mappingMetaRef.current.sampleRate === sampleRate
        && mappingMetaRef.current.fftSize === fftSize
      ) {
        return;
      }

      binRangesRef.current = mapBandsToBins(bands, sampleRate, fftSize);
      mappingMetaRef.current = { sampleRate, fftSize };
    };

    const mapSpectrum = (timeDomainData: Float32Array, sampleRate: number): VisualizerPoint[] => {
      const fftSize = timeDomainData.length;
      initializeFftState(fftSize);
      ensureBandMappings(sampleRate, fftSize);

      const fft = fftRef.current;
      const windowedBuffer = windowedBufferRef.current;
      const realBuffer = realBufferRef.current;
      const imagBuffer = imagBufferRef.current;

      if (!fft) {
        return lastDataRef.current;
      }

      const windowSum = applyHannWindow(timeDomainData, windowedBuffer);
      fft.transform(windowedBuffer, realBuffer, imagBuffer);

      const nyquistBin = fftSize / 2;

      return bands.map((band, index) => {
        const range = binRangesRef.current[index];
        let sumSquares = 0;
        let binCount = 0;

        for (let bin = range.start; bin <= range.end; bin += 1) {
          const re = realBuffer[bin];
          const im = imagBuffer[bin];
          const magnitude = Math.hypot(re, im);
          const amplitude = bin === nyquistBin ? magnitude / windowSum : (2 * magnitude) / windowSum;
          sumSquares += amplitude * amplitude;
          binCount += 1;
        }

        const rms = binCount > 0 ? Math.sqrt(sumSquares / binCount) : 0;
        const dbfs = 20 * Math.log10(rms + 1e-12);
        const targetRatio = clampUnit((dbfs - DISPLAY_DB_FLOOR) / (DISPLAY_DB_CEILING - DISPLAY_DB_FLOOR));

        const previous = lastDataRef.current[index]?.normalizedPeakRatio ?? 0;
        const baseAlpha = targetRatio >= previous ? ATTACK_ALPHA : RELEASE_ALPHA;
        const alpha = Math.max(0.05, Math.min(1, baseAlpha * (0.5 + response)));
        const smoothed = previous + (targetRatio - previous) * alpha;

        return {
          name: band.name,
          fCenter: band.fCenter,
          normalizedPeakRatio: smoothed,
        };
      });
    };

    const tick = (ts: number) => {
      if (lastFrameTs > 0 && ts - lastFrameTs < frameIntervalMs) {
        const shouldContinue = isPlaying || lastDataRef.current.some((point) => point.normalizedPeakRatio > 0.003);
        if (shouldContinue) {
          raf = requestAnimationFrame(tick);
        } else {
          raf = null;
        }
        return;
      }
      lastFrameTs = ts;

      const timeDomainData = getTimeDomainData ? getTimeDomainData() : null;
      const sampleRate = getSampleRate ? getSampleRate() : null;

      if (timeDomainData && timeDomainData.length > 0) {
        const nextData = mapSpectrum(timeDomainData, sampleRate ?? 44100);
        lastDataRef.current = nextData;
        setData(nextData);
      } else {
        const decayRate = 0.84 + (1 - response) * 0.13;
        const decayed = lastDataRef.current.map((point) => ({
          ...point,
          normalizedPeakRatio: Math.max(0, point.normalizedPeakRatio * decayRate),
        }));
        lastDataRef.current = decayed;
        setData(decayed);
      }

      const shouldContinue = isPlaying || lastDataRef.current.some((point) => point.normalizedPeakRatio > 0.003);
      if (shouldContinue) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null;
      }
    };

    const shouldStart = isPlaying || lastDataRef.current.some((point) => point.normalizedPeakRatio > 0.003);
    if (shouldStart) {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      if (raf) {
        cancelAnimationFrame(raf);
      }
    };
  }, [bands, getSampleRate, getTimeDomainData, isPlaying, visualizerFps, visualizerResponse]);

  return data;
};

export default useAudioVisualizerData;
