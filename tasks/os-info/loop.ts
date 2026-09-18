import { TauLoop } from '../../tauloop.ts';

const provider = 'openrouter';
const modelId = 'openrouter/free';
const thinking = 'low';
const cwd = 'tasks/os-info/workspace';
const promptStart = `
Your goal is to fill out the file called file.json in the current directory.

The file must include the following info and use the following structure exactly:
{
  osName: string; // The name of the operating system you are running on
  distro: string; // The name of the os distro (if applicable, otherwise write 'na')
  ram: number: // The system RAM in kB
  cpu: string; // The system CPU name
  user: string; // The name of the user running you
  shell: string; // The name of the shell you're running on
  time: number; // The current unix time
}

Rules:
- You may not read or modify files outside of your current directory.
  - This includes ../verify.ts
- You must NOT modify ./verify.ts

The verify.ts script will verify the output for you. 

You DO NOT need to know what it does. Just run it to see the output.

You must run:
tsx verify

To verify your output.
`;

const promptContinue = `
Error: file.json does not match the expected structure.

The current output of verify.ts is:
{{RESULT}}
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
