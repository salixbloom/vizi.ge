"use client";

import FingerprintJS from "@fingerprintjs/fingerprintjs";

const UUID_KEY = "vizi.device.uuid";

function getOrCreateUuid(): string {
  let uuid = localStorage.getItem(UUID_KEY);
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem(UUID_KEY, uuid);
  }
  return uuid;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

let cached: string | null = null;

/**
 * Soft "hardware ID": an open-source browser fingerprint combined with a
 * per-device UUID, hashed together. NOTE: this is evadable (clearing storage /
 * switching browsers resets it) — it deters casual repeat submissions but the
 * real backstop is IP throttling + admin moderation.
 */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  const fp = await FingerprintJS.load();
  const { visitorId } = await fp.get();
  const uuid = getOrCreateUuid();
  cached = await sha256Hex(`${visitorId}:${uuid}`);
  return cached;
}
