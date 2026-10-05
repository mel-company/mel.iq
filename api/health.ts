export default function handler() {
  return new Response(
    JSON.stringify({
      status: "ok",
      service: "mel.iq",
      time: new Date().toISOString(),
      discovery: {
        apiCatalog: "/.well-known/api-catalog",
        aiCatalog: "/.well-known/ai-catalog.json",
        mcpServerCard: "/.well-known/mcp/server-card.json",
        authMd: "/auth.md",
      },
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
      },
    },
  );
}

export const config = {
  runtime: "edge",
};
