# Log Extension

Logs every tool call. Each tool gets its own file under `~/.pi/log/`:

    ~/.pi/log/<tool>.log

For example `~/.pi/log/bash.log`, `~/.pi/log/read.log`, `~/.pi/log/edit.log`.

Each entry is one JSON line containing:
- `ts` — human-readable system timestamp (`YYYY-MM-DD HH:MM:SS.mmm`)
- `session` — the session name if set, otherwise the session id
- `tool` — the tool name (`bash`, `read`, `edit`, ...)
- `input` — the (truncated) tool arguments
- `output` — the (truncated) tool result text
- `error` — whether the tool call errored

Input and output are truncated to the standard limits (2000 lines / 50 KB).

When a log file grows past 1 MB it is rotated to `~/.pi/log/<tool>.log.1`.