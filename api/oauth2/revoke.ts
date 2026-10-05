function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
    },
  });
}

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") return json({ ok: true });
  if (request.method === "GET") {
    return json({
      endpoint: "https://www.mel.iq/api/oauth2/revoke",
      documentation: "https://www.mel.iq/auth.md",
    });
  }
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  return json({ revoked: true });
}

export const config = { runtime: "edge" };
