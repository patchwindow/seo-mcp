import { gscSearchPerformance } from "./search-performance.js";
import { gscStrikingDistance } from "./striking-distance.js";
import { gscTrafficDrop } from "./traffic-drop.js";
import { gscUrlInspection } from "./url-inspection.js";
import { gscSitemapList } from "./sitemap-list.js";
import { gscBrandNonbrand } from "./brand-nonbrand.js";
import { gscRequestIndexing, gscRequestIndexingBatch } from "./request-indexing.js";
import type { ToolDefinition } from "../../types/tool.js";

export const gscTools: ToolDefinition[] = [
  gscSearchPerformance as unknown as ToolDefinition,
  gscStrikingDistance as unknown as ToolDefinition,
  gscTrafficDrop as unknown as ToolDefinition,
  gscUrlInspection as unknown as ToolDefinition,
  gscSitemapList as unknown as ToolDefinition,
  gscBrandNonbrand as unknown as ToolDefinition,
  gscRequestIndexing as unknown as ToolDefinition,
  gscRequestIndexingBatch as unknown as ToolDefinition,
];
