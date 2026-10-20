import { TauLoop } from '../../lib/TauLoop.ts';

const provider = 'openrouter';
const modelId = 'openrouter/free';
const thinking = 'low'; // 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
const cwd = 'tasks/minimal-loop/workspace';

const promptContinue = `
Your guess was incorrect.

Your goal is to guess a number between 1 and 10 and write it to a file called 'number.txt' in your workspace. 

The last guess was {{RESULT}}.
`;

const promptStart = `
Your goal is to guess a number between 1 and 10 and write it to a file called 'number.txt' in your workspace. 
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
