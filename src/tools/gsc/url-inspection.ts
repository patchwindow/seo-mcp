import { z } from "zod";
import { google } from "googleapis";
import { getOAuth2Client } from "../../auth/gsc.js";
import type { ToolDefinition } from "../../types/tool.js";

const schema = z.object({
  url: z.string().describe("The exact URL to inspect (must be within the site property)."),
  site_url: z.string().optional().describe(
    "Site URL in GSC format, e.g. 'sc-domain:example.com'. Uses config default if omitted."
  ),
});

export const gscUrlInspection: ToolDefinition<typeof schema> = {
  name: "gsc_url_inspection",
  description:
    "Inspect a URL's indexing status in Google Search Console. Returns crawl date, indexing verdict, canonical URL, rich results eligibility, and mobile usability status.",
  schema,
  handler: async (args, config) => {
    const auth = getOAuth2Client();
    const sc = google.searchconsole({ version: "v1", auth });

    const siteUrl = args.site_url ?? config.gsc?.default_site;
    if (!siteUrl) {
      throw new Error(
        "site_url is required. Pass it as an argument or set gsc.default_site in ~/.seo-mcp/config.json"
      );
    }

    const res = await sc.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl: args.url,
        siteUrl,
      },
    });

    const result = res.data.inspectionResult;
    if (!result) {
      return { content: [{ type: "text", text: "No inspection result returned." }] };
    }

    const index = result.indexStatusResult;
    const mobile = result.mobileUsabilityResult;
    const richResults = result.richResultsResult;

    const lines: string[] = [
      `URL: ${args.url}`,
      `Coverage verdict: ${index?.verdict ?? "UNKNOWN"}`,
      `Indexing state: ${index?.indexingState ?? "—"}`,
      `Last crawl: ${index?.lastCrawlTime ?? "never"}`,
      `Crawled as: ${index?.crawledAs ?? "—"}`,
      `Page fetch: ${index?.pageFetchState ?? "—"}`,
      `Robots.txt state: ${index?.robotsTxtState ?? "—"}`,
      `Canonical (declared): ${index?.userCanonical ?? "—"}`,
      `Canonical (Google): ${index?.googleCanonical ?? "—"}`,
    ];

    if (mobile) {
      lines.push(`Mobile usability: ${mobile.verdict ?? "—"}`);
      if (mobile.issues && mobile.issues.length > 0) {
        lines.push(`Mobile issues: ${mobile.issues.map((i) => i.issueType).join(", ")}`);
      }
    }

    if (richResults) {
      lines.push(`Rich results: ${richResults.verdict ?? "—"}`);
      if (richResults.detectedItems && richResults.detectedItems.length > 0) {
        const items = richResults.detectedItems
          .map((i) => `${i.richResultType} (${i.items?.length ?? 0} items)`)
          .join(", ");
        lines.push(`Rich result types: ${items}`);
      }
    }

    if (index?.sitemap && index.sitemap.length > 0) {
      lines.push(`Found in sitemaps: ${index.sitemap.join(", ")}`);
    }

    if (index?.referringUrls && index.referringUrls.length > 0) {
      lines.push(`Referring URLs: ${index.referringUrls.slice(0, 5).join(", ")}`);
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
};
