const crypto = require("crypto");
const { defineConfig } = require("cypress");

// RFC 6238 code like internal/model/totp.go, offset in 30 s steps
function totp({ secret, offset = 0 }) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.trim()) {
    bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  }
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + offset));
  const sum = crypto.createHmac("sha1", key).update(msg).digest();
  const value = sum.readUInt32BE(sum[sum.length - 1] & 0x0f) & 0x7fffffff;
  return String(value % 1000000).padStart(6, "0");
}

module.exports = defineConfig({
  // retry flaky specs in `cypress run`, fail fast in `cypress open`
  retries: {
    runMode: 3,
    openMode: 0,
  },
  defaultCommandTimeout: 8000,
  // the bundled macOS trash is x86_64 only, `make e2e` cleans up instead
  trashAssetsBeforeRuns: false,
  e2e: {
    // the e2e service from compose.yaml, started by `make e2e`
    baseUrl: "http://localhost:3002",
    video: false,
    setupNodeEvents(on) {
      on("task", { totp });
    },
  },
});
