import { Tau } from '../../tau';

const provider = 'openrouter';
const model = 'openrouter/free';
const thinking = 'low'; // 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
const prompt = 'List the files in the root (/) dir.';

const tau = new Tau();
await tau.sessionInit(provider, model, {
  thinkingLevel: thinking,
  cwd: './example/'
});
tau.enableStreaming();

const res = await tau.sendPrompt(prompt);
console.log('======= final:')
console.log(res);

tau.sessionEnd();

