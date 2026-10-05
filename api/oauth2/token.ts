function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers":
        "content-type, authorization, x-www-form-urlencoded",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "www-authenticate":
        'Bearer realm="mel", resource_metadata="https://www.mel.iq/.well-known/oauth-protected-resource"',
    },
  });
}

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") return json({ ok: true });
  if (request.method === "GET") {
    return json({
      endpoint: "https://www.mel.iq/api/oauth2/token",
      grant_types_supported: [
        "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "urn:workos:agent-auth:grant-type:claim",
      ],
      documentation: "https://www.mel.iq/auth.md",
    });
  }
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  return json(
    {
      error: "invalid_grant",
      error_description:
        "Provide a valid identity_assertion or claim_token issued by Mel agent registration. See https://www.mel.iq/auth.md",
    },
    400,
  );
}

export const config = { runtime: "edge" };
