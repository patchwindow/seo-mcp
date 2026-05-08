#!/usr/bin/env node
import { startServer } from "./src/server.js";

const args = process.argv.slice(2);

if (args[0] === "auth" && args[1] === "gsc") {
  const { setupGsc } = await import("./cli/setup-gsc.js");
  await setupGsc();
  process.exit(0);
}

await startServer();
