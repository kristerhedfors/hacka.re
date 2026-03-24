import { useEffect, useReducer } from "react";
import { appReducer, initialAppState } from "./state";
import { composeSystemPrompt } from "../features/prompts/library";
import { generateAssistantReply } from "../services/chat";
import { loadPersistedAppState, savePersistedAppState } from "../storage/persistence";
import type { ChatMessage } from "../types/app";

const defaultApiKey = import.meta.env.VITE_OPENAI_API_KEY;
const defaultBaseUrl = import.meta.env.VITE_OPENAI_API_BASE;
const defaultModel = import.meta.env.VITE_OPENAI_API_MODEL;

export function useAppController() {
  const [state, dispatch] = useReducer(appReducer, initialAppState);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
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
