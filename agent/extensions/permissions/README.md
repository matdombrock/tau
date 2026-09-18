## NOTE
Modified from main extension to remove audio alerts.

# Security Guard Extension

Merges **Perimeter Guard** and **Permission Gate** into one extension.

## Features

### Perimeter Guard
Intercepts file/directory access tools (`read`, `write`, `edit`, `ls`, `find`, `grep`) and prompts for confirmation when the target path is outside the project directory. Also does best-effort scanning of `bash` commands for outside-path references.

### Permission Gate
Prompts for user confirmation before executing potentially dangerous bash commands (`rm -rf`, `sudo`, `chmod`/`chown 777`).

## Command

| Command | Description |
|---------|-------------|
| `/lock` | Toggle the entire security guard on/off |

When unlocked (`/lock` once), all security checks are bypassed. When locked again (`/lock` again), checks resume and the session allowlist is cleared.

## Behaviour

When a tool tries to access a path outside `ctx.cwd`:

| Option | Effect |
|--------|--------|
| **Yes, allow once** | Permits this single access — will prompt again next time |
| **Yes, allow for this session** | Permits all access under that outside directory for the rest of the session (cleared on restart, `/reload`, or toggling `/lock`) |
| **No, block** | Blocks the operation |

## Tools Intercepted

| Tool | What's checked |
|------|----------------|
| `read` | `input.path` |
| `write` | `input.path` |
| `edit` | `input.path` |
| `ls` | `input.path` (defaults to `.`) |
| `find` | `input.path` (defaults to `.`) |
| `grep` | `input.path` (defaults to `.`) |
| `bash` | `input.command` — dangerous patterns (`rm -rf`, `sudo`, `chmod 777`) + tokenized path scanning |

## Non-Interactive Mode

When there's no UI (print mode, JSON mode), dangerous commands and outside-path access are blocked automatically.
