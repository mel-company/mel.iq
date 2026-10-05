/**
 * Minimal public MCP Streamable HTTP endpoint for Mel IQ discovery tools.
 * Intentionally read-only — no merchant mutations.
 */

const TOOLS = [
  {
    name: "get_mel_overview",
    description: "Return a short overview of Mel IQ and key public URLs.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_app_download_links",
    description: "Return Google Play and App Store links for the Mel merchant apps.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_pricing_entry_points",
    description: "Return URLs and guidance for Mel pricing and checkout.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_support_contacts",
    description: "Return Mel support and contact entry points.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

const RESULTS = {
  get_mel_overview: {
    name: "Mel IQ",
    description:
      "Iraqi ecommerce platform for creating and managing online stores, orders, products, and payments.",
    homepage: "https://www.mel.iq/",
    auth: "https://www.mel.iq/auth.md",
    openapi: "https://www.mel.iq/docs/openapi.json",
  },
  get_app_download_links: {
    android:
      "https://play.google.com/store/apps/details?id=com.almashreq.mel",
    ios: "https://apps.apple.com/us/app/mel-platform/id6810126830",
    section: "https://www.mel.iq/#download",
  },
  get_pricing_entry_points: {
    pricing: "https://www.mel.iq/#pricing",
    checkout: "https://www.mel.iq/checkout",
    note: "Plans include a 14-day trial. Checkout starts merchant registration.",
  },
  get_support_contacts: {
    contactSection: "https://www.mel.iq/#contact",
    email: "hassan.adnan@mel.iq",
    privacy: "https://www.mel.iq/privacy-policy",
  },
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, accept, mcp-session-id",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      ...extraHeaders,
    },
  });
}

function textResult(payload) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  };
}

function handleRpc(body) {
  const { id = null, method, params = {} } = body ?? {};

  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "mel-iq", version: "1.0.0" },
      },
    };
  }

  if (method === "notifications/initialized" || method === "initialized") {
    return null;
  }

  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  }

  if (method === "tools/call") {
    const name = params?.name;
    if (!name || !(name in RESULTS)) {
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: `Unknown tool: ${name ?? "(missing)"}` },
      };
    }
    return {
      jsonrpc: "2.0",
      id,
      result: textResult(RESULTS[name]),
    };
  }

  if (method === "ping") {
    return { jsonrpc: "2.0", id, result: {} };
  }

  return {
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  };
}

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return json({ ok: true });
  }

  if (request.method === "GET") {
    return json({
      name: "mel-iq",
      transport: "streamable-http",
      protocolVersion: "2025-06-18",
      tools: TOOLS.map((t) => t.name),
      card: "https://www.mel.iq/.well-known/mcp/server-card.json",
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error" },
    }, 400);
  }

  if (Array.isArray(body)) {
    const results = body.map(handleRpc).filter((r) => r !== null);
    return json(results);
  }

  const result = handleRpc(body);
  if (result === null) {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
      },
    });
  }
  return json(result);
}

export const config = {
  runtime: "edge",
};
