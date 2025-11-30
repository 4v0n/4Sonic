import { useEffect, useMemo, useRef, useState } from "react";
import { usePlaybackStore } from "../store/playbackStore";
import type { VisualizerPoint } from "../types/visualizer";

const MIN_FREQ = 20;
const MAX_FREQ = 20000;
const BAND_COUNT = 48;
const DECAY_RATE = 0.9;
const PEAK_DECAY = 0.995;

const createBands = (count: number): VisualizerPoint[] => {
  const bands: VisualizerPoint[] = [];
  const logMin = Math.log10(MIN_FREQ);
  const logMax = Math.log10(MAX_FREQ);
  const logRange = logMax - logMin;

  for (let i = 0; i < count; i++) {
    const logCenter = logMin + (logRange / count) * (i + 0.5);
    const fCenter = Math.pow(10, logCenter);
    const name = fCenter < 1000 ? `${Math.round(fCenter)}Hz` : `${(fCenter / 1000).toFixed(1)}kHz`;
    bands.push({ fCenter, name, normalizedPeakRatio: 0 });
  }

  return bands;
};

const createEmptyData = (bands: VisualizerPoint[]): VisualizerPoint[] => bands.map((band) => ({ ...band, normalizedPeakRatio: 0 }));

export const useAudioVisualizerData = (): VisualizerPoint[] => {
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const getFrequencyData = usePlaybackStore((state) => state.getFrequencyData);
  const getSampleRate = usePlaybackStore((state) => state.getSampleRate);

  const bands = useMemo(() => createBands(BAND_COUNT), []);
  const emptyData = useMemo(() => createEmptyData(bands), [bands]);
  const [data, setData] = useState<VisualizerPoint[]>(emptyData);
  const lastDataRef = useRef<VisualizerPoint[]>(emptyData);
  const peakRef = useRef(1);

  useEffect(() => {
    lastDataRef.current = emptyData;
  }, [emptyData]);

  useEffect(() => {
    let raf: number | null = null;

    const mapFrequencyData = (rawData: Uint8Array, sampleRate: number): VisualizerPoint[] => {
      const binCount = rawData.length;
      const nyquist = sampleRate / 2;
      let frameMax = 0;

      const mapped = bands.map((band, index) => {
        const nextBand = index < bands.length - 1 ? bands[index + 1].fCenter : MAX_FREQ;
        const previousBand = index > 0 ? bands[index - 1].fCenter : MIN_FREQ;
        const fMin = (previousBand + band.fCenter) / 2;
        const fMax = (band.fCenter + nextBand) / 2;

        const startBin = Math.max(0, Math.floor((fMin / nyquist) * binCount));
        const endBin = Math.min(binCount - 1, Math.ceil((fMax / nyquist) * binCount));

        let sum = 0;
        for (let bin = startBin; bin <= endBin; bin++) {
          sum += rawData[bin];
        }
        const average = sum / Math.max(1, endBin - startBin + 1);
        frameMax = Math.max(frameMax, average);

        return { ...band, normalizedPeakRatio: average };
      });

      if (frameMax > peakRef.current) {
        peakRef.current = frameMax;
      } else {
        peakRef.current = Math.max(frameMax, peakRef.current * PEAK_DECAY);
      }

      const peak = peakRef.current || 1;
      return mapped.map((point) => ({
        ...point,
        normalizedPeakRatio: peak > 0 ? Math.min(point.normalizedPeakRatio / peak, 1) : 0,
      }));
    };

    const tick = () => {
      const rawData = getFrequencyData ? getFrequencyData() : null;
      const sampleRate = getSampleRate ? getSampleRate() : null;

      if (rawData && rawData.length > 0) {
        const nextData = mapFrequencyData(rawData, sampleRate ?? 44100);
        lastDataRef.current = nextData;
        setData(nextData);
      } else {
        peakRef.current = Math.max(peakRef.current * PEAK_DECAY, 1);
        const decayed = lastDataRef.current.map((point) => ({
          ...point,
          normalizedPeakRatio: Math.max(0, point.normalizedPeakRatio * DECAY_RATE),
        }));
        lastDataRef.current = decayed;
        setData(decayed);
      }

      const shouldContinue = isPlaying || lastDataRef.current.some((point) => point.normalizedPeakRatio > 0.01);
      if (shouldContinue) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null;
      }
    };

    const shouldStart = isPlaying || lastDataRef.current.some((point) => point.normalizedPeakRatio > 0.01);
    if (shouldStart) {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      if (raf) {
        cancelAnimationFrame(raf);
      }
    };
  }, [bands, getFrequencyData, getSampleRate, isPlaying]);

  return data;
};

export default useAudioVisualizerData;
