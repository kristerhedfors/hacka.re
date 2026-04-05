import { useEffect, useReducer, useRef } from "react";
import { appReducer, initialAppState } from "./state";
import { composeSystemPrompt } from "../features/prompts/library";
import { generateAssistantReply } from "../services/chat";
import { getFallbackModelList, fetchAvailableModels } from "../services/models";
import {
  detectProviderFromApiKey,
  getDefaultModelForProvider,
  resolveApiKey,
  resolveBaseUrl,
  requiresApiKey,
} from "../config/providers";
import { loadPersistedAppState, savePersistedAppState } from "../storage/persistence";
import type { ChatMessage } from "../types/app";

const defaultApiKey = import.meta.env.VITE_OPENAI_API_KEY;
const defaultBaseUrl = import.meta.env.VITE_OPENAI_API_BASE;
const defaultModel = import.meta.env.VITE_OPENAI_API_MODEL;

const legacyThemeClasses = ["theme-modern", "theme-sunset", "theme-ocean", "theme-forest", "theme-midnight"];

function applyLegacyTheme(theme: "terminal" | "paper" | "signal") {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.remove(...legacyThemeClasses, "dark-mode");

  if (theme === "terminal") {
    root.classList.add("theme-modern", "dark-mode");
    return;
  }

  if (theme === "paper") {
    root.classList.add("theme-modern");
    return;
  }

  root.classList.add("theme-midnight");
}

export function useAppController() {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const latestRefreshRequestRef = useRef(0);

  useEffect(() => {
    applyLegacyTheme(state.theme);
  }, [state.theme]);

  useEffect(() => {
    const persisted = loadPersistedAppState();
    if (persisted) {
      dispatch({ type: "hydrate", state: persisted });
    }
  }, []);

  useEffect(() => {
    savePersistedAppState(state);
  }, [state]);

  useEffect(() => {
    const detection = detectProviderFromApiKey(state.settings.apiKey);
    const detectionLabel =
      detection === null
        ? null
        : `${detection.providerLabel} API key detected and auto-selected${
            detection.defaultModel ? ` (${detection.defaultModel})` : ""
          }`;

    if (state.settingsRuntime.apiKeyDetection !== detectionLabel) {
      dispatch({ type: "setApiKeyDetection", value: detectionLabel });
    }

    if (
      detection &&
      (state.settings.provider !== detection.provider ||
        state.settings.model !== (detection.defaultModel ?? state.settings.model))
    ) {
      dispatch({
        type: "patchSettings",
        value: {
          provider: detection.provider,
          model: detection.defaultModel ?? getDefaultModelForProvider(detection.provider),
        },
      });
    }
  }, [
    state.settings.apiKey,
    state.settings.model,
    state.settings.provider,
    state.settingsRuntime.apiKeyDetection,
  ]);

  useEffect(() => {
    const provider = state.settings.provider;
    const resolvedApiKey = resolveApiKey(state.settings, defaultApiKey);
    const resolvedBaseUrl = resolveBaseUrl(state.settings, defaultBaseUrl);
    const fallbackModels = getFallbackModelList(provider, state.settings.model);

    if (!resolvedBaseUrl || (requiresApiKey(provider) && !resolvedApiKey)) {
      if (state.settingsRuntime.availableModels.join("|") !== fallbackModels.join("|")) {
        dispatch({
          type: "setAvailableModels",
          models: fallbackModels,
          lastUpdatedAt: state.settingsRuntime.lastModelRefreshAt,
        });
      }

      if (state.settingsRuntime.modelRefreshError !== null) {
        dispatch({ type: "setModelRefreshState", isRefreshing: false, errorMessage: null });
      }
      return;
    }

    const refreshId = latestRefreshRequestRef.current + 1;
    latestRefreshRequestRef.current = refreshId;
    const timeoutId = window.setTimeout(async () => {
      dispatch({ type: "setModelRefreshState", isRefreshing: true, errorMessage: null });

      try {
        const models = await fetchAvailableModels({
          settings: state.settings,
          defaultApiKey,
          defaultBaseUrl,
        });

        if (latestRefreshRequestRef.current !== refreshId) {
          return;
        }

        const availableModels = Array.from(new Set([...models, ...fallbackModels]));
        const defaultModel = getDefaultModelForProvider(provider);
        const nextModel = availableModels.includes(state.settings.model)
          ? state.settings.model
          : availableModels.includes(defaultModel)
            ? defaultModel
            : availableModels[0];

        dispatch({
          type: "setAvailableModels",
          models: availableModels,
          lastUpdatedAt: new Date().toISOString(),
        });
        dispatch({ type: "setModelRefreshState", isRefreshing: false, errorMessage: null });

        if (nextModel && nextModel !== state.settings.model) {
          dispatch({ type: "patchSettings", value: { model: nextModel } });
        }
      } catch (error) {
        if (latestRefreshRequestRef.current !== refreshId) {
          return;
        }

        dispatch({
          type: "setAvailableModels",
          models: fallbackModels,
          lastUpdatedAt: state.settingsRuntime.lastModelRefreshAt,
        });
        dispatch({
          type: "setModelRefreshState",
          isRefreshing: false,
          errorMessage:
            error instanceof Error ? error.message : "Unable to refresh available models.",
        });

        const fallbackModel = fallbackModels.includes(state.settings.model)
          ? state.settings.model
          : fallbackModels[0];
        if (fallbackModel && fallbackModel !== state.settings.model) {
          dispatch({ type: "patchSettings", value: { model: fallbackModel } });
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    state.settings.apiKey,
    state.settings.customBaseUrl,
    state.settings.model,
    state.settings.provider,
    state.settingsRuntime.modelRefreshNonce,
  ]);

  async function handleSubmitMessage() {
    const trimmed = state.composerText.trim();

    if (!trimmed || state.isGenerating) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${state.messages.length + 1}`,
      role: "user",
      content: trimmed,
    };

    dispatch({ type: "beginAssistantTurn", userMessage });

    try {
      const assistantContent = await generateAssistantReply({
        settings: state.settings,
        messages: [...state.messages, userMessage],
        systemPrompt: composeSystemPrompt(state.prompts),
        defaultApiKey,
        defaultBaseUrl,
        defaultModel,
      });

      dispatch({
        type: "finishAssistantTurn",
        assistantMessage: {
          id: `assistant-${state.messages.length + 2}`,
          role: "assistant",
          content: assistantContent,
        },
      });
    } catch (error) {
      dispatch({
        type: "failAssistantTurn",
        errorMessage: error instanceof Error ? error.message : "Chat request failed.",
      });
    }
  }

  return {
    state,
    dispatch,
    handleSubmitMessage,
  };
}
