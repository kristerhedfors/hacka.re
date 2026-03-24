export const modelOptions = [
  "gpt-5",
  "gpt-5-mini",
  "gpt-4o",
  "o4-mini",
  "llama-3.3-70b-versatile",
  "qwen2.5-coder",
] as const;

const knownContexts: Record<string, string> = {
  "gpt-5": "400k context",
  "gpt-5-mini": "400k context",
  "gpt-4o": "128k context",
  "o4-mini": "400k context",
  "llama-3.3-70b-versatile": "128k context",
  "qwen2.5-coder": "128k context",
};

export function getModelContextLabel(model: string): string {
  return knownContexts[model] ?? "context unknown";
}
