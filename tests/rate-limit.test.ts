import { afterEach, describe, expect, it } from "vitest";
import { maxPerDay } from "../lib/rate-limit";

afterEach(() => {
  delete process.env.MAX_SUBMISSIONS_PER_DAY;
});

describe("maxPerDay", () => {
  it("defaults to 3 when unset", () => {
    expect(maxPerDay()).toBe(3);
  });

  it("reads a positive override", () => {
    process.env.MAX_SUBMISSIONS_PER_DAY = "5";
    expect(maxPerDay()).toBe(5);
  });

  it("falls back to 3 for invalid / non-positive values", () => {
    process.env.MAX_SUBMISSIONS_PER_DAY = "0";
    expect(maxPerDay()).toBe(3);
    process.env.MAX_SUBMISSIONS_PER_DAY = "nope";
    expect(maxPerDay()).toBe(3);
  });
});
