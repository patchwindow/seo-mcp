import { z } from "zod";
import { getBingApiKey, bingGet } from "../../auth/bing.js";
import type { ToolDefinition } from "../../types/tool.js";

interface BingUrlInfo {
  HttpStatusCode?: number;
  IsBlocked?: boolean;
  IsBlockedByRobotsTxt?: boolean;
  IsIndexed?: boolean;
  CrawlTime?: string;
  Title?: string;
  ContentLength?: number;
  InternalLinkCount?: number;
  ExternalLinkCount?: number;
  IsParamUrl?: boolean;
  RedirectTo?: string;
  MobileStatus?: string;
}

const schema = z.object({
  url: z.string().describe("The exact URL to inspect."),
  site_url: z.string().optional().describe(
    "Your site URL in Bing Webmaster Tools, e.g. 'https://example.com/'. Uses config default if omitted."
  ),
});

export const bingUrlInspection: ToolDefinition<typeof schema> = {
  name: "bing_url_inspection",
  description:
    "Inspect a URL's indexing and crawl status in Bing Webmaster Tools. Returns HTTP status, indexing state, crawl date, page title, link counts, and whether the URL is blocked.",
  schema,
  handler: async (args, config) => {
    const apiKey = getBingApiKey();

    const siteUrl = args.site_url ?? config.bing?.default_site;
    if (!siteUrl) {
      throw new Error(
        "site_url is required. Pass it as an argument or set bing.default_site in ~/.seo-mcp/config.json"
      );
    }

    const data = (await bingGet("GetUrlInfo", { siteUrl, url: args.url }, apiKey)) as BingUrlInfo | null;

    if (!data) {
      return { content: [{ type: "text", text: `No data found for URL: ${args.url}` }] };
    }

    const lines: string[] = [
      `URL: ${args.url}`,
      `HTTP status: ${data.HttpStatusCode ?? "—"}`,
      `Indexed: ${data.IsIndexed ? "Yes" : "No"}`,
      `Blocked: ${data.IsBlocked ? "Yes" : "No"}`,
      `Blocked by robots.txt: ${data.IsBlockedByRobotsTxt ? "Yes" : "No"}`,
      `Last crawled: ${data.CrawlTime ?? "—"}`,
      `Title: ${data.Title ?? "—"}`,
      `Content length: ${data.ContentLength ? `${data.ContentLength} bytes` : "—"}`,
      `Internal links: ${data.InternalLinkCount ?? "—"}`,
      `External links: ${data.ExternalLinkCount ?? "—"}`,
      `Parameter URL: ${data.IsParamUrl ? "Yes" : "No"}`,
    ];

    if (data.RedirectTo) {
      lines.push(`Redirects to: ${data.RedirectTo}`);
    }
    if (data.MobileStatus) {
      lines.push(`Mobile status: ${data.MobileStatus}`);
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
};
