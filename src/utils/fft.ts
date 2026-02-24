const TWO_PI = Math.PI * 2;

const isPowerOfTwo = (value: number): boolean => value > 0 && (value & (value - 1)) === 0;

const reverseBits = (value: number, bits: number): number => {
  let reversed = 0;
  for (let i = 0; i < bits; i += 1) {
    reversed = (reversed << 1) | ((value >> i) & 1);
  }
  return reversed;
};

export const applyHannWindow = (input: Float32Array, output: Float32Array): number => {
  const size = input.length;
  let windowSum = 0;

  for (let i = 0; i < size; i += 1) {
    const window = 0.5 * (1 - Math.cos((TWO_PI * i) / (size - 1)));
    output[i] = input[i] * window;
    windowSum += window;
  }

  return windowSum;
};

export class RealFft {
  private readonly size: number;
  private readonly bits: number;
  private readonly bitReverseIndices: Uint32Array;

  public constructor(size: number) {
    if (!isPowerOfTwo(size)) {
      throw new Error(`FFT size must be power of two, received ${size}`);
    }

    this.size = size;
    this.bits = Math.log2(size);
    this.bitReverseIndices = new Uint32Array(size);

    for (let i = 0; i < size; i += 1) {
      this.bitReverseIndices[i] = reverseBits(i, this.bits);
    }
  }

  public transform(input: Float32Array, real: Float32Array, imag: Float32Array): void {
    if (input.length !== this.size || real.length !== this.size || imag.length !== this.size) {
      throw new Error("FFT buffers must all match configured size");
    }

    for (let i = 0; i < this.size; i += 1) {
      const target = this.bitReverseIndices[i];
      real[target] = input[i];
      imag[target] = 0;
    }

    for (let len = 2; len <= this.size; len <<= 1) {
      const halfLen = len >> 1;
      const phaseStep = -TWO_PI / len;

      for (let offset = 0; offset < this.size; offset += len) {
        for (let k = 0; k < halfLen; k += 1) {
          const evenIndex = offset + k;
          const oddIndex = evenIndex + halfLen;

          const angle = phaseStep * k;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          const oddRe = real[oddIndex];
          const oddIm = imag[oddIndex];

          const twiddleRe = oddRe * cos - oddIm * sin;
          const twiddleIm = oddRe * sin + oddIm * cos;

          const evenRe = real[evenIndex];
          const evenIm = imag[evenIndex];

          real[evenIndex] = evenRe + twiddleRe;
          imag[evenIndex] = evenIm + twiddleIm;
          real[oddIndex] = evenRe - twiddleRe;
          imag[oddIndex] = evenIm - twiddleIm;
        }
      }
    }
  }
}
