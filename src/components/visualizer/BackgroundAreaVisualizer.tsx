import { useEffect, useRef } from "react";
import type { VisualizerPoint } from "../../types/visualizer";

type BackgroundAreaVisualizerProps = {
  frequencyData: VisualizerPoint[];
  color: string;
  opacity: number;
  blur: number;
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
};

const BackgroundAreaVisualizer = ({ frequencyData, color, opacity, blur }: BackgroundAreaVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const container = canvas?.parentElement;
    if (!context || !canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      context.scale(dpr, dpr);
    }

    const { width, height } = rect;
    if (width === 0 || height === 0) {
      return;
    }
    context.clearRect(0, 0, width, height);

    const createSmoothPath = (ctx: CanvasRenderingContext2D, isArea: boolean) => {
      const numPoints = frequencyData.length;
      ctx.beginPath();

      if (numPoints < 2) {
        if (isArea) {
          ctx.moveTo(0, height);
          if (numPoints === 1) {
            const y = height - frequencyData[0].normalizedPeakRatio * height;
            ctx.lineTo(0, y);
            ctx.lineTo(width, y);
          }
          ctx.lineTo(width, height);
          ctx.closePath();
        }
        return;
      }

      const points = frequencyData.map((point, index) => ({
        x: (index / (numPoints - 1)) * width,
        y: height - point.normalizedPeakRatio * height,
      }));

      if (isArea) {
        ctx.moveTo(0, height);
        ctx.lineTo(points[0].x, points[0].y);
      } else {
        ctx.moveTo(points[0].x, points[0].y);
      }

      if (points.length < 3) {
        ctx.lineTo(points[1].x, points[1].y);
      } else {
        let i;
        for (i = 1; i < points.length - 2; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        ctx.quadraticCurveTo(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
      }

      if (isArea) {
        ctx.lineTo(width, height);
        ctx.closePath();
      }
    };

    context.strokeStyle = color;
    context.lineWidth = 1.5;
    createSmoothPath(context, false);
    context.stroke();

    const rgbColor = hexToRgb(color);
    if (rgbColor) {
      const areaGradientPlayed = context.createLinearGradient(0, 0, 0, height);
      areaGradientPlayed.addColorStop(0, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.6)`);
      areaGradientPlayed.addColorStop(1, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0)`);
      context.fillStyle = areaGradientPlayed;
      createSmoothPath(context, true);
      context.fill();
    }
  }, [frequencyData, color]);

  return (
    <div className="h-full w-full" style={{ opacity, filter: `blur(${blur}px)` }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

export default BackgroundAreaVisualizer;
