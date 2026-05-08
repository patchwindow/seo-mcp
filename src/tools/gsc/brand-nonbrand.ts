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
  brand_terms: z
    .array(z.string())
    .describe(
      "Brand terms to match against queries (case-insensitive). Any query containing one of these is classified as branded. Example: ['acme', 'acmecorp']."
    ),
  show_top_queries: z
    .boolean()
    .optional()
    .describe("Include top 10 branded and non-branded queries. Default: true."),
});

export const gscBrandNonbrand: ToolDefinition<typeof schema> = {
  name: "gsc_brand_nonbrand",
  description:
    "Split search traffic into branded and non-branded query segments. Returns aggregated clicks, impressions, CTR, and position for each segment, plus top queries.",
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

    if (args.brand_terms.length === 0) {
      throw new Error("brand_terms must contain at least one term.");
    }

    const brandTerms = args.brand_terms.map((t) => t.toLowerCase());
    const showTop = args.show_top_queries ?? true;

    const res = await sc.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: args.start_date,
        endDate: args.end_date,
        dimensions: ["query"],
        rowLimit: 25000,
      },
    });

    const rows = res.data.rows ?? [];

    type Row = (typeof rows)[number];
    interface Segment {
      clicks: number;
      impressions: number;
      ctrSum: number;
      posSum: number;
      count: number;
      rows: Row[];
    }

    const branded: Segment = { clicks: 0, impressions: 0, ctrSum: 0, posSum: 0, count: 0, rows: [] };
    const nonbranded: Segment = { clicks: 0, impressions: 0, ctrSum: 0, posSum: 0, count: 0, rows: [] };

    for (const row of rows) {
      const query = (row.keys?.[0] ?? "").toLowerCase();
      const isBrand = brandTerms.some((t) => query.includes(t));
      const target = isBrand ? branded : nonbranded;

      target.clicks += row.clicks ?? 0;
      target.impressions += row.impressions ?? 0;
      target.ctrSum += row.ctr ?? 0;
      target.posSum += row.position ?? 0;
      target.count++;
      target.rows.push(row);
    }

    const totalClicks = branded.clicks + nonbranded.clicks;

    const fmt = (seg: Segment, label: string): string => {
      if (seg.count === 0) return `${label}: no data`;
      const avgCtr = (seg.ctrSum / seg.count) * 100;
      const avgPos = seg.posSum / seg.count;
      const pctClicks = totalClicks > 0 ? (seg.clicks / totalClicks) * 100 : 0;
      return [
        `${label} (${seg.count} queries):`,
        `  Clicks: ${seg.clicks} (${pctClicks.toFixed(1)}% of total)`,
        `  Impressions: ${seg.impressions}`,
        `  Avg CTR: ${avgCtr.toFixed(2)}%`,
        `  Avg Position: ${avgPos.toFixed(1)}`,
      ].join("\n");
    };

    const parts = [
      `Brand vs. Non-brand split for ${siteUrl}`,
      `Period: ${args.start_date} → ${args.end_date}`,
      `Brand terms: ${brandTerms.join(", ")}`,
      "",
      fmt(branded, "Branded"),
      "",
      fmt(nonbranded, "Non-branded"),
    ];

    if (showTop) {
      const topBranded = [...branded.rows]
        .sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
        .slice(0, 10);
      const topNonBranded = [...nonbranded.rows]
        .sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
        .slice(0, 10);

      if (topBranded.length > 0) {
        parts.push("", "Top branded queries:", "query\tclicks\timpressions\tposition");
        for (const r of topBranded) {
          parts.push(
            `${r.keys?.[0]}\t${r.clicks ?? 0}\t${r.impressions ?? 0}\t${r.position?.toFixed(1) ?? "—"}`
          );
        }
      }

      if (topNonBranded.length > 0) {
        parts.push("", "Top non-branded queries:", "query\tclicks\timpressions\tposition");
        for (const r of topNonBranded) {
          parts.push(
            `${r.keys?.[0]}\t${r.clicks ?? 0}\t${r.impressions ?? 0}\t${r.position?.toFixed(1) ?? "—"}`
          );
        }
      }
    }

    return { content: [{ type: "text", text: parts.join("\n") }] };
  },
};
