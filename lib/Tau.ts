import { createAgentSession, ModelRuntime, SessionManager, AgentSession } from "@earendil-works/pi-coding-agent";

export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export type SessionOptions = {
  thinkingLevel?: ThinkingLevel;
  sessionId?: string;
  cwd?: string;
  agentDir?: string;
  tools?: string[];
}

export class Tau {
  private model: any;
  private provider = 'none';
  private modelId = 'none';
  private session: AgentSession | null = null;
  private startTime = 0;
  private opt: SessionOptions | null = null;
  private subsessionMsgs: any[] = [];
  constructor() { }
  async sessionInit(provider: string, modelId: string, opt?: SessionOptions) {
    opt = opt ?? {};
    opt.sessionId = opt.sessionId ?? Date.now().toString();
    const modelRuntime = await ModelRuntime.create();
    this.startTime = Date.now();
    this.model = modelRuntime.getModel(provider, modelId);
    const { session } = await createAgentSession({
      model: this.model,
      thinkingLevel: opt?.thinkingLevel ?? 'low',
      modelRuntime: modelRuntime,
      sessionManager: SessionManager.inMemory(process.cwd(), { id: this.opt?.sessionId }),
      cwd: opt?.cwd ?? undefined,
      agentDir: opt?.agentDir ?? './agent/',
      tools: opt?.tools ?? undefined,
    });
    this.session = session;
    // Track opts for later readout
    this.opt = opt ?? null;
    this.modelId = modelId;
    this.provider = provider;
  }
  sessionEnd() {
    if (!this.session) throw 'Error: no session';
    this.session.dispose();
  }
  sessionInfo() {
    return {
      modelId: this.modelId,
      provider: this.provider,
      model: this.model,
      opt: this.opt,
      uptime: Date.now() - this.startTime,
      subsessionMsgs: this.subsessionMsgs,
      session: this.session,
      tools: this.session?.agent.state.tools,
    };
  }
  isReady(): boolean {
    return (this.session !== null);
  }
  async sendPrompt(prompt: string): Promise<string> {
    if (!this.session) throw 'Error: no session';
    await this.session.prompt(prompt);
    let res = '';
    this.session.state.messages.forEach((msg) => {
      this.subsessionMsgs.push(msg);
      if (msg.role === 'assistant') {
        msg.content.forEach((c) => {
          // Overwrite, dont append!
          if (c.type === 'text') res = c.text;
        })
      }
    });
    return res;
  }
  enableStreaming() {
    if (!this.session) throw 'Error: no session';
    let lastHeader = ''; // think | text 
    const header = (str: string) => {
      console.log('\n===', str.toUpperCase(), '===');
      lastHeader = str;
    };
    this.session.subscribe((event) => {
      switch (event.type) {
        // Streaming text from assistant
        case "message_update":
          // Always show header for thinking and text out
          const modeHeader = (outMode: 'text' | 'thinking') => {
            if (lastHeader !== outMode) header(outMode);
          }
          if (event.assistantMessageEvent.type === "text_delta") {
            modeHeader('text');
            process.stdout.write(event.assistantMessageEvent.delta);
          }
          if (event.assistantMessageEvent.type === "thinking_delta") {
            // Thinking output (if thinking enabled)
            modeHeader('thinking');
            process.stdout.write(event.assistantMessageEvent.delta);
          }
          break;

        // Tool execution
        case "tool_execution_start":
          header(`Tool: ${event.toolName}`)
          console.log(JSON.stringify(event.args, null, 2));
          break;
        case "tool_execution_update":
          // Streaming tool output
          for (let c of event.partialResult.content) {
            console.log(c.text);
          }
          break;
        case "tool_execution_end":
          if (event.isError) {
            header(`ERROR: ${event.toolName}`);
            for (const c of event.result.content ?? []) {
              if (c.type === 'text') console.log(c.text);   // was console.error                                                                                                                                                       
            }
          } else {
            header(`Result: ${event.toolName} success`);
          }
          break;

        // Message lifecycle
        case "message_start":
          // New message starting
          break;
        case "message_end":
          // Message complete
          break;

        // Agent lifecycle
        case "agent_start":
          // Agent started processing prompt
          break;
        case "agent_end":
          // Agent finished (event.messages contains new messages)
          break;

        // Turn lifecycle (one LLM response + tool calls)
        case "turn_start":
          header('TURN START');
          break;
        case "turn_end":
          header('TURN END');
          // event.message: assistant response
          // event.toolResults: tool results from this turn
          break;

        // Session events (queue, compaction, retry)
        case "queue_update":
          header('STEER');
          console.log(event.steering, event.followUp);
          break;
        case "compaction_start":
        case "compaction_end":
        case "auto_retry_start":
        case "auto_retry_end":
        case "summarization_retry_scheduled":
        case "summarization_retry_attempt_start":
        case "summarization_retry_finished":
          break;
      }
    });
  }
}
