import fs from 'node:fs';

export const verify = () => {
  const target = 7;
  // Path relative to workspace
  // this is run from workspace
  const num = Number(fs.readFileSync('number.txt', 'utf-8')) ?? -1;
  if (num === target) {
    console.log('pass');
  } else {
    console.log('incorrect');
  }
};
