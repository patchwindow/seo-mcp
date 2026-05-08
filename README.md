# @patchwindow/seo-mcp

MCP server for Google Search Console and Bing Webmaster Tools. Connect your AI assistant to live SEO data — search performance, indexing status, keyword research, crawl health, and more.

## Tools

### Google Search Console

| Tool | Description |
|---|---|
| `gsc_search_performance` | Clicks, impressions, CTR, and position with filters for query, page, device, and country |
| `gsc_striking_distance` | Queries ranking in positions 4–20 — low-hanging fruit for quick ranking improvements |
| `gsc_traffic_drop` | Compare two periods and flag pages or queries with significant click drops |
| `gsc_url_inspection` | Indexing status, crawl date, canonical URL, rich results, and mobile usability for any URL |
| `gsc_sitemap_list` | All submitted sitemaps with URL counts, indexed counts, and error status |
| `gsc_brand_nonbrand` | Split traffic into branded and non-branded segments with aggregated metrics |

### Bing Webmaster Tools

| Tool | Description |
|---|---|
| `bing_keyword_research` | Search volume and related keywords (exclusive to Bing, not available in GSC) |
| `bing_crawl_health` | Crawl statistics and specific crawl issues (4xx, 5xx, timeouts, blocked URLs) |
| `bing_url_inspection` | Indexing status, HTTP code, crawl date, and link counts for any URL |
| `bing_sitemap_list` | Sitemaps registered in Bing with URL counts, indexed counts, and last crawl |

## Installation

```bash
npm install -g @patchwindow/seo-mcp
```

Or use directly with `npx` (no global install required):

```bash
npx @patchwindow/seo-mcp
```

## Setup

### 1. Google Search Console

GSC requires OAuth2. You need a Google Cloud project with the Search Console API enabled.

**Create your OAuth2 credentials:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Google Search Console API** under APIs & Services
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Choose **Web application**
6. Add `http://localhost:3847/callback` as an authorized redirect URI
7. Copy the **Client ID** and **Client Secret**

> Note: Service accounts do not work with Google Search Console. OAuth2 user credentials are required.

**Authenticate (one-time):**

Set your credentials as environment variables and run the auth command:

```bash
export GSC_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GSC_CLIENT_SECRET="your-client-secret"

npx @patchwindow/seo-mcp auth gsc
```

A browser window will open for Google login. After approving, your token is saved to `~/.seo-mcp/gsc-token.json`. You only need to do this once — the token refreshes automatically.

### 2. Bing Webmaster Tools

Bing uses a simple API key. No OAuth required.

1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Navigate to **Settings → API Access**
3. Generate an API key
4. Set it as an environment variable: `BING_WEBMASTER_API_KEY=your-key`

## Configuration

### MCP Client Configuration

Add to your AI client's MCP server config:

**Claude Desktop (`claude_desktop_config.json`):**

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

**Cursor / Windsurf (`.cursor/mcp.json` or `mcp.json`):**

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

### Optional: Config File

Create `~/.seo-mcp/config.json` to set defaults so you don't need to pass `site_url` on every tool call:

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

The GSC `site_url` format is either `sc-domain:example.com` (domain property) or `https://example.com/` (URL prefix property). Check your property type in Search Console.

## Tool Reference

### `gsc_search_performance`

Query search analytics data from Google Search Console.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `site_url` | string | No* | GSC site URL. Uses config default if omitted. |
| `start_date` | string | Yes | Start date (YYYY-MM-DD) |
| `end_date` | string | Yes | End date (YYYY-MM-DD) |
| `dimensions` | array | No | Group by: `query`, `page`, `country`, `device`, `date`. Default: `["query"]` |
| `filter_query` | string | No | Filter to queries containing this string |
| `filter_page` | string | No | Filter to this exact page URL |
| `filter_device` | string | No | Filter to device: `DESKTOP`, `MOBILE`, `TABLET` |
| `filter_country` | string | No | Filter to country (ISO 3166-1 alpha-3, e.g. `USA`) |
| `row_limit` | number | No | Max rows. Default 100, max 25000 |

### `gsc_striking_distance`

Find queries in positions 4–20 with significant impressions.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `site_url` | string | No* | GSC site URL |
| `start_date` | string | Yes | Start date |
| `end_date` | string | Yes | End date |
| `min_position` | number | No | Min position to include. Default: 4 |
| `max_position` | number | No | Max position to include. Default: 20 |
| `min_impressions` | number | No | Min impressions. Default: 10 |
| `row_limit` | number | No | Max results. Default: 50 |

### `gsc_traffic_drop`

Compare two periods and surface pages or queries with the biggest click drops.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `site_url` | string | No* | GSC site URL |
| `current_start` | string | Yes | Current period start |
| `current_end` | string | Yes | Current period end |
| `previous_start` | string | Yes | Previous period start |
| `previous_end` | string | Yes | Previous period end |
| `dimension` | string | No | `page` or `query`. Default: `page` |
| `min_drop_percent` | number | No | Minimum drop % to flag. Default: 20 |
| `min_clicks_previous` | number | No | Min clicks in previous period. Default: 5 |
| `row_limit` | number | No | Max results. Default: 25 |

### `gsc_url_inspection`

Inspect indexing status for a specific URL.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `url` | string | Yes | The URL to inspect |
| `site_url` | string | No* | GSC site URL |

### `gsc_sitemap_list`

List all sitemaps for a site.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `site_url` | string | No* | GSC site URL |

### `gsc_brand_nonbrand`

Split search traffic into branded and non-branded segments.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `site_url` | string | No* | GSC site URL |
| `start_date` | string | Yes | Start date |
| `end_date` | string | Yes | End date |
| `brand_terms` | array | Yes | Brand terms to match (case-insensitive). Example: `["acme", "acmecorp"]` |
| `show_top_queries` | boolean | No | Include top 10 queries per segment. Default: true |

### `bing_keyword_research`

Get search volume and related keywords from Bing.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `keyword` | string | Yes | The keyword to research |
| `site_url` | string | No* | Bing site URL |
| `country` | string | No | Country code (e.g. `US`). Default: `US` |
| `language` | string | No | Language code (e.g. `en-US`). Default: `en-US` |
| `include_related` | boolean | No | Include related keywords. Default: true |

### `bing_crawl_health`

Get crawl statistics and issues from Bing.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `site_url` | string | No* | Bing site URL |
| `show_issues` | boolean | No | Include specific crawl issues. Default: true |
| `max_issues` | number | No | Max issues to show. Default: 20 |

### `bing_url_inspection`

Inspect a URL's status in Bing.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `url` | string | Yes | The URL to inspect |
| `site_url` | string | No* | Bing site URL |

### `bing_sitemap_list`

List sitemaps in Bing Webmaster Tools.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `site_url` | string | No* | Bing site URL |

*Not required if `default_site` is set in `~/.seo-mcp/config.json`.

## Building from Source

```bash
git clone https://github.com/patchwindow/seo-mcp
cd seo-mcp
npm install
npm run build
```

## License

MIT — [Patch Window](https://patchwindow.serverdigital.net)
