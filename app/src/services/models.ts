import { getPreferredModelsForProvider } from "../config/models";
import { requiresApiKey, resolveApiKey, resolveBaseUrl } from "../config/providers";
import type { ProviderId, SettingsState } from "../types/app";

interface FetchAvailableModelsParams {
  settings: SettingsState;
  defaultApiKey?: string;
  defaultBaseUrl?: string;
}

interface ModelsApiResponse {
  data?: Array<{ id?: string | null }>;
}

async function readResponsePayload<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `The provider returned a non-JSON response while loading models (status ${response.status}).`,
    );
  }
}

export async function fetchAvailableModels({
  settings,
  defaultApiKey,
  defaultBaseUrl,
}: FetchAvailableModelsParams): Promise<string[]> {
  const baseUrl = resolveBaseUrl(settings, defaultBaseUrl);
  const apiKey = resolveApiKey(settings, defaultApiKey);

  if (!baseUrl) {
    throw new Error("No API base URL is configured.");
  }

  if (requiresApiKey(settings.provider) && !apiKey) {
    throw new Error("An API key is required before models can be loaded.");
  }

  const headers: HeadersInit = {};
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
    method: "GET",
    headers,
  });

  const payload = await readResponsePayload<ModelsApiResponse & {
    error?: { message?: string };
  }>(response);

  if (!response.ok) {
    throw new Error(
      payload.error?.message || `Model list request failed with status ${response.status}.`,
    );
  }

  const models = (payload.data ?? [])
    .map((entry) => entry.id?.trim() ?? "")
    .filter(Boolean);

  if (models.length === 0) {
    throw new Error("The provider returned an empty model list.");
  }

  return Array.from(new Set(models));
}

export function getFallbackModelList(provider: ProviderId, currentModel?: string): string[] {
  return getPreferredModelsForProvider(provider, currentModel);
}
