/**
 * Git Read-Only Extension
 *
 * Intercepts git commands in bash tool calls (and direct writes to .git/)
 * to require user confirmation before any non-read-only git operation.
 *
 * Read-only git operations are always allowed:
 *   log, status, diff, show, blame, shortlog, describe,
 *   rev-parse, rev-list, ls-files, ls-tree, cat-file,
 *   branch --list, tag --list, stash list, config --list
 *
 * Everything else (commit, push, pull, merge, rebase, reset, add, etc.)
 * prompts for confirmation with "allow once" / "allow for this session" / "block" options.
 *
 * Install: ~/.pi/agent/extensions/git-readonly/, then /reload
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// ─── Read-only git subcommands ──────────────────────────────────────────────

const READ_ONLY_GIT_PATTERNS: RegExp[] = [
	// log and variants
	/^git\s+log\b/,
	/^git\s+shortlog\b/,

	// status / diff / show
	/^git\s+status\b/,
	/^git\s+diff\b/,
	/^git\s+show\b/,

	// blame
	/^git\s+blame\b/,

	// describe
	/^git\s+describe\b/,

	// rev-parse / rev-list
	/^git\s+rev-parse\b/,
	/^git\s+rev-list\b/,

	// ls-files / ls-tree
	/^git\s+ls-files\b/,
	/^git\s+ls-tree\b/,

	// cat-file
	/^git\s+cat-file\b/,

	// branch --list / branch (no subcommand, lists branches)
	/^git\s+branch\s+--list\b/,
	/^git\s+branch\s*-l\b/,
	// bare "git branch" with no flags (listing) — allow
	// but "git branch -d", "git branch -m" etc are caught by not matching

	// tag --list
	/^git\s+tag\s+--list\b/,
	/^git\s+tag\s*-l\b/,
	// bare "git tag" lists tags

	// stash list
	/^git\s+stash\s+list\b/,

	// config --list / config --get / config get
	/^git\s+config\s+--list\b/,
	/^git\s+config\s+--get\b/,

	// help / version
	/^git\s+(help|version)\b/,

	// grep (search, not modify)
	/^git\s+grep\b/,

	// Worktree list
	/^git\s+worktree\s+list\b/,
];

// ─── Write git commands that should always prompt ───────────────────────────

function isReadOnlyGitCommand(command: string): boolean {
	// Strip leading whitespace
	const trimmed = command.trimStart();

	// Not a git command at all
	if (!trimmed.startsWith("git ")) return false;

	// Check read-only patterns
	for (const pattern of READ_ONLY_GIT_PATTERNS) {
		if (pattern.test(trimmed)) return true;
	}

	// Bare "git" with no subcommand shows help — read-only
	if (/^git\s*$/.test(trimmed)) return true;

	// Bare "git branch" (no -d, -m, etc) lists branches — read-only
	if (/^git\s+branch\s*$/.test(trimmed)) return true;

	// Bare "git tag" (no -d, -a, etc) lists tags — read-only
	if (/^git\s+tag\s*$/.test(trimmed)) return true;

	// "git stash" with no subcommand shows help — read-only
	if (/^git\s+stash\s*$/.test(trimmed)) return true;

	// "git stash show" — read-only
	if (/^git\s+stash\s+show\b/.test(trimmed)) return true;

	return false;
}

// ─── Session-scoped allowlist ───────────────────────────────────────────────

let sessionWriteAllowed = false;

function isBareGitDirectoryPath(path: string): boolean {
	return path === ".git" || path.startsWith(".git/") || path.includes("/.git/") || path.endsWith("/.git");
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", () => {
		sessionWriteAllowed = false;
	});

	pi.on("tool_call", async (event, ctx) => {
		// ── Intercept write/edit to .git/ paths ──────────────────────────────
		if (event.toolName === "write" || event.toolName === "edit") {
			const rawPath = (event.input as Record<string, unknown>).path as string | undefined;
			if (rawPath && isBareGitDirectoryPath(rawPath)) {
				if (sessionWriteAllowed) return undefined;

				if (!ctx.hasUI) {
					return { block: true, reason: `Write to git path "${rawPath}" blocked (no UI for confirmation).` };
				}

				const choice = await ctx.ui.select(
					`🔒 Attempting to write to a git directory:\n\n  ${rawPath}\n\nThis could corrupt the repository. Allow?`,
					["Yes, allow once", "Yes, allow for this session", "No, block"],
				);

				if (choice === "Yes, allow for this session") {
					sessionWriteAllowed = true;
					ctx.ui.notify("Allowed write access to .git/ for this session", "info");
					return undefined;
				}

				if (choice === "Yes, allow once") {
					ctx.ui.notify(`Allowed write to ${rawPath}`, "info");
					return undefined;
				}

				ctx.ui.notify(`Blocked write to ${rawPath}`, "warning");
				return { block: true, reason: `Write to git path "${rawPath}" blocked by user.` };
			}
			return undefined;
		}

		// ── Intercept bash for git commands ──────────────────────────────────
		if (event.toolName === "bash") {
			const command = (event.input as Record<string, unknown>).command as string | undefined;
			if (!command) return undefined;

			// Trim to get the first line / primary command
			const firstCommand = command.split("\n")[0]?.trim() ?? "";

			// Not a git command — let it pass
			if (!firstCommand.startsWith("git ")) return undefined;

			// Read-only git — always allow
			if (isReadOnlyGitCommand(firstCommand)) return undefined;

			// Write git — check session allow
			if (sessionWriteAllowed) return undefined;

			if (!ctx.hasUI) {
				return {
					block: true,
					reason: `Non-read-only git command blocked (no UI for confirmation): ${firstCommand}`,
				};
			}

			const choice = await ctx.ui.select(
				`🔒 Non-read-only git command:\n\n  ${firstCommand}\n\nAllow?`,
				["Yes, allow once", "Yes, allow for this session", "No, block"],
			);

			if (choice === "Yes, allow for this session") {
				sessionWriteAllowed = true;
				ctx.ui.notify("Allowed non-read-only git commands for this session", "info");
				return undefined;
			}

			if (choice === "Yes, allow once") {
				ctx.ui.notify(`Allowed git command: ${firstCommand}`, "info");
				return undefined;
			}

			ctx.ui.notify(`Blocked git command: ${firstCommand}`, "warning");
			return {
				block: true,
				reason: `Non-read-only git command blocked by user: ${firstCommand}`,
			};
		}

		return undefined;
	});
}
