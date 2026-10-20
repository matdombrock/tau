import { execSync } from "node:child_process";

import { generateReference, runAgentSolution } from "./fizzbuzzpop";

// Runs from the workspace directory. The agent's output lives in
// ./solution.ts relative to the workspace.
export const verify = (): void => {
  const workspaceDir = process.cwd();

  let actual: string;
  try {
    actual = runAgentSolution(workspaceDir);
  } catch (err) {
    console.log(`Error: could not run agent solution.ts`);
    console.log(String(err));
    return;
  }

  const expected = generateReference();

  if (actual === expected) {
    console.log("pass");
  } else {
    console.log("Error: output mismatch");
    console.log(`expected:\n'${expected}'`);
    console.log(`actual:\n'${actual}'`);
  }
};
