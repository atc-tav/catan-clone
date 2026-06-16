/**
 * Deterministic, seedable pseudo-random number generator.
 *
 * Uses Mulberry32 — a tiny, fast, well-distributed 32-bit PRNG. It is chosen
 * deliberately because it is trivial to reimplement *byte-for-byte* in C#,
 * which means a given seed produces the identical board and dice sequence in
 * both the TypeScript prototype and the future Unity port. Do not replace this
 * with Math.random(): determinism is a hard requirement for reproducible games,
 * tests, and (eventually) networked play / replays.
 *
 * C# port note: back this with a `uint state` field and use `unchecked`
 * arithmetic to mirror JavaScript's `Math.imul` / `>>> 0` wraparound.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // Force to an unsigned 32-bit integer.
    this.state = seed >>> 0;
  }

  /** Returns the raw internal state — useful for serializing a game in progress. */
  getState(): number {
    return this.state >>> 0;
  }

  /** Restores a previously captured state (see {@link getState}). */
  setState(state: number): void {
    this.state = state >>> 0;
  }

  /** Next 32-bit unsigned integer in [0, 2^32). */
  nextUint32(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  /** Next float in [0, 1). */
  nextFloat(): number {
    return this.nextUint32() / 0x100000000;
  }

  /** Uniform integer in [minInclusive, maxInclusive]. */
  nextInt(minInclusive: number, maxInclusive: number): number {
    const span = maxInclusive - minInclusive + 1;
    return minInclusive + Math.floor(this.nextFloat() * span);
  }

  /** Rolls a single six-sided die (1..6). */
  rollDie(): number {
    return this.nextInt(1, 6);
  }

  /**
   * In-place Fisher–Yates shuffle. Deterministic for a given seed/state, which
   * is how the board terrain, number tokens, and dev-card deck are arranged.
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }
}
