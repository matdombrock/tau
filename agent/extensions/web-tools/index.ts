import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { formatSize } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import * as fs from 'node:fs';
import { getMarkdown, getSearch } from "./tim.core"

export default function(pi: ExtensionAPI) {
  pi.registerTool({
    name: "web_fetch",
    label: "Web fetch",
    description: "Fetch a URL and return clean readable markdown text",
    promptSnippet: "Fetch a URL and return the content as markdown",
    promptGuidelines: [
      "Use web_get when the user asks to fetch content from a URL or web page",
    ],
    parameters: Type.Object({
      url: Type.String({ description: "The URL to fetch" }),
    }),
    renderCall(args, theme, _context) {
      let text = theme.fg("toolTitle", theme.bold("web_fetch "));
      text += theme.fg("dim", args.url);
      return new Text(text, 0, 0);
    },

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const markdown = await getMarkdown(params.url);
      const lines = markdown.split("\n").length;
      const bytes = new TextEncoder().encode(markdown).length;
      return {
        content: [{ type: "text", text: markdown }],
        details: { url: params.url, lines, bytes },
      };
    },

    renderResult(result, { expanded, isPartial }, theme, _context) {
      if (isPartial) return new Text(theme.fg("warning", "Fetching..."), 0, 0);

      const content = result.content[0];
      if (content?.type !== "text") return new Text(theme.fg("error", "No content"), 0, 0);

      const d = result.details as { url: string; lines: number; bytes: number } | undefined;
      let display = theme.fg("success", "\u2713") + theme.fg("dim", " Fetched ") + theme.fg("accent", d?.url ?? "");
      if (d) display += "\n" + theme.fg("dim", `${d.lines} lines, ${formatSize(d.bytes)}`);

      if (expanded) {
        const allLines = content.text.split("\n");
        const head = allLines.slice(0, 50);
        for (const line of head) {
          display += "\n" + theme.fg("muted", line);
        }
        if (allLines.length > 50) {
          display += "\n" + theme.fg("dim", `... ${allLines.length - 50} more lines`);
        }
      }

      return new Text(display, 0, 0);
    },
  });

  pi.registerTool({
    name: "web_search",
    label: "web Search",
    description: "Search the web for a query",
    promptSnippet: "Search the web for a query",
    promptGuidelines: [
      "Use web_search when the user asks to search the web. This is a limited resource, don't overuse it!",
    ],
    parameters: Type.Object({
      query: Type.String({ description: "The search query" }),
    }),
    renderCall(args, theme, _context) {
      let text = theme.fg("toolTitle", theme.bold("web_search "));
      text += theme.fg("dim", args.query);
      return new Text(text, 0, 0);
    },

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const config = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf-8'));
      const result = await getSearch({
        query: params.query,
        engine: config.engine,
        apiKey: config.braveApiKey,
        searchxngUrl: config.searxngUrl,
      });
      const resultCount = (result.match(/^# /gm) || []).length;
      return {
        content: [{ type: "text", text: result }],
        details: { query: params.query, resultCount },
      };
    },

    renderResult(result, { expanded, isPartial }, theme, _context) {
      if (isPartial) return new Text(theme.fg("warning", "Searching..."), 0, 0);

      const d = result.details as { query: string; resultCount: number } | undefined;
      let display = theme.fg("success", "\u2713") + theme.fg("dim", " Searched ") + theme.fg("accent", d?.query ?? "");
      if (d) display += "\n" + theme.fg("dim", `${d.resultCount} results`);

      if (expanded) {
        const text = result.content[0];
        if (text?.type === "text") {
          const lines = text.text.split("\n");
          const head = lines.slice(0, 40);
          for (const line of head) {
            display += "\n" + theme.fg("muted", line);
          }
          if (lines.length > 40) {
            display += "\n" + theme.fg("dim", `... ${lines.length - 40} more lines`);
          }
        }
      }

      return new Text(display, 0, 0);
    },
  });
}
