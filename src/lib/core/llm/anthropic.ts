import Anthropic from "@anthropic-ai/sdk";
import type { LLMChatInput, LLMInput, LLMProvider } from "./index";
import { withRetry } from "./index";

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic" as const;
  readonly model: string;
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.model = process.env.ANTHROPIC_MODEL || "claude-opus-4-7";
  }

  async complete(input: LLMInput): Promise<string> {
    const res = await withRetry(
      () =>
        this.client.messages.create({
          model: this.model,
          max_tokens: input.maxTokens ?? 4096,
          system: input.system,
          messages: [{ role: "user", content: input.user }],
        }),
      `Anthropic(${this.model})`,
    );
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return text;
  }

  async *streamChat(input: LLMChatInput): AsyncIterable<string> {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: input.maxTokens ?? 4096,
      system: input.system,
      messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }
}
