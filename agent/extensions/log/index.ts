/**
 * Log Extension
 *
 * Listens for tool calls and logs their human-readable system timestamp, input,
 * and truncated output. Each tool gets its own file under ~/.pi/log/, named
 * ~/.pi/log/<tool>.log.
 *
 * When a log file passes 1 MB in size it is rotated to ~/.pi/log/<tool>.log.1.
 *
 * Each tool call produces one JSON line:
 *   { "ts":"YYYY-MM-DD HH:MM:SS.mmm", "session":"<name or id>", "tool":"...",
 *     "input":"...","output":"...","error":false }
 */

import { appendFile, mkdir, rename, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	truncateHead,
} from "@earendil-works/pi-coding-agent";

const LOG_DIR = join(homedir(), ".pi", "log");
const MAX_LOG_BYTES = 1 * 1024 * 1024; // 1 MB

function logPaths(tool: string): { file: string; rotated: string } {
	const file = join(LOG_DIR, `${tool}.log`);
	return { file, rotated: `${file}.1` };
}

// Buffer tool inputs per toolCallId so we can pair them with results.
const pendingInputs = new Map<string, string>();

function timestamp(): string {
	const now = new Date();
	const pad = (n: number, w = 2) => String(n).padStart(w, "0");
	return (
		`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
		`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`
	);
}

function truncateText(text: string): string {
	const result = truncateHead(text, {
		maxLines: DEFAULT_MAX_LINES,
		maxBytes: DEFAULT_MAX_BYTES,
	});
	if (result.truncated) {
		return result.content + `\n[... truncated: showed ${result.outputBytes}/${result.outputLines} of ${result.totalBytes}/${result.totalLines}]`;
	}
	return result.content;
}

async function rotateIfNeeded(file: string, rotated: string): Promise<void> {
	try {
		const info = await stat(file);
		if (info.size >= MAX_LOG_BYTES) {
			// Remove any stale rotated file, then rotate.
			try {
				await rename(file, rotated);
			} catch {
				// Best-effort; ignore failures.
			}
		}
	} catch {
		// File doesn't exist yet; nothing to rotate.
	}
}

async function appendEntry(file: string, text: string): Promise<void> {
	await mkdir(LOG_DIR, { recursive: true });
	await appendFile(file, text, "utf8");
}

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event) => {
		const input = JSON.stringify(event.input);
		pendingInputs.set(event.toolCallId, input);
	});

	pi.on("tool_result", async (event, ctx) => {
		const input = pendingInputs.get(event.toolCallId) ?? "";
		pendingInputs.delete(event.toolCallId);

		const output = event.content
			.map((c) => c.type === "text" ? c.text : `[${c.type} content]`)
			.filter(Boolean)
			.join("\n");

		const sessionName = pi.getSessionName();
		const session = sessionName ?? ctx.sessionManager.getSessionId();

		const entry = {
			ts: timestamp(),
			session,
			tool: event.toolName,
			input: truncateText(input),
			output: truncateText(output),
			error: event.isError,
		};

		const { file, rotated } = logPaths(event.toolName);
		await rotateIfNeeded(file, rotated);
		await appendEntry(file, JSON.stringify(entry) + "\n");
	});
}