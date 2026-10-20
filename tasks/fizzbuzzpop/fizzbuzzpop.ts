// FizzBuzzPop runner + reference implementation.
//
// The agent must write a ./solution.ts file in its workspace that exports a
// `generate()` function returning the output string (numbers 1..N, one per line).
// `runAgentSolution()` spawns the agent's file so the verifier never depends on
// how the agent chose to build it.

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { FIZZ_BUZZ_POP_N, FIZZ, BUZZ, POP } from "./target";

/**
 * Reference implementation — computes the expected output.
 */
export function generateReference(): string {
  const lines: string[] = [];
  for (let n = 1; n <= FIZZ_BUZZ_POP_N; n++) {
    let out = "";
    if (n % FIZZ === 0) out += "Fizz";
    if (n % BUZZ === 0) out += "Buzz";
    if (n % POP === 0) out += "Pop";
    lines.push(out || String(n));
  }
  return lines.join("\n");
}

/**
 * Run the agent's solution.ts by spawning a child process, then read its stdout.
 * The agent's file should `console.log` (or otherwise print) its output string.
 */
export function runAgentSolution(workspaceDir: string): string {
  const solutionPath = path.resolve(workspaceDir, "solution.ts");
  const script = `
import { generate } from ${JSON.stringify(solutionPath)};
console.log(generate());
`;
  const tmp = path.resolve(workspaceDir, ".run-solution.ts");
  fs.writeFileSync(tmp, script);
  try {
    return execSync(`tsx ${tmp}`, { encoding: "utf-8" }).trim();
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}
