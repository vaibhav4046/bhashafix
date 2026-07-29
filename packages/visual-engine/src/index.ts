import { placeholderMismatch } from "@bhashafix/linguistic-engine";
import { z } from "zod";

const PathSchema = z.array(z.string().min(1)).min(1);
const RepairSchema = z.object({
  file: z.string().min(1),
  pointer: PathSchema,
  after: z.unknown(),
});
const BaseSchema = z.object({
  issueId: z.string(),
  category: z.string(),
  locale: z.string(),
  route: z.string().startsWith("/"),
  selector: z.string(),
  sourceHint: z.string(),
  description: z.string(),
  recommendedAction: z.string(),
  repair: RepairSchema,
});

export const PredicateSchema = z.discriminatedUnion("predicate", [
  BaseSchema.extend({
    predicate: z.literal("numeric-gte"),
    actual: PathSchema,
    expected: PathSchema,
  }),
  BaseSchema.extend({
    predicate: z.literal("equals"),
    actual: PathSchema,
    value: z.unknown(),
  }),
  BaseSchema.extend({
    predicate: z.literal("not-equals"),
    actual: PathSchema,
    value: z.unknown(),
  }),
  BaseSchema.extend({
    predicate: z.literal("equals-path"),
    actual: PathSchema,
    expected: PathSchema,
  }),
  BaseSchema.extend({
    predicate: z.literal("placeholder-parity"),
    source: PathSchema,
    target: PathSchema,
  }),
]);

export type Predicate = z.infer<typeof PredicateSchema>;
export type State = Record<string, unknown>;

export function valueAt(state: State, pointer: string[]): unknown {
  let current: unknown = state;
  for (const segment of pointer) {
    if (
      !current ||
      typeof current !== "object" ||
      !(segment in (current as Record<string, unknown>))
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function evaluatePredicate(predicate: Predicate, state: State) {
  if (predicate.predicate === "numeric-gte") {
    const actual = Number(valueAt(state, predicate.actual));
    const expected = Number(valueAt(state, predicate.expected));
    return {
      passed: Number.isFinite(actual) && actual >= expected,
      evidence: { actual, expected, delta: actual - expected },
      expression: `${predicate.actual.join(".")} >= ${predicate.expected.join(".")}`,
    };
  }
  if (predicate.predicate === "equals") {
    const actual = valueAt(state, predicate.actual);
    return {
      passed: Object.is(actual, predicate.value),
      evidence: { actual, expected: predicate.value },
      expression: `${predicate.actual.join(".")} === ${JSON.stringify(predicate.value)}`,
    };
  }
  if (predicate.predicate === "not-equals") {
    const actual = valueAt(state, predicate.actual);
    return {
      passed: !Object.is(actual, predicate.value),
      evidence: { actual, forbidden: predicate.value },
      expression: `${predicate.actual.join(".")} !== ${JSON.stringify(predicate.value)}`,
    };
  }
  if (predicate.predicate === "equals-path") {
    const actual = valueAt(state, predicate.actual);
    const expected = valueAt(state, predicate.expected);
    return {
      passed: Object.is(actual, expected),
      evidence: { actual, expected },
      expression: `${predicate.actual.join(".")} === ${predicate.expected.join(".")}`,
    };
  }
  const source = String(valueAt(state, predicate.source) ?? "");
  const target = String(valueAt(state, predicate.target) ?? "");
  const parity = placeholderMismatch(source, target);
  return {
    passed: parity.valid,
    evidence: { source, target, ...parity },
    expression: `protectedTokens(${predicate.source.join(".")}) === protectedTokens(${predicate.target.join(".")})`,
  };
}

export function detectElementOverflow(measurement: {
  clientWidth: number;
  scrollWidth: number;
  clientHeight: number;
  scrollHeight: number;
  overflowX: string;
  overflowY: string;
}) {
  return {
    horizontal: measurement.scrollWidth > measurement.clientWidth + 1,
    vertical: measurement.scrollHeight > measurement.clientHeight + 1,
    clipsHorizontally:
      measurement.scrollWidth > measurement.clientWidth + 1 &&
      ["hidden", "clip"].includes(measurement.overflowX),
    clipsVertically:
      measurement.scrollHeight > measurement.clientHeight + 1 &&
      ["hidden", "clip"].includes(measurement.overflowY),
  };
}

export function detectViewportOverflow(documentWidth: number, viewportWidth: number) {
  return {
    overflow: documentWidth > viewportWidth + 1,
    delta: documentWidth - viewportWidth,
  };
}
