import { LMStudioClient } from "@lmstudio/sdk";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const HOST = "192.168.1.21";
const PORT = 1234;

export default async function(pi: ExtensionAPI) {
  let discovered: Array<{
    id: string;
    name: string;
    contextWindow: number;
    vision: boolean;
  }> = [];

  try {
    // The LM Studio TS SDK talks to the server over WebSocket.
    const client = new LMStudioClient({ baseUrl: `ws://${HOST}:${PORT}` });

    // Models already in memory: report the actual loaded context length.
    const loadedContexts = new Map<string, number>();
    for (const model of await client.llm.listLoaded()) {
      try {
        loadedContexts.set(model.modelKey, await model.getContextLength());
      } catch {
        // Model may have been unloaded between listing and querying.
      }
    }

    // All downloaded LLMs, with their model metadata from the SDK.
    discovered = (await client.system.listDownloadedModels("llm")).map((info) => ({
      id: info.modelKey,
      name: info.displayName,
      contextWindow: loadedContexts.get(info.modelKey) ?? info.maxContextLength,
      vision: info.vision,
    }));

    await client[Symbol.asyncDispose]();
  } catch {
    discovered = [];
  }

  if (discovered.length === 0) {
    discovered = [
      { id: "default", name: "LM Studio Remote", contextWindow: 128000, vision: false },
    ];
  }

  pi.registerProvider("lmstudio-remote", {
    name: "LM Studio Remote",
    baseUrl: `http://${HOST}:${PORT}/v1`,
    api: "openai-completions",
    apiKey: "not-needed",
    models: discovered.map((model) => ({
      id: model.id,
      name: model.name,
      reasoning: false,
      input: model.vision ? ["text", "image"] : ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: model.contextWindow,
      maxTokens: Math.min(model.contextWindow, 16384),
      compat: {
        supportsDeveloperRole: false,
        supportsReasoningEffort: false,
      },
    })),
  });
}
