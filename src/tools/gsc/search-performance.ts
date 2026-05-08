import { z } from "zod";
import { google } from "googleapis";
import { getOAuth2Client } from "../../auth/gsc.js";
import type { ToolDefinition } from "../../types/tool.js";

const schema = z.object({
  site_url: z.string().optional().describe(
    "Site URL in GSC format, e.g. 'sc-domain:example.com' or 'https://example.com/'. Uses config default if omitted."
  ),
  start_date: z.string().describe("Start date in YYYY-MM-DD format."),
  end_date: z.string().describe("End date in YYYY-MM-DD format."),
  dimensions: z
    .array(z.enum(["query", "page", "country", "device", "date"]))
    .optional()
    .describe("Dimensions to group results by. Default: ['query']."),
  filter_query: z.string().optional().describe("Filter results to queries containing this string."),
  filter_page: z.string().optional().describe("Filter results to this page URL (exact match)."),
  filter_device: z
    .enum(["DESKTOP", "MOBILE", "TABLET"])
    .optional()
    .describe("Filter results to this device type."),
  filter_country: z
    .string()
    .optional()
    .describe("Filter results to this country (ISO 3166-1 alpha-3, e.g. 'USA')."),
  row_limit: z.number().optional().describe("Max rows to return. Default 100, max 25000."),
});

export const gscSearchPerformance: ToolDefinition<typeof schema> = {
  name: "gsc_search_performance",
  description:
    "Query Google Search Console search performance data. Returns clicks, impressions, CTR, and position for a site. Supports filtering by query, page, device, or country and grouping by multiple dimensions.",
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

    const dimensions = args.dimensions ?? ["query"];
    const rowLimit = args.row_limit ?? 100;

    const filterGroups: Record<string, unknown>[] = [];

    if (args.filter_query) {
      filterGroups.push({ filters: [{ dimension: "query", operator: "contains", expression: args.filter_query }] });
    }
    if (args.filter_page) {
      filterGroups.push({ filters: [{ dimension: "page", operator: "equals", expression: args.filter_page }] });
    }
    if (args.filter_device) {
      filterGroups.push({ filters: [{ dimension: "device", operator: "equals", expression: args.filter_device }] });
    }
    if (args.filter_country) {
      filterGroups.push({ filters: [{ dimension: "country", operator: "equals", expression: args.filter_country }] });
    }

    const res = await sc.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: args.start_date,
        endDate: args.end_date,
        dimensions,
        rowLimit,
        dimensionFilterGroups: filterGroups.length > 0 ? filterGroups : undefined,
      },
    });

    const rows = res.data.rows ?? [];
    if (rows.length === 0) {
      return { content: [{ type: "text", text: "No data returned for the specified parameters." }] };
    }

    const header = [...dimensions, "clicks", "impressions", "ctr", "position"].join("\t");
    const lines = rows.map((r) => {
      const keys = (r.keys ?? []).join("\t");
      const ctr = ((r.ctr ?? 0) * 100).toFixed(2) + "%";
      const pos = r.position?.toFixed(1) ?? "—";
      return `${keys}\t${r.clicks ?? 0}\t${r.impressions ?? 0}\t${ctr}\t${pos}`;
    });

    return { content: [{ type: "text", text: [header, ...lines].join("\n") }] };
  },
};
