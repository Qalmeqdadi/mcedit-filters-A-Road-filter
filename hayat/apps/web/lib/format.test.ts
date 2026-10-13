import { describe, expect, it } from "vitest";

import { formatAed, formatDays, formatSigned, humanizeChokepoint } from "./format";
import { APPROACH_LANES, MAP_HEIGHT, MAP_WIDTH, UAE_OUTLINE, inView, project } from "./geo";

describe("format", () => {
  it("formats AED magnitudes", () => {
    expect(formatAed(1_109_100_000)).toBe("AED 1.11B");
    expect(formatAed(138_740_000)).toBe("AED 138.7M");
    expect(formatAed(0)).toBe("AED 0");
  });

  it("formats days and signed deltas", () => {
    expect(formatDays(4.6)).toBe("4.6d");
    expect(formatDays(null)).toBe("—");
    expect(formatSigned(-21.715)).toBe("-21.7");
    expect(formatSigned(2)).toBe("+2.0");
    expect(formatSigned(-0.01)).toBe("0.0");
  });

  it("humanizes chokepoint codes", () => {
    expect(humanizeChokepoint("BAB_EL_MANDEB")).toBe("Bab el-Mandeb");
    expect(humanizeChokepoint("CAPE_OF_GOOD_HOPE")).toBe("Cape of Good Hope");
  });
});

describe("geo", () => {
  it("projects the view corners onto the canvas", () => {
    expect(project([51.4, 27.0])).toEqual([0, 0]);
    const [x, y] = project([57.5, 22.6]);
    expect(x).toBeCloseTo(MAP_WIDTH, 0);
    expect(y).toBeCloseTo(MAP_HEIGHT, 0);
  });

  it("keeps north up and east right", () => {
    const [dubaiX, dubaiY] = project([55.27, 25.2]);
    const [abuDhabiX, abuDhabiY] = project([54.37, 24.47]);
    expect(dubaiX).toBeGreaterThan(abuDhabiX);
    expect(dubaiY).toBeLessThan(abuDhabiY);
  });

  it("keeps the UAE outline and approach lanes inside the view", () => {
    expect(UAE_OUTLINE.every(inView)).toBe(true);
    for (const lane of Object.values(APPROACH_LANES)) expect(lane.every(inView)).toBe(true);
  });
});
