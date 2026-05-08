import { z } from "zod";
import { google } from "googleapis";
import { getOAuth2Client } from "../../auth/gsc.js";
import type { ToolDefinition } from "../../types/tool.js";

const schema = z.object({
  site_url: z.string().optional().describe(
    "Site URL in GSC format, e.g. 'sc-domain:example.com'. Uses config default if omitted."
  ),
  start_date: z.string().describe("Start date in YYYY-MM-DD format."),
  end_date: z.string().describe("End date in YYYY-MM-DD format."),
  min_position: z.number().optional().describe("Minimum average position to include. Default: 4."),
  max_position: z.number().optional().describe("Maximum average position to include. Default: 20."),
  min_impressions: z.number().optional().describe("Minimum impressions to include. Default: 10."),
  row_limit: z.number().optional().describe("Max rows to return. Default: 50."),
});

export const gscStrikingDistance: ToolDefinition<typeof schema> = {
  name: "gsc_striking_distance",
  description:
    "Find queries ranking in positions 4–20 (striking distance / low-hanging fruit). These are the best candidates for quick ranking improvements. Results sorted by impressions descending.",
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

    const minPos = args.min_position ?? 4;
    const maxPos = args.max_position ?? 20;
    const minImpressions = args.min_impressions ?? 10;
    const rowLimit = args.row_limit ?? 50;

    const res = await sc.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: args.start_date,
        endDate: args.end_date,
        dimensions: ["query"],
        rowLimit: 5000,
      },
    });

    const rows = res.data.rows ?? [];
    const filtered = rows
      .filter((r) => {
        const pos = r.position ?? 0;
        const imp = r.impressions ?? 0;
        return pos >= minPos && pos <= maxPos && imp >= minImpressions;
      })
      .sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0))
      .slice(0, rowLimit);

    if (filtered.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No queries found in positions ${minPos}–${maxPos} with ≥${minImpressions} impressions.`,
          },
        ],
      };
    }

    const summary = `Found ${filtered.length} queries in striking distance (positions ${minPos}–${maxPos}).\n\n`;
    const header = "query\tposition\timpressions\tclicks\tctr";
    const lines = filtered.map((r) => {
      const query = r.keys?.[0] ?? "";
      const pos = r.position?.toFixed(1) ?? "—";
      const ctr = ((r.ctr ?? 0) * 100).toFixed(2) + "%";
      return `${query}\t${pos}\t${r.impressions ?? 0}\t${r.clicks ?? 0}\t${ctr}`;
    });

    return { content: [{ type: "text", text: summary + [header, ...lines].join("\n") }] };
  },
};
