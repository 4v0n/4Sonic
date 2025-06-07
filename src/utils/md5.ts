const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const K = Array.from({ length: 64 }, (_, i) =>
  Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000),
);

function toBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function toHex(num: number): string {
  return ("00000000" + num.toString(16)).slice(-8);
}

export default function md5(str: string): string {
  const bytes = toBytes(str);
  const l = bytes.length;
  const bitLen = l * 8;
  const blocks: number[] = [];

  for (let i = 0; i < l; i++) {
    blocks[i >> 2] |= bytes[i] << ((i % 4) * 8);
  }

  blocks[bitLen >> 5] |= 0x80 << bitLen % 32;
  blocks[(((bitLen + 64) >>> 9) << 4) + 14] = bitLen;

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let i = 0; i < blocks.length; i += 16) {
    let A = a;
    let B = b;
    let C = c;
    let D = d;

    for (let j = 0; j < 64; j++) {
      let F: number;
      let g: number;
      if (j < 16) {
        F = (b & c) | (~b & d);
        g = j;
      } else if (j < 32) {
        F = (d & b) | (~d & c);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        F = b ^ c ^ d;
        g = (3 * j + 5) % 16;
      } else {
        F = c ^ (b | ~d);
        g = (7 * j) % 16;
      }
      const tmp = d;
      d = c;
      c = b;
      const x = ((a + F + K[j] + (blocks[i + g] || 0)) >>> 0);
      const rot = ((x << S[j]) | (x >>> (32 - S[j]))) >>> 0;
      b = (b + rot) >>> 0;
      a = tmp;
    }

    a = (a + A) >>> 0;
    b = (b + B) >>> 0;
    c = (c + C) >>> 0;
    d = (d + D) >>> 0;
  }

  return [toHex(a), toHex(b), toHex(c), toHex(d)].join("");
}

