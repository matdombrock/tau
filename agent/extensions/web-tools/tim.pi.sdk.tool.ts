import { getMarkdown, getSearch } from "./tim.core";
import type { Engine } from "./tim.core";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import * as fs from 'node:fs';

interface Config {
  engine: Engine,
  braveApiKey: string,
  searchxngUrl: string,
}

const config: Config = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf-8')) as Config;

export const webFetchTool = defineTool({
  name: "web_fetch",
  label: "Web Fetch",
  description: "Fetch a URL and return clean readable markdown text",
  parameters: Type.Object({
    url: Type.String({ description: "The URL to fetch" }),
  }),
  execute: async (_toolCallId, params) => {
    const markdown = await getMarkdown(params.url);
    return {
      content: [{ type: "text", text: markdown }],
      details: { url: params.url },
    };
  },
});

export const webSearchTool = defineTool({
  name: "web_search",
  label: "Web Search",
  description: "Search the web for a query",
  parameters: Type.Object({
    query: Type.String({ description: "The search query" }),
  }),
  execute: async (_toolCallId, params) => {
    const result = await getSearch({
      query: params.query,
      engine: config.engine,
      apiKey: config.braveApiKey,
      searchxngUrl: config.searchxngUrl,
    });
    return {
      content: [{ type: "text", text: result }],
      details: { query: params.query },
    };
  },
});
