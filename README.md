# @patchwindow/seo-mcp

[![npm version](https://img.shields.io/npm/v/@patchwindow/seo-mcp)](https://www.npmjs.com/package/@patchwindow/seo-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)

MCP server for Google Search Console and Bing Webmaster Tools. Give your AI assistant live access to search performance data, indexing status, keyword research, crawl health, and more — directly in the chat.

---

## Features

- **10 SEO tools** across Google Search Console and Bing Webmaster Tools
- **Keyword research** via Bing — search volume and related keywords not available in GSC
- **Traffic drop analysis** — automatically compare two periods and surface the biggest drops
- **Striking distance finder** — identify queries in positions 4–20 ready for quick ranking gains
- **Brand vs. non-brand split** — segment traffic without leaving your AI chat
- **Dual URL inspection** — inspect any URL in both Google and Bing simultaneously
- **Simple auth** — Bing needs one env var; GSC uses a one-time OAuth2 flow with auto-refreshing tokens
- **Config file defaults** — set your site URL once, skip it on every tool call

---

## Installation

Install globally:

```bash
npm install -g @patchwindow/seo-mcp
```

Or run without installing:

```bash
npx @patchwindow/seo-mcp
```

---

## Setup

### Bing Webmaster Tools

Bing uses an API key. No OAuth required.

1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Navigate to **Settings → API Access**
3. Generate an API key
4. Set the environment variable:

```bash
export BING_WEBMASTER_API_KEY="your-api-key"
```

That's it.

---

### Google Search Console

GSC requires OAuth2. Service accounts do not work with the Search Console API — user credentials are required.

**Step 1: Create a Google Cloud project**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Go to **APIs & Services → Library**
4. Search for **Google Search Console API** and enable it

**Step 2: Create OAuth2 credentials**

1. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
2. Choose **Web application** as the application type
3. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3847/callback
   ```
4. Copy the **Client ID** and **Client Secret**

**Step 3: Authenticate (one-time)**

Set your credentials as environment variables, then run the auth command:

```bash
export GSC_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GSC_CLIENT_SECRET="your-client-secret"

npx @patchwindow/seo-mcp auth gsc
```

A browser window opens for Google login. After approving, the token is saved to `~/.seo-mcp/gsc-token.json`. You only need to do this once — the token refreshes automatically.

---

### Config File (optional)

Create `~/.seo-mcp/config.json` to set default site URLs. This lets you skip the `site_url` parameter on every tool call:

```json
{
  "gsc": {
    "default_site": "sc-domain:example.com"
  },
  "bing": {
    "default_site": "https://example.com/"
  },
  "output": {
    "max_rows": 500
  }
}
```

**GSC site URL format:** Use `sc-domain:example.com` for domain properties or `https://example.com/` for URL prefix properties. Check which type you have in Search Console under your property settings.

---

## Claude Desktop Integration

Add the following to your `claude_desktop_config.json` (typically at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "seo": {
      "command": "npx",
      "args": ["@patchwindow/seo-mcp"],
      "env": {
        "BING_WEBMASTER_API_KEY": "your-bing-api-key",
        "GSC_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
        "GSC_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

**Cursor / Windsurf** (`.cursor/mcp.json` or `mcp.json`):

```json
{
  "seo-mcp": {
    "command": "npx",
    "args": ["@patchwindow/seo-mcp"],
    "env": {
      "BING_WEBMASTER_API_KEY": "your-bing-api-key",
      "GSC_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
      "GSC_CLIENT_SECRET": "your-client-secret"
    }
  }
}
```

Restart your AI client after saving the config.

---

## Tools Reference

`*` = not required if `default_site` is set in `~/.seo-mcp/config.json`.

### Google Search Console

| Tool | Description | Required params | Optional params |
|---|---|---|---|
| `gsc_search_performance` | Clicks, impressions, CTR, and position. Supports grouping by query, page, country, device, or date. | `start_date`, `end_date` | `site_url`*, `dimensions`, `filter_query`, `filter_page`, `filter_device`, `filter_country`, `row_limit` |
| `gsc_striking_distance` | Queries in positions 4–20 sorted by impressions — best candidates for quick ranking improvements. | `start_date`, `end_date` | `site_url`*, `min_position`, `max_position`, `min_impressions`, `row_limit` |
| `gsc_traffic_drop` | Compare two date periods and surface pages or queries with the largest click drops. | `current_start`, `current_end`, `previous_start`, `previous_end` | `site_url`*, `dimension`, `min_drop_percent`, `min_clicks_previous`, `row_limit` |
| `gsc_url_inspection` | Indexing status, crawl date, canonical URL, page fetch state, rich results, and mobile usability for a specific URL. | `url` | `site_url`* |
| `gsc_sitemap_list` | All sitemaps submitted to GSC with status, URL counts, indexed counts, and error summary. | — | `site_url`* |
| `gsc_brand_nonbrand` | Split search traffic into branded and non-branded segments with aggregated clicks, impressions, CTR, and position. | `start_date`, `end_date`, `brand_terms` | `site_url`*, `show_top_queries` |

### Bing Webmaster Tools

| Tool | Description | Required params | Optional params |
|---|---|---|---|
| `bing_keyword_research` | Monthly search volume and related keywords from Bing. This data is exclusive to Bing — not available in GSC. | `keyword` | `site_url`*, `country`, `language`, `include_related` |
| `bing_crawl_health` | Crawl statistics (total crawled, errors by type: 4xx, timeouts, DNS failures, blocked) and a list of specific crawl issues. | — | `site_url`*, `show_issues`, `max_issues` |
| `bing_url_inspection` | HTTP status, indexing state, crawl date, page title, internal/external link counts, and redirect target for a URL. | `url` | `site_url`* |
| `bing_sitemap_list` | Sitemaps registered in Bing Webmaster Tools with URL counts, indexed counts, errors, and last crawl time. | — | `site_url`* |

### Parameter details

<details>
<summary>gsc_search_performance</summary>

| Parameter | Type | Description |
|---|---|---|
| `site_url` | string | GSC site URL (`sc-domain:example.com` or `https://example.com/`) |
| `start_date` | string | Start date, YYYY-MM-DD |
| `end_date` | string | End date, YYYY-MM-DD |
| `dimensions` | array | Group by: `query`, `page`, `country`, `device`, `date`. Default: `["query"]` |
| `filter_query` | string | Filter to queries containing this string |
| `filter_page` | string | Filter to this exact page URL |
| `filter_device` | string | `DESKTOP`, `MOBILE`, or `TABLET` |
| `filter_country` | string | ISO 3166-1 alpha-3 country code, e.g. `USA` |
| `row_limit` | number | Max rows. Default: 100. Max: 25000 |

</details>

<details>
<summary>gsc_striking_distance</summary>

| Parameter | Type | Description |
|---|---|---|
| `site_url` | string | GSC site URL |
| `start_date` | string | Start date, YYYY-MM-DD |
| `end_date` | string | End date, YYYY-MM-DD |
| `min_position` | number | Min position to include. Default: 4 |
| `max_position` | number | Max position to include. Default: 20 |
| `min_impressions` | number | Min impressions to include. Default: 10 |
| `row_limit` | number | Max results. Default: 50 |

</details>

<details>
<summary>gsc_traffic_drop</summary>

| Parameter | Type | Description |
|---|---|---|
| `site_url` | string | GSC site URL |
| `current_start` | string | Current period start, YYYY-MM-DD |
| `current_end` | string | Current period end, YYYY-MM-DD |
| `previous_start` | string | Previous period start, YYYY-MM-DD |
| `previous_end` | string | Previous period end, YYYY-MM-DD |
| `dimension` | string | `page` or `query`. Default: `page` |
| `min_drop_percent` | number | Minimum drop % to flag. Default: 20 |
| `min_clicks_previous` | number | Minimum clicks in previous period. Default: 5 |
| `row_limit` | number | Max results. Default: 25 |

</details>

<details>
<summary>gsc_brand_nonbrand</summary>

| Parameter | Type | Description |
|---|---|---|
| `site_url` | string | GSC site URL |
| `start_date` | string | Start date, YYYY-MM-DD |
| `end_date` | string | End date, YYYY-MM-DD |
| `brand_terms` | array | Brand terms to match, case-insensitive. E.g. `["acme", "acmecorp"]` |
| `show_top_queries` | boolean | Include top 10 queries per segment. Default: true |

</details>

<details>
<summary>bing_keyword_research</summary>

| Parameter | Type | Description |
|---|---|---|
| `keyword` | string | The keyword to research |
| `site_url` | string | Bing site URL |
| `country` | string | Two-letter country code, e.g. `US`. Default: `US` |
| `language` | string | Language code, e.g. `en-US`. Default: `en-US` |
| `include_related` | boolean | Include related keywords. Default: true |

</details>

<details>
<summary>bing_crawl_health</summary>

| Parameter | Type | Description |
|---|---|---|
| `site_url` | string | Bing site URL |
| `show_issues` | boolean | Include specific crawl issues. Default: true |
| `max_issues` | number | Max issues to show. Default: 20 |

</details>

---

## Examples

Ask your AI assistant:

**Find quick wins for content optimization:**
> "Show me my top striking distance queries for the last 90 days. I want queries where I'm ranking between 5 and 15 with at least 50 impressions."

**Diagnose a traffic drop:**
> "Compare my search traffic for April 2025 vs April 2024 by page. Flag anything that dropped more than 30%."

**Research a topic before writing:**
> "Research the keyword 'typescript performance' in Bing. Show me monthly search volume and the top related keywords."

**Audit indexing:**
> "Inspect the URL https://example.com/blog/my-post and tell me its indexing status, canonical URL, and whether it's eligible for rich results."

**Understand brand exposure:**
> "Split my search traffic for Q1 2025 into branded and non-branded. My brand terms are 'acme' and 'acmecorp'. Show me the top 10 queries for each segment."

---

## Roadmap

Planned for v2:

- `gsc_top_pages` — top pages by traffic with trend comparison
- `bing_link_counts` — inbound link data (not available in GSC API)
- `bing_url_submit` — trigger reindexing for new or updated URLs
- `gsc_batch_url_inspection` — inspect a list of URLs with rate-limit handling
- `bing_crawl_settings` — read and update Bing crawl frequency settings
- Multi-site support — switch between properties without reconfiguring

---

## Building from Source

```bash
git clone https://github.com/patchwindow/seo-mcp
cd seo-mcp
npm install
npm run build
```

---

## Contributing

Issues and pull requests are welcome. Please open an issue before starting work on a significant change.

---

## License

MIT — [Patch Window](https://patchwindow.serverdigital.net)
