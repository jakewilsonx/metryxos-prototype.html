import Anthropic from "@anthropic-ai/sdk";

// Server-only — never import this from a client component. The API key
// stays in the environment and is never sent to the browser.
export function anthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  return new Anthropic({ apiKey });
}

export const CLAUDE_MODEL = "claude-sonnet-4-6";
