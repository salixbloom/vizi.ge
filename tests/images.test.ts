import { describe, expect, it } from "vitest";
import { sniffMime } from "../lib/images";

describe("sniffMime", () => {
  it("detects JPEG", () => {
    expect(sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe("image/jpeg");
  });

  it("detects PNG", () => {
    expect(sniffMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe("image/png");
  });

  it("detects WebP", () => {
    const b = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from("WEBP", "ascii"),
    ]);
    expect(sniffMime(b)).toBe("image/webp");
  });

  it("rejects unknown / spoofed content", () => {
    expect(sniffMime(Buffer.from("GIF89a", "ascii"))).toBeNull();
    expect(sniffMime(Buffer.from("<?php evil ?>", "ascii"))).toBeNull();
  });
});
