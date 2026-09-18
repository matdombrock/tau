import fs from 'node:fs';
import { TauLoop } from '../../tauloop.ts';
import { target } from './target';

const provider = 'openrouter';
const modelId = 'openrouter/free';
const thinking = 'low'; // 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
const cwd = 'tasks/lsys/workspace';

const promptContinue = `
The output of the L-system is currently incorrect.

The target pattern is:
${target}

The last result was:
{{RESULT}}
`;

const promptStart = `
Your goal is to create an L-system that has output which starts with the following target pattern:
${target}

The L-system you build may have:
- Any number of rules
- Any axiom
- Any number of iterations to meet the target pattern

You may not:
- Set the axiom to be exactly the target
- Set the axiom to contain exactly the target
- Set a single rule to produce exactly the target
- Set a single rule to contain exactly the target
- Edit the verify.ts file to output the target directly
  - The verify.ts file must produce the output of a real L-system.
  - The verify.ts file must run generateLSystem()
- Read or edit any files outside of this directory
  - This includes the '../lsystem.ts' file!

Remember: The output only needs to *start with* the target pattern, not match it exactly.

To accomplish this goal you will need to edit the L-system data in:
./lsys.json

You will run and test your solution with the command:
tsx verify.ts

You are being run in an infinite loop until you complete the goal of editing verify.ts to produce the target L-system. Do not give up until it does. 
`;

const tl = new TauLoop({
  provider,
  modelId,
  thinking,
  cwd,
  promptStart,
  promptContinue,
});
await tl.run();

console.log('ok!');

console.log('Solution:');
console.log(fs.readFileSync(cwd + '/lsys.json', 'utf-8'));
console.log('Produces:');
console.log(target);
