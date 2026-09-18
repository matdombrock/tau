/**
 * Security Guard Extension
 *
 * Merges perimeter-guard and permission-gate into one extension.
 *
 * Perimeter Guard: Intercepts file/directory access tools (read, write, edit, find, grep, ls)
 * to prompt for confirmation when the target path is outside the project directory (ctx.cwd).
 * Also does best-effort scanning of bash commands for outside-path references.
 *
 * Permission Gate: Prompts for confirmation before running potentially dangerous bash commands
 * (rm -rf, sudo, chmod/chown 777).
 *
 * Includes "Allow for this session" option — once allowed, all paths under the same
 * parent outside-directory are permitted until pi restarts or /reload is called.
 *
 * A /lock command toggles the entire extension on and off.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isAbsolute, normalize, resolve, sep } from "node:path";

// ─── Lock state ─────────────────────────────────────────────────────────────

let locked = true; // start enabled (locked)

// ─── Path helpers (from perimeter-guard) ────────────────────────────────────

/**
 * Resolve a path parameter to an absolute path.
 * If relative, it's resolved against ctx.cwd.
 */
function resolvePath(raw: string, cwd: string): string {
  const normalized = normalize(raw);
  if (isAbsolute(normalized)) {
    return normalized;
  }
  return resolve(cwd, normalized);
}

/**
 * Check if a resolved absolute path is outside the project directory.
 * Returns the project directory if outside, null if inside or equal.
 */
function isOutsideProject(absolutePath: string, cwd: string): string | null {
  const normalizedPath = normalize(absolutePath);
  const normalizedCwd = normalize(cwd);

  if (normalizedPath === normalizedCwd) {
    return null;
  }

  const prefix = normalizedCwd.endsWith(sep) ? normalizedCwd : normalizedCwd + sep;
  if (normalizedPath.startsWith(prefix)) {
    return null;
  }

  return normalizedCwd;
}

/**
 * Get the top-level outside directory from a path outside the project.
 * e.g. for /home/mathieu/Documents/file.txt with cwd /home/mathieu/.pi,
 * returns /home/mathieu.
 */
function getOutsideRoot(absolutePath: string, cwd: string): string {
  const normalizedPath = normalize(absolutePath);
  const normalizedCwd = normalize(cwd);

  const cwdParts = normalizedCwd.split(sep).filter(Boolean);
  const pathParts = normalizedPath.split(sep).filter(Boolean);

  let i = 0;
  while (i < cwdParts.length && i < pathParts.length && cwdParts[i] === pathParts[i]) {
    i++;
  }

  const rootParts = pathParts.slice(0, i + 1);
  return sep + rootParts.join(sep);
}

// ─── Bash helpers (from perimeter-guard) ────────────────────────────────────

function extractBashPaths(command: string): string[] {
  const paths: string[] = [];
  const tokens = tokenizeBashCommand(command);

  for (const token of tokens) {
    if (token.startsWith("-")) continue;
    if (/^(&&|\|\||;|&|\||>|<|>>|<<)$/.test(token)) continue;

    if (token.includes("/") || token.includes("\\") || token === "." || token === "..") {
      paths.push(token);
    } else if (/^[.\w-]+\.[a-zA-Z0-9]{1,10}$/.test(token) && !/^--/.test(token)) {
      paths.push(token);
    }
  }

  return paths;
}

function tokenizeBashCommand(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let escape = false;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];

    if (escape) {
      current += ch;
      escape = false;
      continue;
    }

    if (ch === "\\" && inDouble) {
      escape = true;
      continue;
    }

    if (ch === "\\" && !inSingle && !inDouble) {
      escape = true;
      continue;
    }

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (/\s/.test(ch) && !inSingle && !inDouble) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += ch;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function findOutsidePathsInBash(command: string, cwd: string): string[] {
  const rawPaths = extractBashPaths(command);
  const outsidePaths: string[] = [];

  for (const raw of rawPaths) {
    if (raw === ".") continue;
    if (raw.startsWith("$") || raw.startsWith("~")) continue;

    try {
      const absolute = resolvePath(raw, cwd);
      if (isOutsideProject(absolute, cwd)) {
        outsidePaths.push(raw);
      }
    } catch {
      // skip unresolvable paths
    }
  }

  return outsidePaths;
}

