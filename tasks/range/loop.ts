import { Tau } from '../../lib/Tau';

const provider = 'openrouter';
const model = 'openrouter/free';
const thinking = 'low'; // 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
const prompt = `
Respond only with an integer 0->100. Nothing else at all.

Question:
${process.argv[2] ?? 'Is Rome the capital of Italy?'}
`;

const tau = new Tau();
await tau.sessionInit(provider, model, {
  thinkingLevel: thinking,
  cwd: '/tmp/isntreal'
});

tau.enableStreaming();

let res = (await tau.sendPrompt(prompt)).toLowerCase();
while (!Number(res) || Number(res) > 100 || Number(res) < 0 || Number(res) % 1 !== 0) {
  res = (await tau.sendPrompt('You must only respond with an integer 0->100!')).toLowerCase();
}

console.log('======= final:')
console.log(res);

tau.sessionEnd();
