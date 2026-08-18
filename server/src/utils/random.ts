import { randomInt } from "node:crypto";

/**
 * Server-side randomness for game-critical choices.
 * Uses Node's cryptographically secure RNG instead of Math.random().
 */
export function secureRandomIndex(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) return 0;
  return randomInt(0, maxExclusive);
}

export function secureShuffle<T>(input: readonly T[]): T[] {
  const copy = [...input];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = secureRandomIndex(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
