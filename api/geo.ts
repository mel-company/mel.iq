import { geolocation } from "@vercel/functions";

/**
 * The visitor's country and city, read from Vercel's edge headers, for the
 * visitor journey in the owner dashboard. The IP address itself is never
 * returned or stored anywhere.
 */
export default function handler(request: Request) {
  const { country, city } = geolocation(request);
  return new Response(
    JSON.stringify({ country: country ?? null, city: city ?? null }),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "private, no-store",
      },
    },
  );
}

export const config = {
  runtime: "edge",
};
