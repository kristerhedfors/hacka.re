import { resolveApiKey, resolveBaseUrl, resolveModel } from "../config/providers";
import type { ChatMessage, SettingsState } from "../types/app";

interface GenerateAssistantReplyParams {
  settings: SettingsState;
  messages: ChatMessage[];
  systemPrompt?: string;
  defaultApiKey?: string;
  defaultBaseUrl?: string;
  defaultModel?: string;
}

interface OpenAIChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

export async function generateAssistantReply({
  settings,
  messages,
  systemPrompt,
  defaultApiKey,
  defaultBaseUrl,
  defaultModel,
}: GenerateAssistantReplyParams): Promise<string> {
  const apiKey = resolveApiKey(settings, defaultApiKey);
  const baseUrl = resolveBaseUrl(settings, defaultBaseUrl);
  const model = resolveModel(settings, defaultModel);

  if (!apiKey) {
    throw new Error("No OpenAI API key is configured.");
  }

  if (!baseUrl) {
    throw new Error("No API base URL is configured.");
  }

  const requestMessages = systemPrompt?.trim()
    ? [
        {
          role: "system",
          content: systemPrompt.trim(),
        },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ]
    : messages.map((message) => ({
        role: message.role,
        content: message.content,
      }));

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: requestMessages,
    }),
  });

  const payload = (await response.json()) as OpenAIChatResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI request failed with status ${response.status}.`);
  }

  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("The model returned an empty response.");
  }

  return content;
}
