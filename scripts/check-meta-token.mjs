import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
const raw = readFileSync(envPath, "utf8");
const env = Object.fromEntries(
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const pixelId = env.META_PIXEL_ID || "1062862283473154";
const token = env.META_ACCESS_TOKEN || "";
const testCode = env.META_TEST_EVENT_CODE || "";

console.log("PIXEL_ID=", pixelId);
console.log("TOKEN_SET=", Boolean(token));
console.log("TOKEN_LEN=", token.length);
console.log("TEST_CODE=", testCode || "(none)");

if (!token) {
  console.error("META_ACCESS_TOKEN فارغ في .env.local");
  process.exit(2);
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const eventId = `purchase_test_${Date.now().toString(36)}`;
const em = await sha256Hex("meta-test@mel.iq");
const ph = await sha256Hex("9647700000000");
const payload = {
  data: [
    {
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: "website",
      event_source_url: "https://www.mel.iq/checkout",
      user_data: {
        em: [em],
        ph: [ph],
        client_user_agent: "meli-token-check/1.0",
        client_ip_address: "8.8.8.8",
      },
      custom_data: {
        value: 25000,
        currency: "IQD",
        content_name: "purchase-token-check",
        order_id: eventId,
      },
    },
  ],
  partner_agent: "meli-web-capi-1.0",
};
if (testCode) payload.test_event_code = testCode;

const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`;
const res = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
});
const body = await res.json().catch(async () => ({ raw: await res.text() }));

console.log("HTTP=", res.status);
console.log("EVENT_ID=", eventId);
console.log("META=", JSON.stringify(body));
process.exit(res.ok ? 0 : 1);
