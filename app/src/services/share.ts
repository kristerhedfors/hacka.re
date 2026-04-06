import type { AppState, LegacyPromptRecord, ProviderId } from "../types/app";
import { createPromptId } from "../features/prompts/library";

const SALT_LENGTH = 10;
const NONCE_LENGTH_STORED = 10;
const NONCE_LENGTH_EXPANDED = 24;
const KEY_LENGTH = 32;
const KEY_ITERATIONS = 8192;
const HASH_PREFIX = "#gpt=";

const KEY_MAP: Record<string, string> = {
  apiKey: "a",
  baseUrl: "b",
  systemPrompt: "s",
  messages: "m",
  functions: "f",
  enabledFunctions: "e",
  selectedPromptIds: "p",
  selectedDefaultPromptIds: "d",
  selectedDefaultFunctionIds: "F",
  selectedDefaultFunctionCollectionIds: "C",
  mcpConnections: "c",
  welcomeMessage: "w",
  theme: "t",
  prompts: "P",
  model: "M",
  provider: "v",
  role: "r",
  content: "n",
  title: "T",
  prompt: "q",
  selected: "S",
  id: "i",
  code: "o",
  enabled: "E",
  github: "g",
  gmail: "G",
  huggingface: "H",
  shodan: "h",
};

const REVERSE_KEY_MAP = Object.fromEntries(
  Object.entries(KEY_MAP).map(([verbose, compact]) => [compact, verbose]),
);

export interface LegacySharePayload {
  apiKey?: string;
  baseUrl?: string;
  systemPrompt?: string;
  messages?: Array<{ role: string; content: string }>;
  prompts?: LegacyPromptRecord[];
  selectedPromptIds?: string[];
  selectedDefaultPromptIds?: string[];
  functions?: Record<string, { code: string }>;
  functionCollections?: Record<string, string>;
  enabledFunctions?: string[];
  selectedDefaultFunctionIds?: string[];
  selectedDefaultFunctionCollectionIds?: string[];
  mcpConnections?: Record<string, unknown>;
  welcomeMessage?: string;
  theme?: string;
  model?: string;
  provider?: string;
  [key: string]: unknown;
}

function requireNacl() {
  if (!window.nacl?.util) {
    throw new Error("Legacy TweetNaCl runtime is not available.");
  }

  return window.nacl;
}

function encodeBase64UrlSafe(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function decodeBase64UrlSafe(value: string) {
  let normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  while (normalized.length % 4) {
    normalized += "=";
  }

  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function mapKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => mapKeys(entry));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      KEY_MAP[key] ?? key,
      mapKeys(entry),
    ]),
  );
}

function unmapKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => unmapKeys(entry));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      REVERSE_KEY_MAP[key] ?? key,
      unmapKeys(entry),
    ]),
  );
}

async function compressPayload(payload: LegacySharePayload) {
  const json = JSON.stringify(mapKeys(payload));
  const bytes = new TextEncoder().encode(json);

  if (typeof CompressionStream === "undefined") {
    return encodeBase64UrlSafe(bytes);
  }

  const stream = new CompressionStream("deflate");
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();

  const response = new Response(stream.readable);
  const buffer = await response.arrayBuffer();
  return encodeBase64UrlSafe(new Uint8Array(buffer));
}

async function decompressPayload(value: string) {
  const bytes = decodeBase64UrlSafe(value);

  let json: string;
  if (typeof DecompressionStream === "undefined") {
    json = new TextDecoder().decode(bytes);
  } else {
    const stream = new DecompressionStream("deflate");
    const writer = stream.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const response = new Response(stream.readable);
    const buffer = await response.arrayBuffer();
    json = new TextDecoder().decode(new Uint8Array(buffer));
  }

  return unmapKeys(JSON.parse(json)) as LegacySharePayload;
}

function deriveDecryptionKey(password: string, salt: Uint8Array) {
  const nacl = requireNacl();
  let result = nacl.util.decodeUTF8(password);

  for (let index = 0; index < KEY_ITERATIONS; index += 1) {
    const input = new Uint8Array(result.length + salt.length);
    input.set(result);
    input.set(salt, result.length);
    result = nacl.hash(input);
  }

  return result.slice(0, KEY_LENGTH);
}

function deriveMasterKey(password: string, salt: Uint8Array, nonce: Uint8Array) {
  const nacl = requireNacl();
  let result = nacl.util.decodeUTF8(password);

  for (let index = 0; index < KEY_ITERATIONS; index += 1) {
    const input = new Uint8Array(result.length + salt.length + nonce.length);
    input.set(result);
    input.set(salt, result.length);
    input.set(nonce, result.length + salt.length);
    result = nacl.hash(input);
  }

  return result.slice(0, KEY_LENGTH);
}

function getBaseUrl() {
  return window.location.href.split("#")[0];
}

