export interface AudioFileInfo {
  suffix?: string;
  bitDepth?: number;
  samplingRate?: number;
}

export const formatSampleRate = (hz: number) => {
  const khz = hz / 1000;
  return `${Number.isInteger(khz) ? khz : khz.toFixed(1)} kHz`;
};

const formatRange = (values: number[], format: (value: number) => string) => {
  if (values.length === 0) return undefined;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? format(min) : `${format(min)} – ${format(max)}`;
};

const distinct = <T>(values: (T | undefined)[]) =>
  Array.from(new Set(values.filter((value): value is T => value !== undefined && value !== null && value !== 0 && value !== "")));

export const formatCollectionQuality = (files: AudioFileInfo[]): string | undefined => {
  const formats = distinct(files.map((file) => file.suffix?.toUpperCase()));
  const depth = formatRange(distinct(files.map((file) => file.bitDepth)), (value) => `${value}-bit`);
  const rate = formatRange(distinct(files.map((file) => file.samplingRate)), formatSampleRate);
  const resolution = depth && rate ? `${depth} / ${rate}` : rate;
  const parts = [formats.join(", "), resolution].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
};