// ─── Session-scoped allowlist (from perimeter-guard) ────────────────────────

const sessionAllowedRoots = new Set<string>();

function isSessionAllowed(absolutePath: string): boolean {
  for (const root of sessionAllowedRoots) {
    if (absolutePath === root || absolutePath.startsWith(root + sep)) {
      return true;
    }
  }
  return false;
}

function clearSessionAllows() {
  sessionAllowedRoots.clear();
}

// ─── Dangerous command patterns (from permission-gate) ──────────────────────

const dangerousPatterns = [/\brm\s+(-rf?|--recursive)/i, /\bsudo\b/i, /\b(chmod|chown)\b.*777/i];

// ─── Display helpers ────────────────────────────────────────────────────────

const MAX_COMMAND_DISPLAY_CHARS = 400;
const MAX_PATHS_DISPLAY = 8;

/** Truncate a command for display in prompts (long commands break the TUI). */
function truncateCommand(command: string, max = MAX_COMMAND_DISPLAY_CHARS): string {
  if (command.length <= max) return command;
  return `${command.slice(0, max)}\n… [truncated — ${command.length} chars total]`;
}

/** Format an outside-path list for display, capped to avoid huge dialogs. */
function formatPathList(paths: string[]): string {
  const shown = paths.slice(0, MAX_PATHS_DISPLAY).map((p) => `  • ${p}`);
  if (paths.length > MAX_PATHS_DISPLAY) {
    shown.push(`  … and ${paths.length - MAX_PATHS_DISPLAY} more`);
  }
  return shown.join("\n");
}

// ─── Tool sets (from perimeter-guard) ───────────────────────────────────────

const PATH_TOOLS = new Set(["read", "write", "ls"]);
const OPTIONAL_PATH_TOOLS = new Set(["find", "grep", "ls"]);

