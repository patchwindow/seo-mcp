import { z } from "zod";
import { google } from "googleapis";
import { getOAuth2Client } from "../../auth/gsc.js";
import type { ToolDefinition } from "../../types/tool.js";

const schema = z.object({
  site_url: z.string().optional().describe(
    "Site URL in GSC format, e.g. 'sc-domain:example.com'. Uses config default if omitted."
  ),
  current_start: z.string().describe("Current period start date (YYYY-MM-DD)."),
  current_end: z.string().describe("Current period end date (YYYY-MM-DD)."),
  previous_start: z.string().describe("Previous period start date (YYYY-MM-DD)."),
  previous_end: z.string().describe("Previous period end date (YYYY-MM-DD)."),
  dimension: z
    .enum(["page", "query"])
    .optional()
    .describe("Group by page or query. Default: 'page'."),
  min_drop_percent: z
    .number()
    .optional()
    .describe("Minimum click drop percentage to flag (e.g. 20 = 20% drop). Default: 20."),
  min_clicks_previous: z
    .number()
    .optional()
    .describe("Minimum clicks in previous period to include (filters out low-traffic noise). Default: 5."),
  row_limit: z.number().optional().describe("Max dropped items to show. Default: 25."),
});

export const gscTrafficDrop: ToolDefinition<typeof schema> = {
  name: "gsc_traffic_drop",
  description:
    "Compare two date periods and identify pages or queries with significant traffic drops. Useful for diagnosing algorithm updates, technical issues, or content decay.",
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

    const dimension = args.dimension ?? "page";
    const minDropPct = args.min_drop_percent ?? 20;
    const minClicksPrev = args.min_clicks_previous ?? 5;
    const rowLimit = args.row_limit ?? 25;

    const [currentRes, previousRes] = await Promise.all([
      sc.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: args.current_start,
          endDate: args.current_end,
          dimensions: [dimension],
          rowLimit: 5000,
        },
      }),
      sc.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: args.previous_start,
          endDate: args.previous_end,
          dimensions: [dimension],
          rowLimit: 5000,
        },
      }),
    ]);

    const currentMap = new Map<string, number>();
    for (const row of currentRes.data.rows ?? []) {
      currentMap.set(row.keys?.[0] ?? "", row.clicks ?? 0);
    }

    interface DropItem {
      key: string;
      previous: number;
      current: number;
      drop: number;
      dropPct: number;
    }

    const drops: DropItem[] = [];
    for (const row of previousRes.data.rows ?? []) {
      const key = row.keys?.[0] ?? "";
      const prev = row.clicks ?? 0;
      if (prev < minClicksPrev) continue;
      const curr = currentMap.get(key) ?? 0;
      const dropPct = prev > 0 ? ((prev - curr) / prev) * 100 : 0;
      if (dropPct >= minDropPct) {
        drops.push({ key, previous: prev, current: curr, drop: prev - curr, dropPct });
      }
    }

    drops.sort((a, b) => b.drop - a.drop);
    const topDrops = drops.slice(0, rowLimit);

    if (topDrops.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No ${dimension}s with ≥${minDropPct}% click drops found between the two periods.`,
          },
        ],
      };
    }

    const summary =
      `Traffic drop analysis: ${dimension}s\n` +
      `Current: ${args.current_start} → ${args.current_end}\n` +
      `Previous: ${args.previous_start} → ${args.previous_end}\n` +
      `Flagged ${topDrops.length} ${dimension}s with ≥${minDropPct}% drop.\n\n`;

    const header = `${dimension}\tprev_clicks\tcurr_clicks\tdrop\tdrop_pct`;
    const lines = topDrops.map((d) => {
      return `${d.key}\t${d.previous}\t${d.current}\t-${d.drop}\t-${d.dropPct.toFixed(1)}%`;
    });

    return { content: [{ type: "text", text: summary + [header, ...lines].join("\n") }] };
  },
};
