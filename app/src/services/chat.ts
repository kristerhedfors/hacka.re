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

async function readResponsePayload<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `The provider returned a non-JSON response (status ${response.status}).`,
    );
  }
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

  const payload = await readResponsePayload<OpenAIChatResponse>(response);

  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI request failed with status ${response.status}.`);
  }

  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("The model returned an empty response.");
  }

  return content;
}
