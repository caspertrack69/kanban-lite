import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Compares passwords in constant time by hashing both values first, which
 * also makes differing lengths safe for timingSafeEqual.
 */
export function passwordMatches(
  input: string,
  expected: string | undefined,
): boolean {
  if (!expected) return false;
  return timingSafeEqual(digest(input), digest(expected));
}
