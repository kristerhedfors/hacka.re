import { getModelContextLabel } from "../config/models";
import type { AppState, ProviderId, SettingsState, ThemeName } from "../types/app";
import { createEmptyPromptState, isPromptState, normalizePromptState } from "../features/prompts/library";

const STORAGE_KEY = "hackare_next_shell_v1";

interface PersistedAppStateV1 {
  version: 1;
  theme: ThemeName;
  settings: SettingsState;
}

interface PersistedAppStateV2 {
  version: 2;
  theme: ThemeName;
  settings: SettingsState;
  prompts: AppState["prompts"];
}

function isThemeName(value: unknown): value is ThemeName {
  return value === "terminal" || value === "paper" || value === "signal";
}

function isProviderId(value: unknown): value is ProviderId {
  return value === "openai" || value === "groq" || value === "ollama" || value === "custom";
}

function isSettingsState(value: unknown): value is SettingsState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const settings = value as Record<string, unknown>;

  return (
    isProviderId(settings.provider) &&
    typeof settings.customBaseUrl === "string" &&
    typeof settings.apiKey === "string" &&
    typeof settings.model === "string"
  );
}

export function loadPersistedAppState(): Partial<AppState> | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (!isThemeName(parsed.theme) || !isSettingsState(parsed.settings)) {
      return null;
    }

    const prompts =
      parsed.version === 2 && isPromptState(parsed.prompts)
        ? normalizePromptState(parsed.prompts)
        : createEmptyPromptState();

    if (parsed.version !== 1 && parsed.version !== 2) {
      return null;
    }

    return {
      theme: parsed.theme,
      settings: parsed.settings,
      modelContext: getModelContextLabel(parsed.settings.model),
      prompts,
    };
  } catch {
    return null;
  }
}

export function savePersistedAppState(state: AppState): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload: PersistedAppStateV2 = {
    version: 2,
    theme: state.theme,
    settings: state.settings,
    prompts: normalizePromptState(state.prompts),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
