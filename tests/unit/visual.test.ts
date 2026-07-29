import { describe, expect, it } from "vitest";
import {
  detectElementOverflow,
  detectViewportOverflow,
} from "@bhashafix/visual-engine";

describe("visual predicates", () => {
  it("distinguishes overflow from clipping", () => {
    const result = detectElementOverflow({
      clientWidth: 160,
      scrollWidth: 210,
      clientHeight: 40,
      scrollHeight: 40,
      overflowX: "hidden",
      overflowY: "visible",
    });
    expect(result.horizontal).toBe(true);
    expect(result.clipsHorizontally).toBe(true);
    expect(result.vertical).toBe(false);
  });

  it("detects document width beyond the viewport", () => {
    expect(detectViewportOverflow(391, 390).overflow).toBe(false);
    expect(detectViewportOverflow(410, 390)).toEqual({
      overflow: true,
      delta: 20,
    });
  });
});
