import * as d3Shape from "d3-shape";
import * as d3Scale from "d3-scale";
import { useEffect, useMemo, useRef, useState } from "react";
import { getBiquadMagnitude, interpolateSPL } from "../../utils/squig";
import type { DataPoint } from "../../utils/fr";

const MIN_FREQ = 20;
const MAX_FREQ = 20000;
const GRAPH_POINTS = 300;
const COLOR_HUE_STEP = 165;
const COLOR_SATURATION_BOOST = 1.3;
const COLOR_CONTRAST_BOOST = 1.05;

export enum FilterType {
  PEAK = "PEAK",
  LOW_SHELF = "LOW_SHELF",
  HIGH_SHELF = "HIGH_SHELF",
  LOW_PASS = "LOW_PASS",
  HIGH_PASS = "HIGH_PASS",
};

export type eqFilter = {
  id: string;
  type: FilterType;
  freq: number;
  gain: number;
  q: number;
  enabled: boolean;
};

export type ProcessedGraphData = {
  freq: number;
  baseline: number;
  total: number;
  filters: number[];
};

type SquigGraphProps = {
  filters: eqFilter[];
  preamp: number;
  measurementData: DataPoint[] | null;
};

const SquigGraph = ({
  filters,
  preamp,
  measurementData,
}: SquigGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const height = 400;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // prep data
  const graphData = useMemo<ProcessedGraphData[]>(() => {
    // Generate log-spaced frequency points
    const points: ProcessedGraphData[] = [];
    const logMin = Math.log10(MIN_FREQ);
    const logMax = Math.log10(MAX_FREQ);

    // Normalize measurement data if exists
    let normalizedMeasurement: DataPoint[] = [];
    if (measurementData && measurementData.length > 0) {
      // Find 500Hz SPL 0 point
      const spl500 = interpolateSPL(500, measurementData);
      normalizedMeasurement = measurementData.map(d => ({
        freq: d.freq,
        spl: d.spl - spl500,
      }));
    }

    for (let i = 0; i < GRAPH_POINTS; i++) {
      const logFreq = logMin + (i / (GRAPH_POINTS - 1)) * (logMax - logMin);
      const freq = Math.pow(10, logFreq);

      let baseline = 0;
      if (normalizedMeasurement.length > 0) {
        baseline = interpolateSPL(freq, normalizedMeasurement);
      }

      const individualFilterResponses = filters.map(f => getBiquadMagnitude(f, freq));
      const totalFilterResponse = individualFilterResponses.reduce((a, b) => a + b, 0);
      const total = baseline + preamp + totalFilterResponse;

      points.push({
        freq,
        baseline,
        total,
        // Visualized on top of baseline
        filters: individualFilterResponses.map(r => baseline + r),
      });
    }
    return points;
  }, [filters, preamp, measurementData]);

  // 2. Scales
  const xScale = useMemo(() => {
    return d3Scale.scaleLog()
      .domain([MIN_FREQ, MAX_FREQ])
      .range([padding.left, width - padding.right]);
  }, [width]);

  const yScale = useMemo(() => {
    if (graphData.length === 0) return d3Scale.scaleLinear();

    // Calculate dynamic domain
    let mindB = -20;
    let maxdB = 20;

    graphData.forEach(d => {
      mindB = Math.min(mindB, d.baseline, d.total, ...d.filters);
      maxdB = Math.max(maxdB, d.baseline, d.total, ...d.filters);
    });

    // Add headroom
    const span = maxdB - mindB;
    mindB -= span * 0.1;
    maxdB += span * 0.1;

    // Clamp minimum range to avoid flat line zoom
    if (maxdB - mindB < 10) {
      const mid = (maxdB + mindB) / 2;
      maxdB = mid + 5;
      mindB = mid - 5;
    }

    return d3Scale.scaleLinear()
      .domain([mindB, maxdB])
      .range([height - padding.bottom, padding.top]);
  }, [graphData, height]);

  // 3. Lines
  const lineGenerator = d3Shape.line<ProcessedGraphData>()
    .x(d => xScale(d.freq))
    .y(d => yScale(d.total))
    .curve(d3Shape.curveMonotoneX);

  const baselineGenerator = d3Shape.line<ProcessedGraphData>()
    .x(d => xScale(d.freq))
    .y(d => yScale(d.baseline))
    .curve(d3Shape.curveMonotoneX);

  // Area generators (Custom Polygon Logic for correct filling)
  const createFillPath = (
    topValueAccessor: (d: ProcessedGraphData) => number,
    bottomValueAccessor: (d: ProcessedGraphData) => number,
  ) => {
    if (!graphData.length) return "";
    const forward = graphData.map(d => [xScale(d.freq), yScale(topValueAccessor(d))]);
    const backward = [...graphData].reverse().map(d => [xScale(d.freq), yScale(bottomValueAccessor(d))]);

    const d = [
      "M", forward[0][0], forward[0][1],
      ...forward.slice(1).map(p => `L ${p[0]} ${p[1]}`),
      ...backward.map(p => `L ${p[0]} ${p[1]}`),
      "Z",
    ].join(" ");

    return d;
  };

  // 4. Axis ticks
  const xTicks = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  const yTicks = yScale.ticks(8);

  if (!width) {
    return (
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-2xl border border-(--surface2) bg-(--surface0)"
        style={{ height }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden rounded-2xl border border-(--surface2) bg-(--surface0)"
    >
      <svg width={width} height={height}>
        <defs>
          <linearGradient id="squig-total-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary0)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--primary0)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Axes Labels */}
        <g className="text-xs fill-[var(--text-grey)]">
          {xTicks.map(tick => (
            <text
              key={`xlabel-${tick}`}
              x={xScale(tick)}
              y={height - 10}
              textAnchor="middle"
            >
              {tick >= 1000 ? `${tick / 1000}k` : tick}
            </text>
          ))}
          {yTicks.map(tick => (
            <text
              key={`ylabel-${tick}`}
              x={40}
              y={yScale(tick) + 4}
              textAnchor="end"
            >
              {tick} dB
            </text>
          ))}
        </g>

        {/* Baseline */}
        <path
          d={baselineGenerator(graphData) || ""}
          fill="none"
          stroke="var(--surface3)"
          strokeWidth={2}
          className="opacity-85"
        />

        {/* Individual Filters */}
        {filters.map((filter, index) => {
          if (!filter.enabled) return null;
          const hueRotate = index * COLOR_HUE_STEP;
          const strokeOpacity = Math.max(0.45, 0.78 - index * 0.08);
          const fillOpacity = Math.max(0.08, 0.16 - index * 0.015);

          const filterLinePath = d3Shape.line<ProcessedGraphData>()
            .x(d => xScale(d.freq))
            .y(d => yScale(d.filters[index]))
            .curve(d3Shape.curveMonotoneX)(graphData);

          // Top: Filter effect
          // Bottom: Baseline
          const fillPath = createFillPath(
            d => d.filters[index],
            d => d.baseline,
          );

          return (
            <g
              key={filter.id}
              style={{ filter: `hue-rotate(${hueRotate}deg) saturate(${COLOR_SATURATION_BOOST}) contrast(${COLOR_CONTRAST_BOOST})` }}
            >
              {/* Fill Area */}
              <path
                d={fillPath}
                fill="var(--primary0)"
                fillOpacity={fillOpacity}
                className="theme-transition"
              />
              {/* Line */}
              <path
                d={filterLinePath || ""}
                fill="none"
                stroke="var(--primary2)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                strokeOpacity={strokeOpacity}
                className="theme-transition"
              />
            </g>
          );
        })}

        {/* Total Response */}
        <g>
          {/* Total Fill Area */}
          <path
            d={createFillPath(d => d.total, d => d.baseline)}
            fill="url(#squig-total-fill)"
            className="theme-transition"
          />
          {/* Total Line */}
          <path
            d={lineGenerator(graphData) || ""}
            fill="none"
            stroke="var(--primary1)"
            strokeWidth={2.5}
            className="theme-transition"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Zero Line Marker */}
        {yScale(0) > padding.top && yScale(0) < height - padding.bottom && (
          <line
            x1={padding.left}
            y1={yScale(0)}
            x2={width - padding.right}
            y2={yScale(0)}
            stroke="var(--primary2)"
            strokeWidth={1}
            strokeOpacity={0.2}
          />
        )}
      </svg>
    </div>
  );
};

export default SquigGraph;
