import { z } from "zod";
import { getOAuth2Client } from "../../auth/gsc.js";
import type { ToolDefinition } from "../../types/tool.js";

const INDEXING_API_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish";

async function notifyGoogle(url: string, accessToken: string): Promise<{ url: string; notifyTime: string }> {
  const res = await fetch(INDEXING_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ url, type: "URL_UPDATED" }),
  });

  if (res.status === 403) {
    throw new Error(
      `Google Indexing API returned 403 Forbidden for ${url}.\n` +
      "This usually means:\n" +
      "  1. The Indexing API scope is missing — re-run: npx @patchwindow/seo-mcp auth gsc\n" +
      "  2. The Indexing API is not enabled in your Google Cloud project\n" +
      "  3. Your OAuth2 credentials lack the required access"
    );
  }

  if (res.status === 429) {
    throw new Error(
      `Google Indexing API returned 429 Too Many Requests for ${url}.\n` +
      "You have exceeded the quota (200 URLs/day). Try again tomorrow or reduce request volume."
    );
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Indexing API error ${res.status} for ${url}: ${body}`);
  }

  const data = (await res.json()) as { urlNotificationMetadata?: { latestUpdate?: { url: string; notifyTime: string } } };
  const latest = data.urlNotificationMetadata?.latestUpdate;
  return {
    url: latest?.url ?? url,
    notifyTime: latest?.notifyTime ?? new Date().toISOString(),
  };
}

// ─── Single URL ──────────────────────────────────────────────────────────────

const singleSchema = z.object({
  url: z.string().url().describe("The URL to request indexing for (must be publicly accessible)."),
});

export const gscRequestIndexing: ToolDefinition<typeof singleSchema> = {
  name: "request_indexing",
  description:
    "Ask Google to index (or re-index) a single URL via the Google Indexing API. " +
    "Sends a URL_UPDATED notification and returns the confirmation with notifyTime. " +
    "Requires the Indexing API scope — re-run auth if you get a 403.",
  schema: singleSchema,
  handler: async (args) => {
    const auth = getOAuth2Client();
    const { token } = await auth.getAccessToken();
    if (!token) {
      throw new Error(
        "Could not obtain access token. Run: npx @patchwindow/seo-mcp auth gsc"
      );
    }

    const result = await notifyGoogle(args.url, token);

    const lines = [
      `Indexing request submitted`,
      `URL: ${result.url}`,
      `Notify time: ${result.notifyTime}`,
      ``,
      `Note: Google typically processes indexing requests within a few days.`,
    ];

    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
};

// ─── Batch ────────────────────────────────────────────────────────────────────

const batchSchema = z.object({
  urls: z
    .array(z.string().url())
    .min(1)
    .max(200)
    .describe("Array of URLs to request indexing for (max 200, the daily API quota)."),
  delay_ms: z
    .number()
    .int()
    .min(0)
    .max(10000)
    .optional()
    .describe(
      "Milliseconds to wait between requests (default: 10). " +
      "Google recommends staying under 100 req/s."
    ),
});

export const gscRequestIndexingBatch: ToolDefinition<typeof batchSchema> = {
  name: "request_indexing_batch",
  description:
    "Ask Google to index (or re-index) a batch of URLs via the Google Indexing API. " +
    "Accepts up to 200 URLs (daily quota limit). Sends URL_UPDATED notifications in series " +
    "with a small delay between requests and returns a report of successes and failures.",
  schema: batchSchema,
  handler: async (args) => {
    const auth = getOAuth2Client();
    const { token } = await auth.getAccessToken();
    if (!token) {
      throw new Error(
        "Could not obtain access token. Run: npx @patchwindow/seo-mcp auth gsc"
      );
    }

    const delayMs = args.delay_ms ?? 10;
    const succeeded: Array<{ url: string; notifyTime: string }> = [];
    const failed: Array<{ url: string; error: string }> = [];

    for (const url of args.urls) {
      try {
        const result = await notifyGoogle(url, token);
        succeeded.push(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failed.push({ url, error: message });
      }

      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    const lines: string[] = [
      `Batch indexing complete`,
      `Total: ${args.urls.length} | Succeeded: ${succeeded.length} | Failed: ${failed.length}`,
      ``,
    ];

    if (succeeded.length > 0) {
      lines.push(`── Succeeded (${succeeded.length}) ──`);
      for (const s of succeeded) {
        lines.push(`  ✓ ${s.url}  [${s.notifyTime}]`);
      }
      lines.push(``);
    }

    if (failed.length > 0) {
      lines.push(`── Failed (${failed.length}) ──`);
      for (const f of failed) {
        lines.push(`  ✗ ${f.url}`);
        lines.push(`    ${f.error}`);
      }
      lines.push(``);
    }

    lines.push(`Note: Google typically processes indexing requests within a few days.`);

    return {
      content: [{ type: "text", text: lines.join("\n") }],
      isError: failed.length > 0 && succeeded.length === 0,
    };
  },
};
