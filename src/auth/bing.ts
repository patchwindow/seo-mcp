export function getBingApiKey(configKey?: string): string {
  const key = process.env.BING_WEBMASTER_API_KEY ?? configKey;
  if (!key) {
    throw new Error(
      "Bing API key not configured.\n" +
      "Either set the BING_WEBMASTER_API_KEY environment variable, or add\n" +
      '  "bing": { "api_key": "<your-key>" }\n' +
      "to ~/.seo-mcp/config.json.\n" +
      "Generate a key at: https://www.bing.com/webmasters → Settings → API Access"
    );
  }
  return key;
}

const BING_BASE_URL = "https://ssl.bing.com/webmaster/api.svc/json";

export async function bingGet(
  method: string,
  params: Record<string, string | number | undefined>,
  apiKey: string
): Promise<unknown> {
  const url = new URL(`${BING_BASE_URL}/${method}`);
  url.searchParams.set("apikey", apiKey);

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Bing API error ${res.status} on ${method}: ${body}`);
  }

  const json = (await res.json()) as { d?: unknown };
  return json.d ?? json;
}

export async function bingPost(
  method: string,
  apiKey: string,
  body: unknown
): Promise<unknown> {
  const url = new URL(`${BING_BASE_URL}/${method}`);
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bing API error ${res.status} on ${method}: ${text}`);
  }

  const json = (await res.json()) as { d?: unknown };
  return json.d ?? json;
}
