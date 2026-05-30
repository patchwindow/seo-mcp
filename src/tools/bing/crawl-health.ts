import { z } from "zod";
import { getBingApiKey, bingGet } from "../../auth/bing.js";
import type { ToolDefinition } from "../../types/tool.js";

interface BingCrawlStats {
  CrawledUrls?: number;
  BlockedUrls?: number;
  BlockedByRobotsTxtUrls?: number;
  NotFoundUrls?: number;
  NetworkFailedUrls?: number;
  TimeoutUrls?: number;
  HttpRedirectedUrls?: number;
  CrawledBytes?: number;
  DnsFailedUrls?: number;
  RootError?: boolean;
  CrawlSuccessUrls?: number;
  CrawlErrors?: number;
}

interface BingCrawlIssue {
  PageUrl?: string;
  IssueName?: string;
  HttpCode?: number;
  CrawlTime?: string;
}

const schema = z.object({
  site_url: z.string().optional().describe(
    "Your site URL in Bing Webmaster Tools, e.g. 'https://example.com/'. Uses config default if omitted."
  ),
  show_issues: z.boolean().optional().describe("Include specific crawl issues. Default: true."),
  max_issues: z.number().optional().describe("Max crawl issues to show. Default: 20."),
});

export const bingCrawlHealth: ToolDefinition<typeof schema> = {
  name: "bing_crawl_health",
  description:
    "Get crawl statistics and crawl issues from Bing Webmaster Tools. Shows crawl frequency, error counts by type (4xx, timeouts, DNS failures, blocked), and a list of specific crawl problems.",
  schema,
  handler: async (args, config) => {
    const apiKey = getBingApiKey(config.bing?.api_key);

    const siteUrl = args.site_url ?? config.bing?.default_site;
    if (!siteUrl) {
      throw new Error(
        "site_url is required. Pass it as an argument or set bing.default_site in ~/.seo-mcp/config.json"
      );
    }

    const showIssues = args.show_issues ?? true;
    const maxIssues = args.max_issues ?? 20;

    const parts: string[] = [`Crawl health for ${siteUrl}`, ""];

    const statsData = (await bingGet("GetCrawlStats", { siteUrl }, apiKey)) as BingCrawlStats | null;

    if (statsData) {
      const total = statsData.CrawledUrls ?? 0;
      const errors = statsData.CrawlErrors ?? 0;
      const errorPct = total > 0 ? ((errors / total) * 100).toFixed(1) : "0.0";

      parts.push(
        "== Crawl Statistics ==",
        `Total crawled URLs: ${total}`,
        `Successful: ${statsData.CrawlSuccessUrls ?? 0}`,
        `Errors: ${errors} (${errorPct}% error rate)`,
        `  Not found (4xx): ${statsData.NotFoundUrls ?? 0}`,
        `  Network failed: ${statsData.NetworkFailedUrls ?? 0}`,
        `  Timeout: ${statsData.TimeoutUrls ?? 0}`,
        `  DNS failed: ${statsData.DnsFailedUrls ?? 0}`,
        `Redirected: ${statsData.HttpRedirectedUrls ?? 0}`,
        `Blocked: ${statsData.BlockedUrls ?? 0} (robots.txt: ${statsData.BlockedByRobotsTxtUrls ?? 0})`,
        `Crawled bytes: ${((statsData.CrawledBytes ?? 0) / 1024 / 1024).toFixed(2)} MB`
      );

      if (statsData.RootError) {
        parts.push("", "WARNING: Bing cannot crawl your site's root URL.");
      }
    } else {
      parts.push("No crawl statistics available.");
    }

    if (showIssues) {
      const issuesData = (await bingGet("GetCrawlIssues", { siteUrl }, apiKey)) as BingCrawlIssue[] | null;
      const issues = Array.isArray(issuesData) ? issuesData : [];

      parts.push("", "== Crawl Issues ==");

      if (issues.length === 0) {
        parts.push("No crawl issues reported.");
      } else {
        const shown = issues.slice(0, maxIssues);
        parts.push(`Showing ${shown.length} of ${issues.length} issues:`, "url\tissue\thttp_code\tcrawl_time");
        for (const issue of shown) {
          parts.push(
            `${issue.PageUrl ?? "—"}\t${issue.IssueName ?? "—"}\t${issue.HttpCode ?? "—"}\t${issue.CrawlTime ?? "—"}`
          );
        }
        if (issues.length > maxIssues) {
          parts.push(`... and ${issues.length - maxIssues} more issues.`);
        }
      }
    }

    return { content: [{ type: "text", text: parts.join("\n") }] };
  },
};
