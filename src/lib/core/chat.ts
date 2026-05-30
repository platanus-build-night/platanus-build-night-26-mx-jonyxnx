import type { RepoContext } from "./context";
import type { GeneratorResult, Generator } from "./generators";
import { ALL_GENERATORS, SYSTEM_PROMPT } from "./generators";
import type { ChatMessage, LLMProvider } from "./llm";

export interface DocFile {
  id: string;
  title: string;
  filename: string;
  content: string;
  signals: string[];
}

export class ChatSession {
  readonly ctx: RepoContext;
  readonly llm: LLMProvider;
  private docs = new Map<string, DocFile>();
  private history: ChatMessage[] = [];

  constructor(ctx: RepoContext, llm: LLMProvider) {
    this.ctx = ctx;
    this.llm = llm;
  }

  ingestResults(results: GeneratorResult[]) {
    for (const r of results) {
      const gen = ALL_GENERATORS.find((g) => g.filename === r.filename);
      if (!gen) continue;
      this.docs.set(gen.id, {
        id: gen.id,
        title: gen.title,
        filename: r.filename,
        content: r.content,
        signals: r.signals,
      });
    }
  }

  listDocs(): DocFile[] {
    return [...this.docs.values()];
  }

  getDoc(idOrFilename: string): DocFile | undefined {
    const lookup = idOrFilename.replace(/\.md$/, "");
    for (const doc of this.docs.values()) {
      if (doc.id === lookup || doc.filename === idOrFilename) return doc;
    }
    return undefined;
  }

  findGenerator(idOrFilename: string): Generator | undefined {
    const lookup = idOrFilename.replace(/\.md$/, "");
    return ALL_GENERATORS.find((g) => g.id === lookup || g.filename === idOrFilename);
  }

  async regenerate(id: string, extraInstruction?: string): Promise<DocFile> {
    const gen = this.findGenerator(id);
    if (!gen) throw new Error(`Unknown section: ${id}`);
    const result = await gen.run(this.ctx, this.wrapLLM(extraInstruction));
    const doc: DocFile = {
      id: gen.id,
      title: gen.title,
      filename: result.filename,
      content: result.content,
      signals: result.signals,
    };
    this.docs.set(gen.id, doc);
    return doc;
  }

  private wrapLLM(extraInstruction?: string): LLMProvider {
    if (!extraInstruction) return this.llm;
    const base = this.llm;
    return {
      name: base.name,
      model: base.model,
      complete: (input) =>
        base.complete({
          ...input,
          user: input.user + `\n\nAdditional instruction from the user: ${extraInstruction}`,
        }),
      streamChat: (input) => base.streamChat(input),
    };
  }

  async edit(id: string, instruction: string): Promise<DocFile> {
    const doc = this.getDoc(id);
    if (!doc) throw new Error(`No doc named ${id}`);
    const system = SYSTEM_PROMPT;
    const user = `Rewrite this markdown doc according to the user's instruction. Keep the same structure and grounding rules. Output ONLY the new markdown — no preamble.

Current doc (\`${doc.filename}\`):
\`\`\`markdown
${doc.content}
\`\`\`

User instruction: ${instruction}`;
    const content = await this.llm.complete({ system, user, maxTokens: 3000 });
    const updated: DocFile = { ...doc, content };
    this.docs.set(doc.id, updated);
    return updated;
  }

  buildChatSystem(): string {
    const summary = [...this.docs.values()]
      .map((d) => `### ${d.filename} (${d.title})\n${d.content}`)
      .join("\n\n---\n\n");
    return `You are an internal repo assistant for the GitHub repository \`${this.ctx.owner}/${this.ctx.repo}\` at ref \`${this.ctx.ref}\`.

Use the generated docs as working memory for a company developer or coding agent. Answer with practical engineering guidance: where to inspect, what files likely matter, what commands to run, and what risks to watch for. Quote file paths in backticks. If the docs do not support an answer, say what is unknown and what to inspect next. If asked to change a doc, explain that the user can run \`/regen <section>\` or \`/edit <section> <instruction>\` to modify it.

Available sections: ${[...this.docs.values()].map((d) => d.id).join(", ")}

Current docs:

${summary}`;
  }

  pushUser(content: string) {
    this.history.push({ role: "user", content });
  }

  pushAssistant(content: string) {
    this.history.push({ role: "assistant", content });
  }

  getHistory(): ChatMessage[] {
    return this.history;
  }

  resetHistory() {
    this.history = [];
  }

  async *stream(userMessage: string): AsyncIterable<string> {
    this.pushUser(userMessage);
    const system = this.buildChatSystem();
    let full = "";
    for await (const chunk of this.llm.streamChat({
      system,
      messages: this.history,
      maxTokens: 2000,
    })) {
      full += chunk;
      yield chunk;
    }
    this.pushAssistant(full);
  }
}
