/**
 * Small seeded random number generator (mulberry32) so that every generated
 * problem can be reproduced from its seed.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  bool(probability?: number): boolean;
  shuffle<T>(items: readonly T[]): T[];
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => {
    if (max < min) throw new RangeError(`int(${min}, ${max}): empty range`);
    return min + Math.floor(next() * (max - min + 1));
  };
  return {
    next,
    int,
    pick: (items) => {
      if (items.length === 0) throw new RangeError("pick from empty list");
      return items[int(0, items.length - 1)];
    },
    bool: (probability = 0.5) => next() < probability,
    shuffle: (items) => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = int(0, i);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

/** Deterministically mixes a base seed with extra parts (FNV-1a over the text form). */
export function deriveSeed(base: number, ...parts: Array<number | string>): number {
  let h = 0x811c9dc5 ^ (base >>> 0);
  const text = parts.join("|");
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** A fresh random seed for a new session. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32) >>> 0;
}
