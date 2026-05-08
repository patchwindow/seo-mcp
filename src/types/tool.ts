import type { z } from "zod";
import type { Config } from "./config.js";

export type AnyZodObject = z.ZodObject<z.ZodRawShape>;

export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export interface ToolDefinition<T extends AnyZodObject = AnyZodObject> {
  name: string;
  description: string;
  schema: T;
  handler: (args: z.infer<T>, config: Config) => Promise<ToolResult>;
}
