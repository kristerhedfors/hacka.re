import { getModelContextLabel } from "../config/models";
import type {
  AppState,
  ProviderId,
  SettingsRuntimeState,
  SettingsState,
  ThemeName,
} from "../types/app";
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

interface PersistedAppStateV3 {
  version: 3;
  theme: ThemeName;
  settings: SettingsState;
  settingsRuntime: Pick<SettingsRuntimeState, "availableModels" | "lastModelRefreshAt">;
  prompts: AppState["prompts"];
}

function isThemeName(value: unknown): value is ThemeName {
  return value === "terminal" || value === "paper" || value === "signal";
}

function isProviderId(value: unknown): value is ProviderId {
  return (
    value === "openai" ||
    value === "groq" ||
    value === "berget" ||
    value === "ollama" ||
    value === "custom"
  );
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

function isSettingsRuntimeState(value: unknown): value is PersistedAppStateV3["settingsRuntime"] {
  if (!value || typeof value !== "object") {
    return false;
  }

  const runtime = value as Record<string, unknown>;
  return (
    Array.isArray(runtime.availableModels) &&
    runtime.availableModels.every((model) => typeof model === "string") &&
    (typeof runtime.lastModelRefreshAt === "string" || runtime.lastModelRefreshAt === null)
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

    if (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3) {
      return null;
    }

    const settingsRuntime =
      parsed.version === 3 && isSettingsRuntimeState(parsed.settingsRuntime)
        ? {
            availableModels: parsed.settingsRuntime.availableModels,
            isRefreshingModels: false,
            modelRefreshError: null,
            lastModelRefreshAt: parsed.settingsRuntime.lastModelRefreshAt,
            apiKeyDetection: null,
            modelRefreshNonce: 0,
          }
        : undefined;

    return {
      theme: parsed.theme,
      settings: parsed.settings,
      settingsRuntime,
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

  const payload: PersistedAppStateV3 = {
    version: 3,
    theme: state.theme,
    settings: state.settings,
    settingsRuntime: {
      availableModels: state.settingsRuntime.availableModels,
      lastModelRefreshAt: state.settingsRuntime.lastModelRefreshAt,
    },
    prompts: normalizePromptState(state.prompts),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
