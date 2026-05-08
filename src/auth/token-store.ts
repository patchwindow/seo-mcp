import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const TOKEN_DIR = join(homedir(), ".seo-mcp");
const TOKEN_FILE = join(TOKEN_DIR, "gsc-token.json");

export function readTokens(): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(TOKEN_FILE, "utf8"));
  } catch {
    return null;
  }
}

export function writeTokens(tokens: Record<string, unknown>): void {
  mkdirSync(TOKEN_DIR, { recursive: true });
  writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf8");
}