function mapProviderToLegacyBaseUrl(provider: ProviderId, customBaseUrl: string) {
  if (provider === "custom" && customBaseUrl) {
    return customBaseUrl;
  }

  const known: Record<Exclude<ProviderId, "custom">, string> = {
    openai: "https://api.openai.com/v1",
    groq: "https://api.groq.com/openai/v1",
    berget: "https://api.berget.ai/v1",
    ollama: "http://localhost:11434/v1",
  };

  return known[provider as Exclude<ProviderId, "custom">];
}

function isKnownProvider(value: unknown): value is ProviderId {
  return value === "openai" ||
    value === "groq" ||
    value === "berget" ||
    value === "ollama" ||
    value === "custom";
}

export function buildLegacySharePayload(state: AppState): LegacySharePayload {
  const payload: LegacySharePayload = {
    ...state.legacyShare.rawPayload,
  };

  payload.provider = state.settings.provider;
  if (state.settings.provider === "custom" && state.settings.customBaseUrl) {
    payload.baseUrl = state.settings.customBaseUrl;
  } else {
    delete payload.baseUrl;
  }

  payload.apiKey = state.settings.apiKey || undefined;
  payload.model = state.settings.model || undefined;
  payload.systemPrompt = state.settings.systemPrompt || undefined;
  payload.messages = state.messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({ role: message.role, content: message.content }));

  payload.prompts = state.prompts.customPrompts.map((prompt) => ({
    id: prompt.id,
    title: prompt.name,
    prompt: prompt.content,
  }));
  payload.selectedPromptIds = state.prompts.selectedCustomPromptIds;
  payload.selectedDefaultPromptIds = state.prompts.selectedDefaultPromptIds;

  payload.functions = Object.fromEntries(
    Object.entries(state.functions.userFunctions).map(([name, draft]) => [name, { code: draft.code }]),
  );
  payload.functionCollections = Object.fromEntries(
    Object.entries(state.functions.functionCollections).filter(([name]) => Boolean(state.functions.userFunctions[name])),
  );
  payload.selectedDefaultFunctionIds = state.functions.selectedDefaultFunctionIds;
  payload.selectedDefaultFunctionCollectionIds = state.functions.selectedDefaultFunctionCollectionIds;

  const mcpConnections = {
    ...(typeof payload.mcpConnections === "object" && payload.mcpConnections ? payload.mcpConnections : {}),
  } as Record<string, unknown>;

  if (state.mcp.servers.huggingface.accessToken) {
    mcpConnections.huggingface = state.mcp.servers.huggingface.accessToken;
  }

  payload.mcpConnections = Object.keys(mcpConnections).length ? mcpConnections : undefined;
  payload.welcomeMessage = state.legacyShare.welcomeMessage || undefined;
  payload.theme = state.theme;

  return payload;
}

export async function createLegacyShareLink(state: AppState, password: string) {
  if (!password.trim()) {
    throw new Error("Password is required.");
  }

  const payload = buildLegacySharePayload(state);
  const compressed = await compressPayload(payload);
  const nacl = requireNacl();
  const jsonString = JSON.stringify(compressed);
  const plain = nacl.util.decodeUTF8(jsonString);
  const salt = nacl.randomBytes(SALT_LENGTH);
  const nonce = nacl.randomBytes(NONCE_LENGTH_STORED);
  const key = deriveDecryptionKey(password, salt);
  const expandedNonce = nacl.hash(nonce).slice(0, NONCE_LENGTH_EXPANDED);
  const cipher = nacl.secretbox(plain, expandedNonce, key);
  const message = new Uint8Array(salt.length + nonce.length + cipher.length);

  message.set(salt, 0);
  message.set(nonce, salt.length);
  message.set(cipher, salt.length + nonce.length);

  return `${getBaseUrl()}${HASH_PREFIX}${encodeBase64UrlSafe(message)}`;
}

export function getLegacyShareFragment() {
  return window.location.hash.startsWith(HASH_PREFIX)
    ? window.location.hash.slice(HASH_PREFIX.length)
    : null;
}

export async function decryptLegacyShareFragment(password: string, fragment = getLegacyShareFragment()) {
  if (!fragment) {
    return null;
  }

  const nacl = requireNacl();
  const bytes = decodeBase64UrlSafe(fragment);
  if (bytes.length < SALT_LENGTH + NONCE_LENGTH_STORED + 16) {
    throw new Error("Invalid legacy share payload.");
  }

  const salt = bytes.slice(0, SALT_LENGTH);
  const nonce = bytes.slice(SALT_LENGTH, SALT_LENGTH + NONCE_LENGTH_STORED);
  const cipher = bytes.slice(SALT_LENGTH + NONCE_LENGTH_STORED);
  const expandedNonce = nacl.hash(nonce).slice(0, NONCE_LENGTH_EXPANDED);
  const key = deriveDecryptionKey(password, salt);
  const plain = nacl.secretbox.open(cipher, expandedNonce, key);

  if (!plain) {
    throw new Error("Invalid password or unsupported share link.");
  }

  const compressed = JSON.parse(nacl.util.encodeUTF8(plain)) as string;
  return {
    payload: await decompressPayload(compressed),
    masterKey: Array.from(deriveMasterKey(password, salt, nonce))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(""),
  };
}

