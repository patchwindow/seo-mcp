import { z } from "zod";
import { getBingApiKey, bingGet } from "../../auth/bing.js";
import type { ToolDefinition } from "../../types/tool.js";

interface BingFeed {
  FeedUrl?: string;
  LastCrawlTime?: string;
  SubmitTime?: string;
  Status?: string;
  FileSize?: number;
  UrlCount?: number;
  IndexedUrlCount?: number;
  WarningCount?: number;
  ErrorCount?: number;
  Type?: string;
}

const schema = z.object({
  site_url: z.string().optional().describe(
    "Your site URL in Bing Webmaster Tools, e.g. 'https://example.com/'. Uses config default if omitted."
  ),
});

export const bingSitemapList: ToolDefinition<typeof schema> = {
  name: "bing_sitemap_list",
  description:
    "List all sitemaps submitted to Bing Webmaster Tools for a site, including URL counts, indexed counts, errors, and last crawl time.",
  schema,
  handler: async (args, config) => {
    const apiKey = getBingApiKey();

    const siteUrl = args.site_url ?? config.bing?.default_site;
    if (!siteUrl) {
      throw new Error(
        "site_url is required. Pass it as an argument or set bing.default_site in ~/.seo-mcp/config.json"
      );
    }

    const data = (await bingGet("GetFeeds", { siteUrl }, apiKey)) as BingFeed[] | null;
    const feeds = Array.isArray(data) ? data : [];

    if (feeds.length === 0) {
      return {
        content: [{ type: "text", text: `No sitemaps found for ${siteUrl} in Bing Webmaster Tools.` }],
      };
    }

    const lines = feeds.map((f) => {
      const statusParts = [];
      if ((f.ErrorCount ?? 0) > 0) statusParts.push(`${f.ErrorCount} errors`);
      if ((f.WarningCount ?? 0) > 0) statusParts.push(`${f.WarningCount} warnings`);
      const status = statusParts.length > 0 ? statusParts.join(", ") : f.Status ?? "OK";

      return [
        `URL: ${f.FeedUrl ?? "—"}`,
        `  Type: ${f.Type ?? "—"} | Status: ${status}`,
        `  URLs: ${f.UrlCount ?? "—"} submitted, ${f.IndexedUrlCount ?? "—"} indexed`,
        `  Submitted: ${f.SubmitTime ?? "—"} | Last crawled: ${f.LastCrawlTime ?? "—"}`,
        f.FileSize ? `  File size: ${(f.FileSize / 1024).toFixed(1)} KB` : "",
      ]
        .filter(Boolean)
        .join("\n");
    });

    return {
      content: [{ type: "text", text: `Sitemaps for ${siteUrl} in Bing (${feeds.length} total):\n\n${lines.join("\n\n")}` }],
    };
  },
};
