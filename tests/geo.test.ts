import { afterEach, describe, expect, it } from "vitest";
import { getWaBBox, isInWA, parseBBox } from "../lib/geo";

afterEach(() => {
  delete process.env.WA_BBOX;
});

describe("isInWA", () => {
  it("accepts points inside Washington", () => {
    expect(isInWA(47.6062, -122.3321)).toBe(true); // Seattle
    expect(isInWA(47.6588, -117.426)).toBe(true); // Spokane
  });

  it("rejects points outside Washington", () => {
    expect(isInWA(45.5152, -122.6784)).toBe(false); // Portland, OR (just south)
    expect(isInWA(40.7128, -74.006)).toBe(false); // NYC
  });
});

describe("getWaBBox", () => {
  it("falls back to the default when WA_BBOX is unset", () => {
    expect(getWaBBox()).toEqual([-124.85, 45.54, -116.91, 49.05]);
  });

  it("honors a valid WA_BBOX override", () => {
    process.env.WA_BBOX = "-120,46,-118,48";
    expect(getWaBBox()).toEqual([-120, 46, -118, 48]);
  });

  it("ignores a malformed WA_BBOX", () => {
    process.env.WA_BBOX = "garbage";
    expect(getWaBBox()).toEqual([-124.85, 45.54, -116.91, 49.05]);
  });
});

describe("parseBBox", () => {
  it("parses a valid bbox string", () => {
    expect(parseBBox("-124,45,-117,49")).toEqual([-124, 45, -117, 49]);
  });

  it("returns null for missing or invalid input", () => {
    expect(parseBBox(null)).toBeNull();
    expect(parseBBox("1,2,3")).toBeNull();
    expect(parseBBox("a,b,c,d")).toBeNull();
  });
});
