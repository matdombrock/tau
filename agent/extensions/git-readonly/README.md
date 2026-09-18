# Git Read-Only Extension

Requires user confirmation before the agent can run non-read-only git commands or write to `.git/` paths.

## Behaviour

**Read-only git commands are always allowed** (no prompt):

- `git log`, `git shortlog`
- `git status`, `git diff`, `git show`
- `git blame`, `git describe`
- `git rev-parse`, `git rev-list`
- `git ls-files`, `git ls-tree`
- `git cat-file`
- `git branch` / `git branch --list` (listing only)
- `git tag` / `git tag --list` (listing only)
- `git stash list`, `git stash show`
- `git config --list`, `git config --get`
- `git help`, `git version`
- `git grep`
- `git worktree list`

**Non-read-only commands prompt for confirmation** (commit, push, pull, merge, rebase, reset, add, branch -d, etc.):

| Option | Effect |
|--------|--------|
| **Yes, allow once** | Permits this single command |
| **Yes, allow for this session** | Permits all write git commands for the rest of the session |
| **No, block** | Blocks the command |

Also intercepts `write` and `edit` tool calls targeting `.git/` paths.

## File

```
~/.pi/agent/extensions/git-readonly/
├── index.ts    # Extension code
└── README.md   # This file
```
