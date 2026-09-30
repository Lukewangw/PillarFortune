/**
 * Deterministic pseudo-random numbers for the draw engine.
 *
 * Everything here uses 32-bit integer arithmetic only (no floating point), so the
 * same seed yields bit-identical results in every JavaScript runtime: the browser,
 * the Cloudflare Worker and Node (evals). That property is what lets the server
 * recompute and verify a draw that the client displayed.
 */

/** cyrb128: fast 128-bit string hash, used to derive PRNG state from a seed string. */
export function cyrb128(input: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < input.length; i++) {
    const k = input.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

/** xoshiro128** (Blackman & Vigna): 128-bit state, period 2^128 − 1. */
export class Xoshiro128 {
  private readonly s: Uint32Array;

  constructor(state: readonly [number, number, number, number]) {
    this.s = Uint32Array.from(state);
    if (this.s.every((word) => word === 0)) this.s[0] = 0x9e3779b9; // all-zero state is a fixed point
  }

  static fromSeed(seed: string): Xoshiro128 {
    return new Xoshiro128(cyrb128(seed));
  }

  /** Uniform 32-bit unsigned integer. */
  nextU32(): number {
    const s = this.s;
    const result = Math.imul(rotl(Math.imul(s[1], 5) >>> 0, 7), 9) >>> 0;
    const t = (s[1] << 9) >>> 0;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = rotl(s[3], 11);
    return result;
  }

  /** Unbiased integer in [0, n) via rejection sampling (no modulo bias). */
  nextInt(n: number): number {
    if (!Number.isInteger(n) || n <= 0 || n > 0x100000000) throw new RangeError(`nextInt: invalid bound ${n}`);
    const limit = 0x100000000 - (0x100000000 % n);
    let x = this.nextU32();
    while (x >= limit) x = this.nextU32();
    return x % n;
  }

  /** Bernoulli trial with probability numerator / 2^32. */
  chance(numerator: number): boolean {
    return this.nextU32() < numerator;
  }
}

/** A fresh 128-bit seed as 32 lowercase hex characters, from the platform CSPRNG. */
export function randomSeed(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
