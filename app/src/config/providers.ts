import type { ProviderId, SettingsState } from "../types/app";

export const providerOptions: Array<{ value: ProviderId; label: string }> = [
  { value: "openai", label: "OpenAI" },
  { value: "groq", label: "Groq" },
  { value: "ollama", label: "Ollama" },
  { value: "custom", label: "Custom" },
];

export function getBaseUrl(settings: SettingsState): string {
  if (settings.provider === "openai") return "https://api.openai.com/v1";
  if (settings.provider === "groq") return "https://api.groq.com/openai/v1";
  if (settings.provider === "ollama") return "http://localhost:11434/v1";
  return settings.customBaseUrl.trim();
}

export function resolveApiKey(settings: SettingsState, defaultApiKey?: string): string {
  return settings.apiKey.trim() || (defaultApiKey ?? "").trim();
}

export function resolveBaseUrl(settings: SettingsState, defaultBaseUrl?: string): string {
  if (settings.provider === "custom") {
    return settings.customBaseUrl.trim() || (defaultBaseUrl ?? "").trim();
  }

  return getBaseUrl(settings);
}

export function resolveModel(settings: SettingsState, defaultModel?: string): string {
  return settings.model.trim() || (defaultModel ?? "").trim() || "gpt-5";
}
