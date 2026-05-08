import { bingKeywordResearch } from "./keyword-research.js";
import { bingCrawlHealth } from "./crawl-health.js";
import { bingUrlInspection } from "./url-inspection.js";
import { bingSitemapList } from "./sitemap-list.js";
import type { ToolDefinition } from "../../types/tool.js";

export const bingTools: ToolDefinition[] = [
  bingKeywordResearch as unknown as ToolDefinition,
  bingCrawlHealth as unknown as ToolDefinition,
  bingUrlInspection as unknown as ToolDefinition,
  bingSitemapList as unknown as ToolDefinition,
];
