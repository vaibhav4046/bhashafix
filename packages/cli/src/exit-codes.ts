/**
 * Documented process exit codes. These are a public contract: CI gates and the
 * packaged smoke tests branch on them, so a value here may be added to but
 * never repurposed.
 */
export const EXIT = {
  passed: 0,
  blocking: 1,
  invalidConfig: 2,
  unavailable: 3,
  runtime: 4,
  provider: 5,
} as const;
