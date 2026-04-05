export type ThemeName = "terminal" | "paper" | "signal";
export type ProviderId = "openai" | "groq" | "berget" | "ollama" | "custom";

export type ModalId =
  | "settings"
  | "share"
  | "prompts"
  | "functions"
  | "mcp"
  | "rag";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  meta?: string;
}

export interface SettingsState {
  provider: ProviderId;
  customBaseUrl: string;
  apiKey: string;
  model: string;
}

export interface SettingsRuntimeState {
  availableModels: string[];
  isRefreshingModels: boolean;
  modelRefreshError: string | null;
  lastModelRefreshAt: string | null;
  apiKeyDetection: string | null;
  modelRefreshNonce: number;
}

export interface PromptDraft {
  id: string;
  name: string;
  content: string;
}

export interface PromptState {
  customPrompts: PromptDraft[];
  selectedCustomPromptIds: string[];
  selectedDefaultPromptIds: string[];
}

export interface AppState {
  theme: ThemeName;
  activeModal: ModalId | null;
  composerText: string;
  isGenerating: boolean;
  errorMessage: string | null;
  modelContext: string;
  contextUsagePercent: number;
  tokenSpeed: string;
  messages: ChatMessage[];
  settings: SettingsState;
  settingsRuntime: SettingsRuntimeState;
  prompts: PromptState;
}

export type AppAction =
  | { type: "hydrate"; state: Partial<AppState> }
  | { type: "setComposerText"; value: string }
  | { type: "openModal"; modal: ModalId }
  | { type: "closeModal" }
  | { type: "cycleTheme" }
  | { type: "setTheme"; theme: ThemeName }
  | { type: "patchSettings"; value: Partial<SettingsState> }
  | { type: "setAvailableModels"; models: string[]; lastUpdatedAt: string | null }
  | { type: "setModelRefreshState"; isRefreshing: boolean; errorMessage: string | null }
  | { type: "setApiKeyDetection"; value: string | null }
  | { type: "requestModelRefresh" }
  | { type: "toggleDefaultPrompt"; id: string }
  | { type: "toggleCustomPrompt"; id: string }
  | { type: "saveCustomPrompt"; prompt: PromptDraft }
  | { type: "deleteCustomPrompt"; id: string }
  | { type: "beginAssistantTurn"; userMessage: ChatMessage }
  | { type: "finishAssistantTurn"; assistantMessage: ChatMessage }
  | { type: "failAssistantTurn"; errorMessage: string }
  | { type: "clearError" };
