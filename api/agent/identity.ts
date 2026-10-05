function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, authorization",
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
      endpoint: "https://www.mel.iq/api/agent/identity",
      documentation: "https://www.mel.iq/auth.md",
      identity_types_supported: [
        "anonymous",
        "identity_assertion",
        "service_auth",
      ],
    });
  }

  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid_request", error_description: "JSON body required" }, 400);
  }

  const type = String(body.type ?? "");
  if (!["anonymous", "identity_assertion", "service_auth"].includes(type)) {
    return json(
      {
        error: "invalid_request",
        error_description:
          "type must be anonymous | identity_assertion | service_auth",
      },
      400,
    );
  }

  // Discovery-ready stub: endpoints exist and speak the auth.md protocol shape.
  // Full credential issuance is provisioned per merchant — see auth.md.
  return json(
    {
      error: "authorization_pending",
      error_description:
        "Mel agent registration is discoverable. Complete merchant provisioning via https://www.mel.iq/checkout or contact support to enable automated issuance.",
      documentation: "https://www.mel.iq/auth.md",
      verification_uri: "https://www.mel.iq/checkout",
      claim_endpoint: "https://www.mel.iq/api/agent/identity/claim",
      token_endpoint: "https://www.mel.iq/api/oauth2/token",
    },
    401,
  );
}

export const config = { runtime: "edge" };
