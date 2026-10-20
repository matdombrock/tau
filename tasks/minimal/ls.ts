import { Tau } from '../../lib/Tau';

const provider = 'openrouter';
const model = 'openrouter/free';
const thinking = 'low'; // 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
const prompt = 'List the files in this directory.';

const tau = new Tau();
await tau.sessionInit(provider, model, {
  thinkingLevel: thinking,
  cwd: '.'
});
tau.enableStreaming();

const res = await tau.sendPrompt(prompt);
console.log('======= final:')
console.log(res);

const cost = tau.sessionCost();
console.log('cost:', cost);

tau.sessionEnd();

