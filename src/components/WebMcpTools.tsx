import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

type JsonSchema = Record<string, unknown>;

type WebMcpTool = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  execute: (args: Record<string, unknown>) => Promise<unknown> | unknown;
};

type ModelContext = {
  registerTool: (
    tool: WebMcpTool,
    options?: { signal?: AbortSignal },
  ) => Promise<unknown> | unknown;
};

function getModelContext(): ModelContext | undefined {
  const doc = document as Document & { modelContext?: ModelContext };
  const nav = navigator as Navigator & { modelContext?: ModelContext };
  return doc.modelContext ?? nav.modelContext;
}

/**
 * Registers browser-side WebMCP tools for Mel marketing actions.
 * No-ops when the WebMCP API is unavailable.
 */
function WebMcpTools() {
  const navigate = useNavigate();

  useEffect(() => {
    const modelContext = getModelContext();
    if (!modelContext?.registerTool) return;

    const controller = new AbortController();
    const { signal } = controller;

    const tools: WebMcpTool[] = [
      {
        name: "navigate_mel_section",
        description:
          "Navigate the Mel marketing site to a section: about, features, pricing, download, faq, or contact.",
        inputSchema: {
          type: "object",
          required: ["section"],
          properties: {
            section: {
              type: "string",
              enum: ["about", "features", "pricing", "download", "faq", "contact"],
            },
          },
          additionalProperties: false,
        },
        execute: async ({ section }) => {
          const hash = `#${String(section)}`;
          if (window.location.pathname !== "/") {
            navigate(`/${hash}`);
          } else {
            window.location.hash = hash;
            document
              .getElementById(String(section))
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          return { ok: true, section, url: `https://www.mel.iq/${hash}` };
        },
      },
      {
        name: "open_mel_checkout",
        description: "Open Mel merchant checkout / account creation.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: async () => {
          navigate("/checkout");
          return { ok: true, url: "https://www.mel.iq/checkout" };
        },
      },
      {
        name: "get_mel_app_links",
        description: "Return Mel Android and iOS app store URLs.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: async () => ({
          android:
            "https://play.google.com/store/apps/details?id=com.almashreq.mel",
          ios: "https://apps.apple.com/us/app/mel-platform/id6810126830",
          section: "https://www.mel.iq/#download",
        }),
      },
      {
        name: "get_mel_public_discovery",
        description:
          "Return Mel machine-readable discovery URLs for agents (catalogs, auth, MCP, skills).",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: async () => ({
          apiCatalog: "https://www.mel.iq/.well-known/api-catalog",
          aiCatalog: "https://www.mel.iq/.well-known/ai-catalog.json",
          authMd: "https://www.mel.iq/auth.md",
          openapi: "https://www.mel.iq/docs/openapi.json",
          mcpServerCard: "https://www.mel.iq/.well-known/mcp/server-card.json",
          agentSkills: "https://www.mel.iq/.well-known/agent-skills/index.json",
          oauthProtectedResource:
            "https://www.mel.iq/.well-known/oauth-protected-resource",
        }),
      },
    ];

    for (const tool of tools) {
      void Promise.resolve(modelContext.registerTool(tool, { signal })).catch(
        () => {
          /* WebMCP is progressive enhancement — ignore registration failures. */
        },
      );
    }

    return () => controller.abort();
  }, [navigate]);

  return null;
}

export default WebMcpTools;
