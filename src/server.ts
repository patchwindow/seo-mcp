import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { gscTools } from "./tools/gsc/index.js";
import { bingTools } from "./tools/bing/index.js";
import { loadConfig } from "./config.js";

export async function startServer() {
  const config = loadConfig();

  const server = new McpServer({
    name: "@patchwindow/seo-mcp",
    version: "0.2.0",
  });

  const allTools = [...gscTools, ...bingTools];

  for (const tool of allTools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.schema,
      },
      async (args) => {
        try {
          const result = await tool.handler(args as never, config);
          return result;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: "text" as const, text: `Error: ${message}` }],
            isError: true,
          };
        }
      }
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
