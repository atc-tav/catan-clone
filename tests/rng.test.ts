import { describe, expect, it } from "vitest";
import { Rng } from "../src/core/rng/Rng.js";

describe("Rng", () => {
  it("is deterministic for a given seed", () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    const seqA = Array.from({ length: 20 }, () => a.nextUint32());
    const seqB = Array.from({ length: 20 }, () => b.nextUint32());
    expect(seqA).toEqual(seqB);
  });

  it("produces different streams for different seeds", () => {
    const a = new Rng(1);
    const b = new Rng(2);
    expect(a.nextUint32()).not.toEqual(b.nextUint32());
  });

  it("rolls dice within [1,6]", () => {
    const rng = new Rng(99);
    for (let i = 0; i < 1000; i++) {
      const d = rng.rollDie();
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(6);
    }
  });

  it("shuffle is a permutation and state can be saved/restored", () => {
    const rng = new Rng(7);
    const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const shuffled = rng.shuffle([...input]);
    expect([...shuffled].sort((x, y) => x - y)).toEqual(input);

    const saved = rng.getState();
    const next1 = rng.nextUint32();
    rng.setState(saved);
    const next2 = rng.nextUint32();
    expect(next1).toEqual(next2);
  });
});