export default function(pi: ExtensionAPI) {
  // Clear allowlist on session start
  pi.on("session_start", () => {
    clearSessionAllows();
  });

  // ── /lock command ────────────────────────────────────────────────────────
  pi.registerCommand("lock", {
    description: "Toggle the security guard on/off",
    handler: async (_args, ctx) => {
      locked = !locked;
      if (locked) {
        clearSessionAllows();
        ctx.ui.notify("🔒 Security guard enabled", "info");
      } else {
        ctx.ui.notify("🔓 Security guard disabled", "info");
      }
    },
  });

  // ── tool_call handler ────────────────────────────────────────────────────
  pi.on("tool_call", async (event, ctx) => {
    // If unlocked, allow everything
    if (!locked) return undefined;

    const toolName = event.toolName;
    const input = event.input as Record<string, unknown>;
    const cwd = ctx.cwd;

    // ── Permission Gate: dangerous bash commands ─────────────────────────
    if (toolName === "bash") {
      const command = input.command as string;
      if (!command) return undefined;

      // Check dangerous patterns first (permission-gate)
      const isDangerous = dangerousPatterns.some((p) => p.test(command));
      if (isDangerous) {
        if (!ctx.hasUI) {
          return { block: true, reason: "Dangerous command blocked (no UI for confirmation)" };
        }

        const choice = await ctx.ui.select(
          `⚠️ Dangerous command:\n\n  ${truncateCommand(command)}\n\nAllow?`,
          ["Yes", "No"],
        );

        if (choice !== "Yes") {
          return { block: true, reason: "Blocked by user" };
        }
      }

      // Then check outside paths (perimeter-guard for bash)
      const outsidePaths = findOutsidePathsInBash(command, cwd);

      if (outsidePaths.length > 0) {
        const allAllowed = outsidePaths.every((raw) => {
          const abs = resolvePath(raw, cwd);
          return isSessionAllowed(abs);
        });

        if (allAllowed) {
          return undefined;
        }

        if (!ctx.hasUI) {
          return { block: true, reason: `Bash command references paths outside project: ${outsidePaths.join(", ")}. Blocked (no UI for confirmation).` };
        }

        const outsideRoots = [
          ...new Set(outsidePaths.map((raw) => getOutsideRoot(resolvePath(raw, cwd), cwd))),
        ];

        const pathList = formatPathList(outsidePaths);
        const choice = await ctx.ui.select(
          `🔒 Bash command references paths outside your project directory:\n\n${pathList}\n\nCommand:\n  ${truncateCommand(command)}`,
          ["Yes, allow once", "Yes, allow for this session", "No, block"],
        );

        if (choice === "Yes, allow for this session") {
          for (const root of outsideRoots) {
            sessionAllowedRoots.add(root);
          }
          ctx.ui.notify(`Allowed access to outside paths for this session`, "info");
          return undefined;
        }

        if (choice === "Yes, allow once") {
          ctx.ui.notify(`Allowed bash command with outside paths`, "info");
          return undefined;
        }

        ctx.ui.notify(`Blocked bash command (outside paths): ${command.slice(0, 80)}`, "warning");
        return { block: true, reason: `Bash command blocked by user — references paths outside project: ${outsidePaths.join(", ")}.` };
      }

      return undefined;
    }

    // ── Perimeter Guard: file/directory tools ────────────────────────────
    if (PATH_TOOLS.has(toolName) || toolName === "edit") {
      const rawPath = input.path as string | undefined;
      if (!rawPath) return undefined;

      const absolutePath = resolvePath(rawPath, cwd);
      const projectDir = isOutsideProject(absolutePath, cwd);

      if (projectDir) {
        if (isSessionAllowed(absolutePath)) {
          return undefined;
        }

        if (!ctx.hasUI) {
          return { block: true, reason: `Path "${rawPath}" is outside the project directory (${projectDir}). Blocked (no UI for confirmation).` };
        }

        const outsideRoot = getOutsideRoot(absolutePath, cwd);
        const choice = await ctx.ui.select(
          `🔒 ${toolName} is trying to access:\n\n  ${rawPath}\n\nThis is outside your project directory (${projectDir}).`,
          ["Yes, allow once", "Yes, allow for this session", "No, block"],
        );

        if (choice === "Yes, allow for this session") {
          sessionAllowedRoots.add(outsideRoot);
          ctx.ui.notify(`Allowed access to ${outsideRoot}/* for this session`, "info");
          return undefined;
        }

        if (choice === "Yes, allow once") {
          ctx.ui.notify(`Allowed ${toolName} access to ${rawPath}`, "info");
          return undefined;
        }

        ctx.ui.notify(`Blocked ${toolName} access to ${rawPath}`, "warning");
        return { block: true, reason: `Access to "${rawPath}" blocked by user — path is outside the project directory.` };
      }

      return undefined;
    }

    // --- Handle find, grep (optional path parameter) ---
    if (OPTIONAL_PATH_TOOLS.has(toolName)) {
      const rawPath = (input.path as string) || ".";
      const absolutePath = resolvePath(rawPath, cwd);
      const projectDir = isOutsideProject(absolutePath, cwd);

      if (projectDir) {
        if (isSessionAllowed(absolutePath)) {
          return undefined;
        }

        if (!ctx.hasUI) {
          return { block: true, reason: `Path "${rawPath}" is outside the project directory (${projectDir}). Blocked (no UI for confirmation).` };
        }

        const outsideRoot = getOutsideRoot(absolutePath, cwd);
        const choice = await ctx.ui.select(
          `🔒 ${toolName} is searching in:\n\n  ${rawPath}\n\nThis is outside your project directory (${projectDir}).`,
          ["Yes, allow once", "Yes, allow for this session", "No, block"],
        );

        if (choice === "Yes, allow for this session") {
          sessionAllowedRoots.add(outsideRoot);
          ctx.ui.notify(`Allowed search in ${outsideRoot}/* for this session`, "info");
          return undefined;
        }

        if (choice === "Yes, allow once") {
          ctx.ui.notify(`Allowed ${toolName} search in ${rawPath}`, "info");
          return undefined;
        }

        ctx.ui.notify(`Blocked ${toolName} search in ${rawPath}`, "warning");
        return { block: true, reason: `Search path "${rawPath}" blocked by user — outside the project directory.` };
      }

      return undefined;
    }

    return undefined;
  });
}
