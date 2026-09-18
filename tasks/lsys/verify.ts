import fs from 'node:fs';
import { LSystemContext, generateLSystem } from './lsystem.ts';
import { target } from './target';

export const verify = () => {
  // Path relative to workspace
  const context: LSystemContext = JSON.parse(fs.readFileSync('./lsys.json', 'utf-8')) as LSystemContext;

  // Validate against target
  if (context.axiom.toLowerCase().includes(target.toLowerCase())) {
    throw 'Error: axiom must not contain the target!';
  }
  for (let rule of context.rules) {
    if (rule.production.join('').toLowerCase().includes(target.toLowerCase())) {
      throw 'Error: rule must not contain exactly the target: ' + JSON.stringify(rule);
    }
  }

  // Valid lsystem context
  // Try it out
  const res = generateLSystem(context);
  if (res.trim().startsWith(target)) {
    console.log('pass');
  } else {
    console.log(`Error: output mismatch`);
    console.log(`output:\n'${res}'\ntarget:\n'${target}'`);
  }
};
