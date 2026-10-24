import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

// a name no earlier run or retry left behind on the instance
export const unique = (name: string) => `${name}-${Date.now().toString(36)}`;

// uploads a fixture under its own name, so every test finds exactly its document
export async function upload(page: Page, fixture: string, name: string) {
  await page.locator("input[type=file]").setInputFiles({
    name: `${name}.pdf`,
    mimeType: "application/pdf",
    buffer: fs.readFileSync(path.join(__dirname, "fixtures", fixture)),
  });
}

// RFC 6238 code like internal/model/totp.go, offset in 30 s steps
export function totp(secret: string, offset = 0) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.trim()) {
    bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  }
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + offset));
  const sum = crypto.createHmac("sha1", key).update(msg).digest();
  const value = sum.readUInt32BE(sum[sum.length - 1] & 0x0f) & 0x7fffffff;
  return String(value % 1000000).padStart(6, "0");
}
