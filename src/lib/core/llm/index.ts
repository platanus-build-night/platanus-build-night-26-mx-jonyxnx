import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";

export interface LLMInput {
  system: string;
  user: string;
  maxTokens?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMChatInput {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
}

export interface LLMProvider {
  name: "anthropic" | "openai";
  model: string;
  complete(input: LLMInput): Promise<string>;
  streamChat(input: LLMChatInput): AsyncIterable<string>;
}

export type ProviderName = "anthropic" | "openai";

export function getLLM(override?: ProviderName): LLMProvider {
  const provider = (override || process.env.LLM_PROVIDER || "anthropic") as ProviderName;
  if (provider === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic. Set it in .env.local or pass --provider openai.",
      );
    }
    return new AnthropicProvider();
  }
  if (provider === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY is required when LLM_PROVIDER=openai. Set it in .env.local or pass --provider anthropic.",
      );
    }
    return new OpenAIProvider();
  }
  throw new Error(`Unknown LLM provider: ${provider}`);
}

export async function withRetry<T>(fn: () => Promise<T>, label: string, max = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const status =
        (err as { status?: number; statusCode?: number } | null)?.status ??
        (err as { status?: number; statusCode?: number } | null)?.statusCode;
      const retriable = status === 429 || (typeof status === "number" && status >= 500);
      if (!retriable || attempt === max) break;
      const wait = 500 * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error(`${label} failed: ${(lastErr as Error)?.message ?? lastErr}`);
}
