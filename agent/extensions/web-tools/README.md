# Tim (Web Tools)

A pi extension providing web fetching and search capabilities.

## Tools

- **`web_fetch`** — Fetch a URL and return the content as clean markdown text.
- **`web_search`** — Search the web via SearXNG or the Brave Search API.

## Command

- **`/tim get <url>`** — Fetch a URL interactively.
- **`/tim search <query>`** — Search the web interactively.

## Configuration

`web_search` reads `search.config.json` from this directory to pick the search provider and credentials:

```json
{
  "provider": "searxng",
  "braveApiKey": "",
  "searxngUrl": "http://localhost:1235/search?q="
}
```

- `provider` — `"searxng"` (default) or `"brave"`.
- `braveApiKey` — Your Brave Search API key (https://brave.com/search/api/). Required when `provider` is `"brave"`.
- `searxngUrl` — URL prefix of your SearXNG instance (same format as the old `SEARCH_URL` env var). Falls back to the `SEARCH_URL` env var, then the default above.
