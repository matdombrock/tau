import fs from "node:fs";
import { POSITIVES, NEGATIVES } from "./regex";

// Runs from the workspace directory. The agent's regex lives in ./pattern.txt.

/**
 * Validate an anchored regex string against the datasets.
 * Returns an array of human-readable problems (empty on full pass).
 */
export function validateRegex(source: string): string[] {
  const problems: string[] = [];
  let re: RegExp;
  try {
    re = new RegExp(`^(?:${source})$`);
  } catch (err) {
    problems.push(`Error: invalid regex: ${String(err)}`);
    return problems;
  }

  for (const pos of POSITIVES) {
    if (!re.test(pos)) {
      problems.push(`Error: "${pos}" should match but did not`);
    }
  }
  for (const neg of NEGATIVES) {
    if (re.test(neg)) {
      problems.push(`Error: "${neg}" should NOT match but did`);
    }
  }
  return problems;
}

export const verify = (): void => {
  let source: string;
  try {
    source = fs.readFileSync("./pattern.txt", "utf-8").trim();
  } catch {
    console.log("Error: pattern.txt not found");
    return;
  }

  const problems = validateRegex(source);
  if (problems.length === 0) {
    console.log("pass");
  } else {
    console.log(problems.join("\n"));
  }
};