export function clearLegacyShareFragment() {
  if (!window.location.hash.startsWith(HASH_PREFIX)) {
    return;
  }

  window.history.replaceState({}, document.title, getBaseUrl());
}

export function mapLegacyPayloadToPartialState(payload: LegacySharePayload): Partial<AppState> {
  const rawPayload = { ...payload };

  const prompts = Array.isArray(payload.prompts)
    ? payload.prompts.map((prompt) => ({
        id: typeof prompt.id === "string" && prompt.id ? prompt.id : createPromptId(),
        name: prompt.title,
        content: prompt.prompt,
      }))
    : [];

  const promptIds = Array.isArray(payload.selectedPromptIds)
    ? payload.selectedPromptIds.filter((id): id is string => typeof id === "string")
    : prompts.map((prompt) => prompt.id);

  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .filter((message) => typeof message?.role === "string" && typeof message?.content === "string")
        .map((message, index) => {
          const role: "assistant" | "user" = message.role === "assistant" ? "assistant" : "user";
          return {
            id: `shared-${message.role}-${index + 1}`,
            role,
            content: message.content,
          };
        })
    : [];

  const settingsProvider = isKnownProvider(payload.provider)
    ? payload.provider
    : typeof payload.baseUrl === "string"
      ? "custom"
      : undefined;

  const settings: AppState["settings"] = {
    provider: "openai",
    customBaseUrl: "",
    apiKey: "",
    model: "gpt-5",
    systemPrompt: "",
  };
  if (settingsProvider) {
    settings.provider = settingsProvider;
  }
  if (typeof payload.baseUrl === "string") {
    settings.customBaseUrl = payload.baseUrl;
  }
  if (typeof payload.apiKey === "string") {
    settings.apiKey = payload.apiKey;
  }
  if (typeof payload.model === "string") {
    settings.model = payload.model;
  }
  if (typeof payload.systemPrompt === "string") {
    settings.systemPrompt = payload.systemPrompt;
  }

  const userFunctions = Object.fromEntries(
    Object.entries(payload.functions ?? {}).flatMap(([name, entry]) => {
      const code = entry?.code;
      if (typeof code !== "string") {
        return [];
      }

      return [[name, { name, code }]];
    }),
  );

  delete rawPayload.apiKey;
  delete rawPayload.baseUrl;
  delete rawPayload.systemPrompt;
  delete rawPayload.messages;
  delete rawPayload.prompts;
  delete rawPayload.selectedPromptIds;
  delete rawPayload.selectedDefaultPromptIds;
  delete rawPayload.functions;
  delete rawPayload.functionCollections;
  delete rawPayload.enabledFunctions;
  delete rawPayload.selectedDefaultFunctionIds;
  delete rawPayload.selectedDefaultFunctionCollectionIds;
  delete rawPayload.welcomeMessage;
  delete rawPayload.theme;
  delete rawPayload.model;
  delete rawPayload.provider;

  const mcpConnections =
    payload.mcpConnections && typeof payload.mcpConnections === "object"
      ? { ...payload.mcpConnections }
      : {};

  const huggingfaceAccessToken =
    typeof mcpConnections.huggingface === "string" ? mcpConnections.huggingface : "";
  delete mcpConnections.huggingface;

  return {
    theme:
      payload.theme === "paper" || payload.theme === "signal" || payload.theme === "terminal"
        ? payload.theme
        : undefined,
    messages: messages.length ? messages : undefined,
    settings,
    prompts: {
      customPrompts: prompts,
      selectedCustomPromptIds: promptIds,
      selectedDefaultPromptIds: Array.isArray(payload.selectedDefaultPromptIds)
        ? payload.selectedDefaultPromptIds.filter((id): id is string => typeof id === "string")
        : [],
    },
    functions: {
      userFunctions,
      functionCollections: Object.fromEntries(
        Object.entries(payload.functionCollections ?? {}).filter(([, value]) => typeof value === "string"),
      ),
      selectedDefaultFunctionIds: Array.isArray(payload.selectedDefaultFunctionIds)
        ? payload.selectedDefaultFunctionIds.filter((id): id is string => typeof id === "string")
        : [],
      selectedDefaultFunctionCollectionIds: Array.isArray(payload.selectedDefaultFunctionCollectionIds)
        ? payload.selectedDefaultFunctionCollectionIds.filter((id): id is string => typeof id === "string")
        : [],
    },
    mcp: {
      servers: {
        huggingface: {
          enabled: true,
          promptEnabled: false,
          accessToken: huggingfaceAccessToken,
        },
      },
    },
    legacyShare: {
      welcomeMessage: typeof payload.welcomeMessage === "string" ? payload.welcomeMessage : "",
      rawPayload: Object.keys(mcpConnections).length
        ? {
            ...rawPayload,
            mcpConnections,
          }
        : rawPayload,
    },
  };
}
