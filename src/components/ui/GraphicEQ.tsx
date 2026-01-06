import { useCallback, useMemo, useState } from "react";
import cn from "../../utils/cn";

export interface EqBand {
  freq: number;
  gain: number;
}

export interface BaselinePoint {
  freq: number;
  spl: number;
}

interface GraphicEQProps {
  bands: EqBand[];
  onChange: (next: EqBand[]) => void;
  minGain?: number;
  maxGain?: number;
  baseline?: BaselinePoint[];
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const GraphicEQ: React.FC<GraphicEQProps> = ({
  bands,
  onChange,
  minGain = -12,
  maxGain = 12,
  baseline,
}) => {
  const SAMPLE_RATE = 48000;
  const DEFAULT_Q = 1.4;
  const VIEWBOX_WIDTH = 1000;
  const VIEWBOX_HEIGHT = 220;
  const PADDING = 16;
  const LABEL_SPACE = 20;
  const totalHeight = VIEWBOX_HEIGHT + 2 * (PADDING + LABEL_SPACE);

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const designPeakingCoefficients = useCallback((freq: number, gain: number, q: number) => {
    const w0 = (2 * Math.PI * freq) / SAMPLE_RATE;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    const A = 10 ** (gain / 40);
    const alpha = sinW0 / (2 * q);

    const b0 = 1 + alpha * A;
    const b1 = -2 * cosW0;
    const b2 = 1 - alpha * A;
    const a0 = 1 + alpha / A;
    const a1 = -2 * cosW0;
    const a2 = 1 - alpha / A;

    return { b0, b1, b2, a0, a1, a2 };
  }, []);

  const bandCoefficients = useMemo(
    () => bands.map((band) => designPeakingCoefficients(band.freq, band.gain, DEFAULT_Q)),
    [bands, designPeakingCoefficients],
  );

  const handleUpdateGain = (index: number, targetDb: number) => {
    const baselineDb = clamp(getBaselineDb(bands[index].freq), minGain, maxGain);
    const desiredGain = targetDb - baselineDb;
    const rounded = Math.round(desiredGain * 10) / 10;
    const clamped = clamp(rounded, minGain, maxGain);
    const next = bands.map((band, idx) => (idx === index ? { ...band, gain: clamped } : band));
    onChange(next);
  };

  const handlePointerDown = (index: number, event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const track = event.currentTarget;

    const updateFromEvent = (pointerEvent: PointerEvent | React.PointerEvent<HTMLDivElement>) => {
      const rect = track.getBoundingClientRect();
      const ratio = clamp((rect.bottom - pointerEvent.clientY) / rect.height, 0, 1);
      const nextDb = minGain + ratio * (maxGain - minGain);
      handleUpdateGain(index, nextDb);
    };

    updateFromEvent(event);
    setDraggingIndex(index);

    const handleMove = (pointerEvent: PointerEvent) => {
      updateFromEvent(pointerEvent);
    };

    const handleUp = () => {
      setDraggingIndex(null);
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
  };

  const normalizedBaseline = useMemo(() => {
    if (!baseline?.length) return undefined;
    const valid = baseline
      .filter((point) => Number.isFinite(point.freq) && Number.isFinite(point.spl) && point.freq > 0)
      .sort((a, b) => a.freq - b.freq);
    if (valid.length === 0) return undefined;
    const mean = valid.reduce((sum, point) => sum + point.spl, 0) / valid.length;
    const normalized = valid.map((point) => ({ freq: point.freq, value: point.spl - mean }));
    const window = 5;
    if (normalized.length <= window) return normalized;
    return normalized.map((point, index) => {
      const start = Math.max(0, index - Math.floor(window / 2));
      const end = Math.min(normalized.length, index + Math.ceil(window / 2));
      const slice = normalized.slice(start, end);
      const avg = slice.reduce((sum, entry) => sum + entry.value, 0) / slice.length;
      return { freq: point.freq, value: avg };
    });
  }, [baseline]);

  const minFreq = useMemo(() => {
    const bandMin = bands.reduce((min, band) => Math.min(min, band.freq), bands[0]?.freq ?? 20);
    const baselineMin = normalizedBaseline?.[0]?.freq;
    return baselineMin ? Math.min(bandMin, baselineMin) : bandMin;
  }, [bands, normalizedBaseline]);

  const maxFreq = useMemo(() => {
    const bandMax = bands.reduce((max, band) => Math.max(max, band.freq), bands[0]?.freq ?? 20000);
    const baselineMax = normalizedBaseline?.[normalizedBaseline.length - 1]?.freq;
    return baselineMax ? Math.max(bandMax, baselineMax) : bandMax;
  }, [bands, normalizedBaseline]);

  const logPosition = useCallback((freq: number) => {
    const minLog = Math.log10(minFreq);
    const maxLog = Math.log10(maxFreq);
    const valueLog = Math.log10(freq);
    return (valueLog - minLog) / (maxLog - minLog);
  }, [maxFreq, minFreq]);

  const formatFrequency = (freq: number) => {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(freq >= 10000 ? 0 : 1)}k`;
    }
    return `${freq}`;
  };

  const getResponseDb = useCallback((freq: number) => {
    if (bands.length === 0) return 0;
    const w = (2 * Math.PI * freq) / SAMPLE_RATE;
    const cosW = Math.cos(w);
    const sinW = Math.sin(w);
    const cos2W = Math.cos(2 * w);
    const sin2W = Math.sin(2 * w);

    const totalDb = bandCoefficients.reduce((acc, coeff) => {
      const numReal = coeff.b0 + coeff.b1 * cosW + coeff.b2 * cos2W;
      const numImag = -(coeff.b1 * sinW + coeff.b2 * sin2W);
      const denReal = coeff.a0 + coeff.a1 * cosW + coeff.a2 * cos2W;
      const denImag = -(coeff.a1 * sinW + coeff.a2 * sin2W);

      const numerator = Math.sqrt(numReal * numReal + numImag * numImag);
      const denominator = Math.sqrt(denReal * denReal + denImag * denImag);
      const magnitude = numerator / denominator;
      const db = 20 * Math.log10(magnitude);
      return acc + db;
    }, 0);
    return clamp(totalDb, minGain, maxGain);
  }, [bandCoefficients, bands.length, maxGain, minGain]);

  const getBaselineDb = useCallback((freq: number) => {
    if (!normalizedBaseline) return 0;
    if (normalizedBaseline.length === 1) return normalizedBaseline[0].value;
    const first = normalizedBaseline[0];
    const last = normalizedBaseline[normalizedBaseline.length - 1];
    if (freq <= first.freq) return first.value;
    if (freq >= last.freq) return last.value;
    let left = first;
    let right = last;
    for (let index = 1; index < normalizedBaseline.length; index += 1) {
      const point = normalizedBaseline[index];
      if (point.freq >= freq) {
        right = point;
        left = normalizedBaseline[index - 1];
        break;
      }
    }
    const leftLog = Math.log10(left.freq);
    const rightLog = Math.log10(right.freq);
    const freqLog = Math.log10(freq);
    const t = (freqLog - leftLog) / (rightLog - leftLog);
    return left.value + t * (right.value - left.value);
  }, [normalizedBaseline]);

  const responsePoints = useMemo(() => {
    if (bands.length === 0) return [];
    const count = 256;
    const minLog = Math.log10(minFreq);
    const maxLog = Math.log10(maxFreq);
    return Array.from({ length: count }, (_, index) => {
      const t = index / (count - 1);
      const freq = 10 ** (minLog + t * (maxLog - minLog));
      const db = clamp(getBaselineDb(freq) + getResponseDb(freq), minGain, maxGain);
      const x = logPosition(freq) * VIEWBOX_WIDTH;
      const y = ((maxGain - db) / (maxGain - minGain)) * VIEWBOX_HEIGHT;
      return { x, y, freq, db };
    });
  }, [bands, logPosition, maxFreq, maxGain, minFreq, minGain, getResponseDb, getBaselineDb]);

  const responsePath = useMemo(() => {
    if (responsePoints.length === 0) return "";
    return responsePoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  }, [responsePoints]);

  const areaPath = useMemo(() => {
    if (responsePoints.length === 0) return "";
    const start = `M ${responsePoints[0].x} ${VIEWBOX_HEIGHT}`;
    const line = responsePoints.map((point) => `L ${point.x} ${point.y}`).join(" ");
    const end = `L ${responsePoints[responsePoints.length - 1].x} ${VIEWBOX_HEIGHT} Z`;
    return `${start} ${line} ${end}`;
  }, [responsePoints]);

  const baselinePath = useMemo(() => {
    if (!normalizedBaseline) return "";
    const count = 256;
    const minLog = Math.log10(minFreq);
    const maxLog = Math.log10(maxFreq);
    const points = Array.from({ length: count }, (_, index) => {
      const t = index / (count - 1);
      const freq = 10 ** (minLog + t * (maxLog - minLog));
      const db = clamp(getBaselineDb(freq), minGain, maxGain);
      const x = logPosition(freq) * VIEWBOX_WIDTH;
      const y = ((maxGain - db) / (maxGain - minGain)) * VIEWBOX_HEIGHT;
      return { x, y };
    });
    return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  }, [getBaselineDb, logPosition, maxFreq, maxGain, minFreq, minGain, normalizedBaseline]);

  const gridLines = useMemo(() => [-12, -6, 0, 6, 12], []);
  const knobRadiusPx = 8;
  const knobPercentPadding = (knobRadiusPx / VIEWBOX_HEIGHT) * 100;

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-2xl border border-(--surface2) bg-(--surface0)"
        style={{ height: totalHeight }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            top: PADDING + LABEL_SPACE,
            bottom: PADDING + LABEL_SPACE,
            left: PADDING,
            right: PADDING,
          }}
        >
          <svg
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            className="h-full w-full text-(--surface2)"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="eqFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--primary0)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--primary0)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {gridLines.map((line) => {
              const y = ((maxGain - line) / (maxGain - minGain)) * VIEWBOX_HEIGHT;
              const isCenter = line === 0;
              return (
                <g key={line}>
                  <line
                    x1={0}
                    y1={y}
                    x2={VIEWBOX_WIDTH}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth={isCenter ? 1 : 1}
                    strokeDasharray={isCenter ? undefined : "4 4"}
                    opacity={isCenter ? 0.22 : 0.35}
                  />
                </g>
              );
            })}
            {baselinePath ? (
              <path
                d={baselinePath}
                fill="none"
                stroke="var(--surface3)"
                strokeWidth={2}
                opacity={1}
              />
            ) : null}
            {areaPath ? (
              <path d={areaPath} fill="url(#eqFill)" opacity={0.75} />
            ) : null}
            {responsePath ? (
              <path
                d={responsePath}
                fill="none"
                stroke="var(--primary1)"
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
          </svg>
        </div>

        <div
          className="absolute z-10"
          style={{
            top: PADDING + LABEL_SPACE,
            bottom: PADDING + LABEL_SPACE,
            left: PADDING,
            right: PADDING,
          }}
        >
          {bands.map((band, index) => {
            const baselineDb = clamp(getBaselineDb(band.freq), minGain, maxGain);
            const responseDb = getResponseDb(band.freq);
            const displayDb = clamp(baselineDb + responseDb, minGain, maxGain);
            const knobPercentFromTop = clamp(
              ((maxGain - displayDb) / (maxGain - minGain)) * 100,
              knobPercentPadding,
              100 - knobPercentPadding,
            );
            const centerPercent = clamp(
              ((maxGain - baselineDb) / (maxGain - minGain)) * 100,
              knobPercentPadding,
              100 - knobPercentPadding,
            );
            const deviationPercent = Math.abs(knobPercentFromTop - centerPercent);
            const barTopPercent = Math.min(knobPercentFromTop, centerPercent);
            const bandX = logPosition(band.freq) * 100;

            return (
              <div
                key={band.freq}
                className="absolute h-full"
                style={{ left: `${bandX}%`, transform: "translateX(-50%)" }}
              >
                <span
                  className="absolute text-xs font-medium text-(--text)"
                  style={{ top: -(LABEL_SPACE - 2), left: "50%", transform: "translateX(-50%)" }}
                >
                  {formatFrequency(band.freq)}
                </span>
                <span
                  className="absolute text-xs text-(--text-grey)"
                  style={{ bottom: -(LABEL_SPACE - 2), left: "50%", transform: "translateX(-50%)" }}
                >
                  {band.gain.toFixed(1)} dB
                </span>
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  onPointerDown={(event) => handlePointerDown(index, event)}
                >
                  <div className="relative h-full w-10">
                    <div
                      className="absolute left-1/2 w-[2px] -translate-x-1/2 rounded-full"
                      style={{
                        top: `${barTopPercent}%`,
                        height: `${deviationPercent}%`,
                        backgroundColor: "var(--primary2)",
                        opacity: 0.4,
                      }}
                    />
                    <div
                      className={cn(
                        "absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-(--surface0) bg-(--primary1) shadow-sm transition-transform",
                        draggingIndex === index ? "scale-110" : "scale-100",
                      )}
                      style={{ left: "50%", top: `${knobPercentFromTop}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GraphicEQ;
