# Tau

> [!NOTE]
> 🧔 This README was written by a human!

A lightweight TypeScript library for writing **closed agentic loops**.

Built on top of the **pi coding agent** SDK. Tau wraps agent sessions so you can run prompts, stream output, and build self-correcting loops that iterate on a task until a **deterministic verifier** passes.

**STOP TALKING TO BOTS**

## What is a "Closed Agentic Loop"?

At first we talked to LLMs via chat interfaces. We could ask questions, but getting code in or out required a manual copy/paste. 

So we wrapped them up in "harnesses" to allow them to use tools, forced them into ReAct loops to keep them going, and put them to work. 

A closed agentic loop is the next step. Instead of talking to the agent at all, we lock the agent into a "closed loop" which involves no direct human interaction whatsoever.

The basic idea is to "trap" the agent into a loop which it can not exit until the goal is complete. This may sound straight-forward enough, but the task of defining the exit/completion criteria can sometimes be quite challenging. 

## Features

- **`Tau`** — A wrapper around the Pi SDK. Create an agent session, send prompts, stream output, and inspect the session/tool state.
- **`TauLoop`** — A wrapper around `Tau`. Run a prompt repeatedly against a `verify` script until it prints `pass`.
- **Sandboxed workspaces** — Each task runs in its own `cwd`; agents may not read or modify files outside it.
- **Container** (`container/`) — A podman/fedora image with the pi agent and tooling pre-installed.
- **Custom pi extensions** (`agent/extensions/`) — A git read-only guard, security/permissions guard, logging, web tools, and an LM Studio provider.

## Quick Start

```bash
npm install
tsx tasks/minimal/ls.ts
```

This connects to `openrouter`, creates a Tau session, and asks the agent to list the files in `./tasks/minimal/`.

## Usage

```ts
import { Tau } from './tau';

const tau = new Tau();
await tau.sessionInit('openrouter', 'openrouter/free', {
  thinkingLevel: 'low',   // 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'
  cwd: './example/',
});
tau.enableStreaming();

const res = await tau.sendPrompt('List the files in this directory.');
tau.sessionEnd();
```
## Container

> [!WARNING]
> It is **highly recommended** that you run `Tau` inside of a container. The permission system is designed as a best effort attempt to avoid "cheating" on tasks and generally creating a mess on the file system but it **IS NOT** a safety feature. 

### Build and Run
```sh
./container/build.sh
./container/run.sh
```

### Set API Key

If your host env has an `OPENROUTER_API_KEY` set this will be passed through to the container. If You need to set it manually:
```sh
# In the container

# Set your API key
set -x OPENROUTER_API_KEY sk-...

```

### Install Deps

```sh
# In the container
npm install
```

If you ran `npm install` on the host, the `node_modules` will be copied to the container. If the container is a similar enough OS this is likely good and fine. If not you will need to delete `node_modules` and run `npm install` again from the container. 

### Use
```sh
# In the container

tsx tasks/minimal/ls.ts
```

## Layout

```
tau.ts            Tau core: session init, prompts, streaming, session info
tauloop.ts        TauLoop: verify-driven iteration loop
example/          Runnable demonstrations
agent/            Configured pi extensions + agent instructions
container/        Podman/fedora image for running Tau
```
