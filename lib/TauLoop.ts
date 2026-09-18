import { execSync } from 'node:child_process';
import { Tau, ThinkingLevel } from './Tau';


export type TauLoopOpt = {
  provider: string,
  modelId: string,
  thinking: ThinkingLevel
  cwd: string,
  promptStart: string,
  promptContinue: string,
};
export class TauLoop {
  private opt: TauLoopOpt;
  private tau = new Tau();
  constructor(opt: TauLoopOpt) {
    this.opt = opt;
  }
  private runWorkspace(): string {
    try {
      return execSync(`cd ${this.opt.cwd} && tsx verify.ts`).toString();
    }
    catch (err) {
      return String(err);
    }
  }
  private updatePrompt(): void {
    // Trim excess whitespace
    this.opt.promptStart = this.opt.promptStart.trim();
    this.opt.promptContinue = this.opt.promptContinue.trim();
    // Must return fns so prompts can update in loop
    const templates = {
      '{{RESULT}}': () => this.runWorkspace(),
      // '{{CONTINUE}}': () => this.opt.promptContinue,
      // '{{START}}': () => this.opt.promptStart,
    };
    for (let [key, fn] of Object.entries(templates)) {
      this.opt.promptContinue = this.opt.promptContinue.replaceAll(key, fn());
      this.opt.promptStart = this.opt.promptStart.replaceAll(key, fn());
    }
  }
  async run() {
    await this.tau.sessionInit(this.opt.provider, this.opt.modelId, {
      thinkingLevel: this.opt.thinking,
      cwd: this.opt.cwd,
    });
    this.tau.enableStreaming();

    let it = 0;
    while (this.runWorkspace().trim() !== 'pass') {
      console.log('it:', it);
      this.updatePrompt();
      const prompt = it == 0
        ? this.opt.promptStart + '\n---\n' + this.opt.promptContinue
        : this.opt.promptContinue;
      console.log('=== PROMPT ===');
      console.log(prompt);
      const res = await this.tau.sendPrompt(prompt);
      console.log(res);
      it++;
    }

    console.log('TEST PASSED!')

    this.tau.sessionEnd();
  }
};
