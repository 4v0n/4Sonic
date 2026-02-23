import { eqFilter, FilterType } from "../components/ui/SquigGraph";


export const getBiquadMagnitude = (
  filter: eqFilter,
  freq: number,
  fs: number = 48000,
): number => {
  if (!filter.enabled) return 0;

  const w0 = (2 * Math.PI * filter.freq) / fs;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * filter.q);
  // For peaking/shelving EQ
  const A = Math.pow(10, filter.gain / 40);

  let b0 = 0, b1 = 0, b2 = 0, a0 = 0, a1 = 0, a2 = 0;

  switch (filter.type) {
  case FilterType.PEAK:
    b0 = 1 + alpha * A;
    b1 = -2 * cosW0;
    b2 = 1 - alpha * A;
    a0 = 1 + alpha / A;
    a1 = -2 * cosW0;
    a2 = 1 - alpha / A;
    break;
  case FilterType.LOW_SHELF:
    b0 = A * ((A + 1) - (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha);
    b1 = 2 * A * ((A - 1) - (A + 1) * cosW0);
    b2 = A * ((A + 1) - (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha);
    a0 = (A + 1) + (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha;
    a1 = -2 * ((A - 1) + (A + 1) * cosW0);
    a2 = (A + 1) + (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha;
    break;
  case FilterType.HIGH_SHELF:
    b0 = A * ((A + 1) + (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha);
    b1 = -2 * A * ((A - 1) + (A + 1) * cosW0);
    b2 = A * ((A + 1) + (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha);
    a0 = (A + 1) - (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha;
    a1 = 2 * ((A - 1) - (A + 1) * cosW0);
    a2 = (A + 1) - (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha;
    break;
  case FilterType.LOW_PASS:
    b0 = (1 - cosW0) / 2;
    b1 = 1 - cosW0;
    b2 = (1 - cosW0) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cosW0;
    a2 = 1 - alpha;
    break;
  case FilterType.HIGH_PASS:
    b0 = (1 + cosW0) / 2;
    b1 = -(1 + cosW0);
    b2 = (1 + cosW0) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cosW0;
    a2 = 1 - alpha;
    break;
  default:
    return 0;
  }

  // Evaluate transfer function at z = e^(jw)
  // H(z) = (b0 + b1 z^-1 + b2 z^-2) / (a0 + a1 z^-1 + a2 z^-2)
  // Let phi = w (normalized freq 0..pi). Actual w here is w0 * (freq / centerFreq)?
  // No, w is 2*pi*f/fs.

  const w = (2 * Math.PI * freq) / fs;
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);

  // Real and Imaginary parts of Num (Numerator) and Den (Denominator)
  // z^-1 = cos(w) - j*sin(w)
  // z^-2 = cos(2w) - j*sin(2w)

  const cos2W = Math.cos(2 * w);
  const sin2W = Math.sin(2 * w);

  const numRe = b0 + b1 * cosW + b2 * cos2W;
  const numIm = -b1 * sinW - b2 * sin2W;

  const denRe = a0 + a1 * cosW + a2 * cos2W;
  const denIm = -a1 * sinW - a2 * sin2W;

  const magSquared = (numRe * numRe + numIm * numIm) / (denRe * denRe + denIm * denIm);

  return 10 * Math.log10(magSquared);
};

export const interpolateSPL = (freq: number, data: {freq: number, spl: number}[]): number => {
  if (data.length === 0) return 0;
  if (freq <= data[0].freq) return data[0].spl;
  if (freq >= data[data.length - 1].freq) return data[data.length - 1].spl;

  // Binary search for performance
  let low = 0;
  let high = data.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (data[mid].freq < freq) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // 'low' is now the index of the first element > freq (or length)
  // We want the element before that
  const i = Math.max(0, low - 1);
  const p1 = data[i];
  const p2 = data[i + 1];

  if (!p2) return p1.spl;

  // Linear interpolation on log freq scale usually better, but linear is fine for dense data
  const t = (freq - p1.freq) / (p2.freq - p1.freq);
  return p1.spl + t * (p2.spl - p1.spl);
};