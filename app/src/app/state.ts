import type { AppAction, AppState } from "../types/app";
import { getModelContextLabel } from "../config/models";
import { createEmptyPromptState, normalizePromptState } from "../features/prompts/library";

const initialMessages = [
  {
    id: "system-1",
    role: "system" as const,
    meta: "migration status",
    content:
      "Core shell port in progress. Legacy hacka.re remains available under /legacy while the TypeScript rewrite rebuilds parity feature by feature.",
  },
  {
    id: "assistant-1",
    role: "assistant" as const,
    meta: "next scaffold",
    content:
      "This shell now owns the future header, chat surface, modal slots, and theme system. Settings, sharing, prompts, functions, MCP, and RAG will be ported into these surfaces next.",
  },
];

export const initialAppState: AppState = {
  theme: "terminal",
  activeModal: null,
  composerText: "",
  isGenerating: false,
  errorMessage: null,
  modelContext: "400k context",
  contextUsagePercent: 8,
  tokenSpeed: "0 t/s",
  messages: initialMessages,
  settings: {
    provider: "openai",
    customBaseUrl: "",
    apiKey: "",
    model: "gpt-5",
  },
  settingsRuntime: {
    availableModels: ["gpt-5", "gpt-5-nano", "gpt-5-mini", "gpt-4o", "o4-mini"],
    isRefreshingModels: false,
    modelRefreshError: null,
    lastModelRefreshAt: null,
    apiKeyDetection: null,
    modelRefreshNonce: 0,
  },
  prompts: createEmptyPromptState(),
};

function cycleTheme(theme: AppState["theme"]): AppState["theme"] {
  if (theme === "terminal") return "paper";
  if (theme === "paper") return "signal";
  return "terminal";
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        ...action.state,
        settings: {
          ...state.settings,
          ...action.state.settings,
        },
        settingsRuntime: {
          ...state.settingsRuntime,
          ...action.state.settingsRuntime,
        },
        prompts: normalizePromptState({
          ...state.prompts,
          ...action.state.prompts,
          customPrompts: action.state.prompts?.customPrompts ?? state.prompts.customPrompts,
          selectedCustomPromptIds:
            action.state.prompts?.selectedCustomPromptIds ?? state.prompts.selectedCustomPromptIds,
          selectedDefaultPromptIds:
            action.state.prompts?.selectedDefaultPromptIds ??
            state.prompts.selectedDefaultPromptIds,
        }),
      };
    case "setComposerText":
      return {
        ...state,
        composerText: action.value,
      };
    case "openModal":
      return {
        ...state,
        activeModal: action.modal,
      };
    case "closeModal":
      return {
        ...state,
        activeModal: null,
      };
    case "cycleTheme":
      return {
        ...state,
        theme: cycleTheme(state.theme),
      };
    case "setTheme":
      return {
        ...state,
        theme: action.theme,
      };
    case "patchSettings": {
      const nextSettings = {
        ...state.settings,
        ...action.value,
      };

      return {
        ...state,
        settings: nextSettings,
        modelContext: getModelContextLabel(nextSettings.model),
      };
    }
    case "setAvailableModels":
      return {
        ...state,
        settingsRuntime: {
          ...state.settingsRuntime,
          availableModels: action.models,
          lastModelRefreshAt: action.lastUpdatedAt,
        },
      };
    case "setModelRefreshState":
      return {
        ...state,
        settingsRuntime: {
          ...state.settingsRuntime,
          isRefreshingModels: action.isRefreshing,
          modelRefreshError: action.errorMessage,
        },
      };
    case "setApiKeyDetection":
      return {
        ...state,
        settingsRuntime: {
          ...state.settingsRuntime,
          apiKeyDetection: action.value,
        },
      };
    case "requestModelRefresh":
      return {
        ...state,
        settingsRuntime: {
          ...state.settingsRuntime,
          modelRefreshNonce: state.settingsRuntime.modelRefreshNonce + 1,
        },
      };
    case "toggleDefaultPrompt": {
      const selected = new Set(state.prompts.selectedDefaultPromptIds);
      if (selected.has(action.id)) {
        selected.delete(action.id);
      } else {
        selected.add(action.id);
      }

      return {
        ...state,
        prompts: normalizePromptState({
          ...state.prompts,
          selectedDefaultPromptIds: Array.from(selected),
        }),
      };
    }
    case "toggleCustomPrompt": {
      const selected = new Set(state.prompts.selectedCustomPromptIds);
      if (selected.has(action.id)) {
        selected.delete(action.id);
      } else {
        selected.add(action.id);
      }

      return {
        ...state,
        prompts: normalizePromptState({
          ...state.prompts,
          selectedCustomPromptIds: Array.from(selected),
        }),
      };
    }
    case "saveCustomPrompt": {
      const existingIndex = state.prompts.customPrompts.findIndex(
        (prompt) => prompt.id === action.prompt.id,
      );
      const customPrompts = [...state.prompts.customPrompts];

      if (existingIndex >= 0) {
        customPrompts[existingIndex] = action.prompt;
      } else {
        customPrompts.push(action.prompt);
      }

      return {
        ...state,
        prompts: normalizePromptState({
          customPrompts,
          selectedCustomPromptIds: existingIndex >= 0
            ? state.prompts.selectedCustomPromptIds
            : [...state.prompts.selectedCustomPromptIds, action.prompt.id],
          selectedDefaultPromptIds: state.prompts.selectedDefaultPromptIds,
        }),
      };
    }
    case "deleteCustomPrompt":
      return {
        ...state,
        prompts: normalizePromptState({
          customPrompts: state.prompts.customPrompts.filter((prompt) => prompt.id !== action.id),
          selectedCustomPromptIds: state.prompts.selectedCustomPromptIds.filter(
            (id) => id !== action.id,
          ),
          selectedDefaultPromptIds: state.prompts.selectedDefaultPromptIds,
        }),
      };
    case "beginAssistantTurn":
      return {
        ...state,
        composerText: "",
        isGenerating: true,
        errorMessage: null,
        tokenSpeed: "24 t/s",
        messages: [...state.messages, action.userMessage],
      };
    case "finishAssistantTurn":
      return {
        ...state,
        isGenerating: false,
        errorMessage: null,
        tokenSpeed: "0 t/s",
        messages: [...state.messages, action.assistantMessage],
        contextUsagePercent: Math.min(state.contextUsagePercent + 4, 92),
      };
    case "failAssistantTurn":
      return {
        ...state,
        isGenerating: false,
        errorMessage: action.errorMessage,
        tokenSpeed: "0 t/s",
      };
    case "clearError":
      return {
        ...state,
        errorMessage: null,
      };
    default:
      return state;
  }
}
