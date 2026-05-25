import { google } from "googleapis";
import { readTokens, writeTokens } from "./token-store.js";

export const GSC_REDIRECT_PORT = 3847;
export const GSC_REDIRECT_URI = `http://localhost:${GSC_REDIRECT_PORT}/callback`;

export const GSC_SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/webmasters",
  "https://www.googleapis.com/auth/indexing",
];

export function getOAuth2Client() {
  const clientId = process.env.GSC_CLIENT_ID;
  const clientSecret = process.env.GSC_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "GSC_CLIENT_ID and GSC_CLIENT_SECRET must be set.\n" +
      "Run: npx @patchwindow/seo-mcp auth gsc\n" +
      "See README for Google Cloud Console setup instructions."
    );
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, GSC_REDIRECT_URI);

  const tokens = readTokens();
  if (!tokens) {
    throw new Error(
      "GSC not authenticated. Run: npx @patchwindow/seo-mcp auth gsc"
    );
  }

  oauth2.setCredentials(tokens);
  oauth2.on("tokens", (newTokens) => {
    writeTokens({ ...tokens, ...newTokens });
  });

  return oauth2;
}
