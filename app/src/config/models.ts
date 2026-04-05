import type { ProviderId } from "../types/app";
import { getDefaultModelForProvider, getFallbackModelsForProvider } from "./providers";

export const modelOptions = [
  "gpt-5",
  "gpt-5-nano",
  "gpt-5-mini",
  "gpt-4o",
  "o4-mini",
  "moonshotai/kimi-k2-instruct",
  "llama-3.3-70b-versatile",
  "qwen2.5-coder",
  "mistralai/Magistral-Small-2506",
  "mistralai/Devstral-Small-2505",
  "llama3.2",
] as const;

const knownContexts: Record<string, string> = {
  "gpt-5": "400k context",
  "gpt-5-nano": "400k context",
  "gpt-5-mini": "400k context",
  "gpt-4o": "128k context",
  "o4-mini": "400k context",
  "moonshotai/kimi-k2-instruct": "128k context",
  "llama-3.3-70b-versatile": "128k context",
  "qwen2.5-coder": "128k context",
  "mistralai/Magistral-Small-2506": "128k context",
  "mistralai/Devstral-Small-2505": "128k context",
  "llama3.2": "128k context",
};

export function getModelContextLabel(model: string): string {
  return knownContexts[model] ?? "context unknown";
}

export function getPreferredModelsForProvider(provider: ProviderId, currentModel?: string): string[] {
  const preferred = [
    currentModel?.trim() ?? "",
    getDefaultModelForProvider(provider),
    ...getFallbackModelsForProvider(provider),
    ...modelOptions,
  ].filter(Boolean);

  return Array.from(new Set(preferred));
}
