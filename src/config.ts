import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { Config } from "./types/config.js";

const CONFIG_FILE = join(homedir(), ".seo-mcp", "config.json");

export function loadConfig(): Config {
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf8")) as Config;
  } catch {
    return {};
  }
}
