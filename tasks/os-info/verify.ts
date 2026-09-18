import fs from 'node:fs';
import { Object, String, Number, Schema } from '../../lib/Schema.ts';

// Schema for the expected file.json structure
const schema = Object({
  osName: String(),
  distro: String(),
  ram: Number(),
  cpu: String(),
  user: String(),
  shell: String(),
  time: Number(),
});

export const verify = (): void => {
  let file = '';
  try {
    // Relative to /workspace
    const fp = 'file.json';
    file = fs.readFileSync(fp, 'utf-8');
  } catch {
    console.log('Error: file not found');
    return;
  }
  try {
    const errors = Schema.listErrors(schema, file);
    if (errors.length > 0) {
      console.log(errors.join('\n'));
    } else {
      console.log('pass');
    }
  } catch {
    console.log('Error: invalid JSON');
  }
}
