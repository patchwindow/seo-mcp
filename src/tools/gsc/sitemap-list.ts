import { z } from "zod";
import { google } from "googleapis";
import { getOAuth2Client } from "../../auth/gsc.js";
import type { ToolDefinition } from "../../types/tool.js";

const schema = z.object({
  site_url: z.string().optional().describe(
    "Site URL in GSC format, e.g. 'sc-domain:example.com'. Uses config default if omitted."
  ),
});

export const gscSitemapList: ToolDefinition<typeof schema> = {
  name: "gsc_sitemap_list",
  description:
    "List all sitemaps submitted to Google Search Console for a site, including their status, URL counts, and last submission date.",
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

    const res = await sc.sitemaps.list({ siteUrl });
    const sitemaps = res.data.sitemap ?? [];

    if (sitemaps.length === 0) {
      return { content: [{ type: "text", text: `No sitemaps found for ${siteUrl}.` }] };
    }

    const lines = sitemaps.map((sm) => {
      const submitted = sm.lastSubmitted ?? "—";
      const downloaded = sm.lastDownloaded ?? "—";
      const warnings = Number(sm.warnings ?? 0);
      const errors = Number(sm.errors ?? 0);

      const countSummary = (sm.contents ?? [])
        .map((c) => `${c.type}: ${c.submitted ?? 0} submitted, ${c.indexed ?? 0} indexed`)
        .join(" | ");

      const statusParts = [];
      if (errors > 0) statusParts.push(`${errors} errors`);
      if (warnings > 0) statusParts.push(`${warnings} warnings`);
      const status = statusParts.length > 0 ? statusParts.join(", ") : "OK";

      return [
        `Path: ${sm.path}`,
        `  Type: ${sm.type ?? "—"} | Status: ${status}`,
        `  Submitted: ${submitted} | Downloaded: ${downloaded}`,
        countSummary ? `  Counts: ${countSummary}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    });

    const header = `Sitemaps for ${siteUrl} (${sitemaps.length} total):\n`;
    return { content: [{ type: "text", text: header + lines.join("\n\n") }] };
  },
};
