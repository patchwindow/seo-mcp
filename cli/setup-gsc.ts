import http from "http";
import { google } from "googleapis";
import { writeTokens } from "../src/auth/token-store.js";
import { GSC_REDIRECT_PORT, GSC_REDIRECT_URI, GSC_SCOPES } from "../src/auth/gsc.js";

export async function setupGsc() {
  const clientId = process.env.GSC_CLIENT_ID;
  const clientSecret = process.env.GSC_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      "Error: GSC_CLIENT_ID and GSC_CLIENT_SECRET must be set before running auth.\n\n" +
      "Steps:\n" +
      "  1. Go to https://console.cloud.google.com/\n" +
      "  2. Create a project and enable the Search Console API\n" +
      "  3. Create OAuth2 credentials (Web application type)\n" +
      "  4. Add http://localhost:3847/callback as an authorized redirect URI\n" +
      "  5. Set GSC_CLIENT_ID and GSC_CLIENT_SECRET in your environment\n" +
      "  6. Run this command again"
    );
    process.exit(1);
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, GSC_REDIRECT_URI);

  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    scope: GSC_SCOPES,
    prompt: "consent",
  });

  console.log("Opening browser for Google Search Console authorization...");
  console.log(`\nIf the browser does not open automatically, visit:\n${authUrl}\n`);

  try {
    const { default: open } = await import("open");
    await open(authUrl);
  } catch {
    // open is optional — user can visit the URL manually
  }

  await new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? "/", `http://localhost:${GSC_REDIRECT_PORT}`);

        if (url.pathname !== "/callback") {
          res.writeHead(404);
          res.end("Not found.");
          return;
        }

        const error = url.searchParams.get("error");
        if (error) {
          res.writeHead(400);
          res.end(`Authorization failed: ${error}. You can close this tab.`);
          server.close();
          reject(new Error(`OAuth2 error: ${error}`));
          return;
        }

        const code = url.searchParams.get("code");
        if (!code) {
          res.writeHead(400);
          res.end("No authorization code received. You can close this tab.");
          server.close();
          reject(new Error("No authorization code in callback"));
          return;
        }

        const { tokens } = await oauth2.getToken(code);
        writeTokens(tokens as Record<string, unknown>);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          "<html><body style='font-family:sans-serif;padding:2rem'>" +
          "<h1>Authorization complete</h1>" +
          "<p>You can close this tab. Your GSC credentials have been saved.</p>" +
          "</body></html>"
        );

        server.close();
        resolve();
      } catch (err) {
        res.writeHead(500);
        res.end("Internal error. Check your terminal.");
        server.close();
        reject(err);
      }
    });

    server.on("error", (err) => {
      reject(new Error(`Failed to start local server on port ${GSC_REDIRECT_PORT}: ${err.message}`));
    });

    server.listen(GSC_REDIRECT_PORT);
    console.log(`Waiting for Google callback on http://localhost:${GSC_REDIRECT_PORT}/callback ...`);
  });

  console.log("\nGSC authentication complete. Token saved to ~/.seo-mcp/gsc-token.json");
  console.log("You can now start the MCP server.");
}
