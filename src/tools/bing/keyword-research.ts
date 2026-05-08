import { z } from "zod";
import { getBingApiKey, bingGet } from "../../auth/bing.js";
import type { ToolDefinition } from "../../types/tool.js";

interface BingKeywordResult {
  Keyword?: string;
  ImpressionCount?: number;
  BroadImpressionCount?: number;
  ImpressionCountMonthlyBreakdown?: Array<{ Month?: string; ImpressionCount?: number }>;
}

interface BingRelatedKeyword {
  Keyword?: string;
  ImpressionCount?: number;
}

const schema = z.object({
  keyword: z.string().describe("The keyword to research."),
  site_url: z.string().optional().describe(
    "Your site URL in Bing Webmaster Tools, e.g. 'https://example.com/'. Uses config default if omitted."
  ),
  country: z.string().optional().describe("Two-letter country code (e.g. 'US', 'GB'). Default: 'US'."),
  language: z.string().optional().describe("Language code (e.g. 'en-US'). Default: 'en-US'."),
  include_related: z.boolean().optional().describe("Include related keywords. Default: true."),
});

export const bingKeywordResearch: ToolDefinition<typeof schema> = {
  name: "bing_keyword_research",
  description:
    "Research keywords using Bing Webmaster Tools. Returns monthly search volume (impressions) for a keyword and a list of related keywords. This keyword data is exclusive to Bing and not available in Google Search Console.",
  schema,
  handler: async (args, config) => {
    const apiKey = getBingApiKey();

    const siteUrl = args.site_url ?? config.bing?.default_site;
    if (!siteUrl) {
      throw new Error(
        "site_url is required. Pass it as an argument or set bing.default_site in ~/.seo-mcp/config.json"
      );
    }

    const country = args.country ?? "US";
    const language = args.language ?? "en-US";
    const includeRelated = args.include_related ?? true;

    const parts: string[] = [
      `Keyword: ${args.keyword}`,
      `Country: ${country} | Language: ${language}`,
      "",
    ];

    const kwData = (await bingGet("GetKeyword", { siteUrl, keyword: args.keyword, country, language }, apiKey)) as BingKeywordResult | null;

    if (kwData) {
      parts.push(`Monthly impressions (exact): ${kwData.ImpressionCount ?? "—"}`);
      parts.push(`Monthly impressions (broad): ${kwData.BroadImpressionCount ?? "—"}`);

      const breakdown = kwData.ImpressionCountMonthlyBreakdown ?? [];
      if (breakdown.length > 0) {
        parts.push("", "Monthly breakdown:", "month\timpressions");
        for (const m of breakdown) {
          parts.push(`${m.Month ?? "—"}\t${m.ImpressionCount ?? 0}`);
        }
      }
    } else {
      parts.push("No volume data found for this keyword.");
    }

    if (includeRelated) {
      const related = (await bingGet("GetRelatedKeywords", { siteUrl, keyword: args.keyword, country, language }, apiKey)) as BingRelatedKeyword[] | null;
      const relatedList = Array.isArray(related) ? related : [];

      if (relatedList.length > 0) {
        const sorted = relatedList
          .sort((a, b) => (b.ImpressionCount ?? 0) - (a.ImpressionCount ?? 0))
          .slice(0, 20);
        parts.push("", `Related keywords (top ${sorted.length}):`, "keyword\tmonthly_impressions");
        for (const r of sorted) {
          parts.push(`${r.Keyword ?? "—"}\t${r.ImpressionCount ?? 0}`);
        }
      } else {
        parts.push("", "No related keywords found.");
      }
    }

    return { content: [{ type: "text", text: parts.join("\n") }] };
  },
};
