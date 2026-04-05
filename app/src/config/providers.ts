import type { ProviderId, SettingsState } from "../types/app";

interface ProviderConfig {
  value: ProviderId;
  label: string;
  baseUrl: string | null;
  defaultModel: string | null;
  fallbackModels: string[];
  requiresApiKey: boolean;
  apiKeyPattern?: RegExp;
  detectionLabel?: string;
}

export const providerConfigs: Record<Exclude<ProviderId, "custom">, ProviderConfig> = {
  openai: {
    value: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5-nano",
    fallbackModels: ["gpt-5-nano", "gpt-5", "gpt-5-mini", "gpt-4o", "o4-mini"],
    requiresApiKey: true,
    apiKeyPattern: /^sk-(?:proj-)?[A-Za-z0-9\-_]{20,}$/,
    detectionLabel: "OpenAI",
  },
  groq: {
    value: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "moonshotai/kimi-k2-instruct",
    fallbackModels: [
      "moonshotai/kimi-k2-instruct",
      "llama-3.3-70b-versatile",
      "llama-3.1-70b-versatile",
      "mixtral-8x7b-32768",
    ],
    requiresApiKey: true,
    apiKeyPattern: /^gsk_[A-Za-z0-9]{32,}$/,
    detectionLabel: "GroqCloud",
  },
  berget: {
    value: "berget",
    label: "Berget",
    baseUrl: "https://api.berget.ai/v1",
    defaultModel: "mistralai/Magistral-Small-2506",
    fallbackModels: [
      "mistralai/Magistral-Small-2506",
      "mistralai/Devstral-Small-2505",
      "llama-3.3-70b",
      "claude-3-opus-20240229",
    ],
    requiresApiKey: true,
    apiKeyPattern: /^sk_ber_[A-Za-z0-9\-_]{30,}$/,
    detectionLabel: "Berget.AI",
  },
  ollama: {
    value: "ollama",
    label: "Ollama",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    fallbackModels: ["llama3.2", "llama3.1", "llama3", "mistral"],
    requiresApiKey: false,
  },
};

export const providerOptions: Array<{ value: ProviderId; label: string }> = [
  { value: providerConfigs.openai.value, label: providerConfigs.openai.label },
  { value: providerConfigs.groq.value, label: providerConfigs.groq.label },
  { value: providerConfigs.berget.value, label: providerConfigs.berget.label },
  { value: providerConfigs.ollama.value, label: providerConfigs.ollama.label },
  { value: "custom", label: "Custom" },
];

export function getProviderConfig(provider: ProviderId): ProviderConfig | null {
  if (provider === "custom") {
    return null;
  }

  return providerConfigs[provider];
}

export function getDefaultModelForProvider(provider: ProviderId): string {
  return getProviderConfig(provider)?.defaultModel ?? "gpt-5";
}

export function getFallbackModelsForProvider(provider: ProviderId): string[] {
  return [...(getProviderConfig(provider)?.fallbackModels ?? [])];
}

export function requiresApiKey(provider: ProviderId): boolean {
  return getProviderConfig(provider)?.requiresApiKey ?? true;
}

export function getBaseUrl(settings: SettingsState): string {
  const provider = getProviderConfig(settings.provider);
  if (provider?.baseUrl) return provider.baseUrl;
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

export function detectProviderFromApiKey(apiKey: string): {
  provider: ProviderId;
  providerLabel: string;
  defaultModel: string | null;
} | null {
  const trimmed = apiKey.trim();

  if (!trimmed) {
    return null;
  }

  for (const provider of Object.values(providerConfigs)) {
    if (provider.apiKeyPattern?.test(trimmed)) {
      return {
        provider: provider.value,
        providerLabel: provider.detectionLabel ?? provider.label,
        defaultModel: provider.defaultModel,
      };
    }
  }

  return null;
}
