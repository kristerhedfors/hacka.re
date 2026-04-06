export type ThemeName = "terminal" | "paper" | "signal";
export type ProviderId = "openai" | "groq" | "berget" | "ollama" | "custom";
export type McpServerId = "huggingface";
export type HfCapabilityCheckId =
  | "oauth-pkce"
  | "router-cors"
  | "router-retries"
  | "docker-space-cors"
  | "code-execution"
  | "hub-crud"
  | "gradio-client"
  | "mcp-browser-transport"
  | "dynamic-spaces"
  | "file-mounting";
export type HfCapabilityStatus = "planned" | "validating" | "validated" | "blocked";

export type ModalId =
  | "settings"
  | "share"
  | "prompts"
  | "functions"
  | "mcp"
  | "hfLab"
  | "rag";

export type ChatRole = "system" | "user" | "assistant";

export interface LegacyPromptRecord {
  id: string;
  title: string;
  prompt: string;
}

export interface FunctionDraft {
  name: string;
  code: string;
}

export interface LegacySharePassthroughState {
  welcomeMessage: string;
  rawPayload: Record<string, unknown>;
}

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
  systemPrompt: string;
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

export interface McpServerState {
  enabled: boolean;
  promptEnabled: boolean;
  accessToken: string;
}

export interface McpState {
  servers: Record<McpServerId, McpServerState>;
}

export interface HfLabState {
  hfToken: string;
  authStrategy: "oauth-pkce" | "user-token";
  inferenceModel: string;
  inferenceProviderRoute: string;
  executionBackend: "docker-space" | "gradio-space" | "e2b";
  executionSpaceId: string;
  gradioSpaceId: string;
  mountedRepoId: string;
  mountedPath: string;
  mountStrategy: "hub-repo" | "upload" | "session-files";
  scopeMode: "user-oauth" | "space-owned" | "ephemeral";
  mcpTransport: "browser-direct" | "space-proxy" | "client-loop";
  notes: string;
  checks: Record<HfCapabilityCheckId, HfCapabilityStatus>;
}

export interface FunctionState {
  userFunctions: Record<string, FunctionDraft>;
  functionCollections: Record<string, string>;
  selectedDefaultFunctionIds: string[];
  selectedDefaultFunctionCollectionIds: string[];
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
  functions: FunctionState;
  mcp: McpState;
  hfLab: HfLabState;
  legacyShare: LegacySharePassthroughState;
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
  | {
      type: "saveFunction";
      functionDraft: FunctionDraft;
      previousName?: string;
      collectionName?: string;
    }
  | { type: "deleteFunction"; name: string }
  | { type: "setSelectedDefaultFunctionIds"; ids: string[] }
  | { type: "setSelectedDefaultFunctionCollectionIds"; ids: string[] }
  | { type: "patchMcpServer"; serverId: McpServerId; value: Partial<McpServerState> }
  | { type: "patchHfLab"; value: Partial<Omit<HfLabState, "checks">> }
  | { type: "setHfCapabilityStatus"; checkId: HfCapabilityCheckId; status: HfCapabilityStatus }
  | { type: "setLegacySharePassthrough"; value: LegacySharePassthroughState }
  | { type: "beginAssistantTurn"; userMessage: ChatMessage }
  | { type: "finishAssistantTurn"; assistantMessage: ChatMessage }
  | { type: "failAssistantTurn"; errorMessage: string }
  | { type: "clearError" };
