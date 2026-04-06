import { getModelContextLabel } from "../config/models";
import type {
  AppState,
  FunctionState,
  HfLabState,
  LegacySharePassthroughState,
  McpState,
  ProviderId,
  SettingsRuntimeState,
  SettingsState,
  ThemeName,
} from "../types/app";
import { createEmptyPromptState, isPromptState, normalizePromptState } from "../features/prompts/library";
import { createEmptyMcpState, normalizeMcpState } from "../features/mcp/catalog";
import { createEmptyHfLabState, normalizeHfLabState } from "../features/hf-lab/catalog";
import {
  createEmptyFunctionState,
  isFunctionState,
  normalizeFunctionState,
} from "../features/functions/library";

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

interface PersistedAppStateV4 {
  version: 4;
  theme: ThemeName;
  settings: SettingsState;
  settingsRuntime: Pick<SettingsRuntimeState, "availableModels" | "lastModelRefreshAt">;
  prompts: AppState["prompts"];
  mcp: McpState;
}

interface PersistedAppStateV5 {
  version: 5;
  theme: ThemeName;
  settings: SettingsState;
  settingsRuntime: Pick<SettingsRuntimeState, "availableModels" | "lastModelRefreshAt">;
  prompts: AppState["prompts"];
  functions: FunctionState;
  mcp: McpState;
  legacyShare: LegacySharePassthroughState;
}

interface PersistedAppStateV6 {
  version: 6;
  theme: ThemeName;
  settings: SettingsState;
  settingsRuntime: Pick<SettingsRuntimeState, "availableModels" | "lastModelRefreshAt">;
  prompts: AppState["prompts"];
  functions: FunctionState;
  mcp: McpState;
  hfLab: HfLabState;
  legacyShare: LegacySharePassthroughState;
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
    typeof settings.model === "string" &&
    (typeof settings.systemPrompt === "string" || typeof settings.systemPrompt === "undefined")
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

function isMcpState(value: unknown): value is McpState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const servers = candidate.servers as Record<string, unknown> | undefined;
  const huggingface = servers?.huggingface as Record<string, unknown> | undefined;

  return !!huggingface &&
    typeof huggingface.enabled === "boolean" &&
    typeof huggingface.promptEnabled === "boolean" &&
    typeof huggingface.accessToken === "string";
}

function isLegacySharePassthroughState(value: unknown): value is LegacySharePassthroughState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.welcomeMessage === "string" &&
    !!candidate.rawPayload &&
    typeof candidate.rawPayload === "object" &&
    !Array.isArray(candidate.rawPayload);
}

function isHfLabState(value: unknown): value is HfLabState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.hfToken === "string" &&
    (candidate.authStrategy === "oauth-pkce" || candidate.authStrategy === "user-token") &&
    typeof candidate.inferenceModel === "string" &&
    typeof candidate.inferenceProviderRoute === "string" &&
    (candidate.executionBackend === "docker-space" ||
      candidate.executionBackend === "gradio-space" ||
      candidate.executionBackend === "e2b") &&
    typeof candidate.executionSpaceId === "string" &&
    typeof candidate.gradioSpaceId === "string" &&
    typeof candidate.mountedRepoId === "string" &&
    typeof candidate.mountedPath === "string" &&
    (candidate.mountStrategy === "hub-repo" ||
      candidate.mountStrategy === "upload" ||
      candidate.mountStrategy === "session-files") &&
    (candidate.scopeMode === "user-oauth" ||
      candidate.scopeMode === "space-owned" ||
      candidate.scopeMode === "ephemeral") &&
    (candidate.mcpTransport === "browser-direct" ||
      candidate.mcpTransport === "space-proxy" ||
      candidate.mcpTransport === "client-loop") &&
    typeof candidate.notes === "string" &&
    !!candidate.checks &&
    typeof candidate.checks === "object"
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
      (parsed.version === 2 ||
        parsed.version === 3 ||
        parsed.version === 4 ||
        parsed.version === 5 ||
        parsed.version === 6) &&
      isPromptState(parsed.prompts)
        ? normalizePromptState(parsed.prompts)
        : createEmptyPromptState();

    if (
      parsed.version !== 1 &&
      parsed.version !== 2 &&
      parsed.version !== 3 &&
      parsed.version !== 4 &&
      parsed.version !== 5 &&
      parsed.version !== 6
    ) {
      return null;
    }

    const settingsRuntime =
      (parsed.version === 3 || parsed.version === 4 || parsed.version === 5 || parsed.version === 6) &&
      isSettingsRuntimeState(parsed.settingsRuntime)
        ? {
            availableModels: parsed.settingsRuntime.availableModels,
            isRefreshingModels: false,
            modelRefreshError: null,
            lastModelRefreshAt: parsed.settingsRuntime.lastModelRefreshAt,
            apiKeyDetection: null,
            modelRefreshNonce: 0,
          }
        : undefined;

    const mcp =
      (parsed.version === 4 || parsed.version === 5 || parsed.version === 6) && isMcpState(parsed.mcp)
        ? normalizeMcpState(parsed.mcp)
        : createEmptyMcpState();

    const functions =
      (parsed.version === 5 || parsed.version === 6) && isFunctionState(parsed.functions)
        ? normalizeFunctionState(parsed.functions)
        : createEmptyFunctionState();

    const hfLab =
      parsed.version === 6 && isHfLabState(parsed.hfLab)
        ? normalizeHfLabState(parsed.hfLab)
        : createEmptyHfLabState();

    const legacyShare =
      (parsed.version === 5 || parsed.version === 6) && isLegacySharePassthroughState(parsed.legacyShare)
        ? parsed.legacyShare
        : {
            welcomeMessage: "",
            rawPayload: {},
          };

    return {
      theme: parsed.theme,
      settings: {
        ...parsed.settings,
        systemPrompt: parsed.settings.systemPrompt ?? "",
      },
      settingsRuntime,
      modelContext: getModelContextLabel(parsed.settings.model),
      prompts,
      functions,
      mcp,
      hfLab,
      legacyShare,
    };
  } catch {
    return null;
  }
}

export function savePersistedAppState(state: AppState): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload: PersistedAppStateV6 = {
    version: 6,
    theme: state.theme,
    settings: state.settings,
    settingsRuntime: {
      availableModels: state.settingsRuntime.availableModels,
      lastModelRefreshAt: state.settingsRuntime.lastModelRefreshAt,
    },
    prompts: normalizePromptState(state.prompts),
    functions: normalizeFunctionState(state.functions),
    mcp: normalizeMcpState(state.mcp),
    hfLab: normalizeHfLabState(state.hfLab),
    legacyShare: state.legacyShare,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
