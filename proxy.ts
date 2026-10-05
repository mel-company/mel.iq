import { next } from "@vercel/functions";

/**
 * Markdown for Agents (Accept: text/markdown).
 *
 * Static index.html would otherwise win over vercel.json rewrites for `/`.
 * This proxy runs first and can return markdown before the HTML asset is served.
 */
export default async function proxy(request: Request) {
  const accept = request.headers.get("accept") ?? "";
  if (!/\btext\/markdown\b/i.test(accept)) {
    return next();
  }

  const url = new URL(request.url);
  // Only negotiate the homepage for now — scanners probe `/`.
  if (url.pathname !== "/" && url.pathname !== "/index.html") {
    return next();
  }

  const mdUrl = new URL("/agent/home.md", url.origin);
  const upstream = await fetch(mdUrl);
  const body = await upstream.text();
  const tokens = Math.max(1, Math.ceil(body.length / 4));

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "x-markdown-tokens": String(tokens),
      vary: "Accept",
      "cache-control": "public, max-age=60",
      "access-control-allow-origin": "*",
    },
  });
}
