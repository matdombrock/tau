# LM Studio Remote

Registers a provider pointing to an LM Studio instance at `192.168.1.3:1234`.

Uses the LM Studio TypeScript SDK (`@lmstudio/sdk`) for model discovery and metadata:

- Lists downloaded models via `client.system.listDownloadedModels("llm")`.
- For models already loaded in memory, reports the actual loaded context length via `model.getContextLength()`; otherwise falls back to the model's `maxContextLength` from the SDK.
- Sets per-model `contextWindow` and `maxTokens` from that data (no more hardcoded values), and enables image input for vision models.

Requests are still streamed over LM Studio's OpenAI-compatible HTTP endpoint.

Falls back to a single `default` model if the instance is unreachable.

## Usage

```bash
pi --provider lmstudio-remote --model <model-name>
```

Or set as default in `~/.pi/agent/settings.json`:

```json
{
  "defaultProvider": "lmstudio-remote",
  "defaultModel": "<model-name>"
}
```

No API key required.

## Dependencies

`@lmstudio/sdk` is declared in `package.json`; run `npm install` in this directory after adding the extension.
