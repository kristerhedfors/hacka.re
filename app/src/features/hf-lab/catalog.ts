import type { HfCapabilityCheckId, HfCapabilityStatus, HfLabState } from "../../types/app";

export interface HfCapabilityDefinition {
  id: HfCapabilityCheckId;
  title: string;
  summary: string;
  validationTarget: string;
  recommendedPath: string;
}

export interface HfArchitecturePhase {
  id: string;
  title: string;
  summary: string;
  deliverables: string[];
}

const defaultCheckStatus: Record<HfCapabilityCheckId, HfCapabilityStatus> = {
  "oauth-pkce": "planned",
  "router-cors": "planned",
  "router-retries": "planned",
  "docker-space-cors": "planned",
  "code-execution": "planned",
  "hub-crud": "planned",
  "gradio-client": "planned",
  "mcp-browser-transport": "planned",
  "dynamic-spaces": "planned",
  "file-mounting": "planned",
};

export const hfCapabilityCatalog: HfCapabilityDefinition[] = [
  {
    id: "oauth-pkce",
    title: "HF OAuth with PKCE",
    summary: "Users authenticate with their own Hugging Face account instead of exposing a static token.",
    validationTarget: "CIMD document, login redirect, token restore, and scoped browser session storage.",
    recommendedPath: "Implement PKCE in the browser, serve `/.well-known/oauth-cimd`, and store access state locally.",
  },
  {
    id: "router-cors",
    title: "Inference Router Browser Calls",
    summary: "Route chat completions through `router.huggingface.co/v1` directly from the web app.",
    validationTarget: "Successful CORS browser request, streaming response handling, and provider/model switching.",
    recommendedPath: "Use the HF router as an OpenAI-compatible target, then keep model selection in the app settings.",
  },
  {
    id: "router-retries",
    title: "Cold-Start Retry Logic",
    summary: "Handle transient cold starts that can surface as misleading browser CORS failures.",
    validationTarget: "Retry/backoff policy around 503 or opaque fetch failures with user-visible state.",
    recommendedPath: "Wrap inference calls with bounded retries and a cold-start status banner in the UI.",
  },
  {
    id: "docker-space-cors",
    title: "Docker Space Tool Server",
    summary: "Expose a custom FastAPI tool backend with explicit `Access-Control-Allow-Origin` support for hacka.re.",
    validationTarget: "Cross-origin preflight and real request success from the hacka.re page.",
    recommendedPath: "Use a Docker Space for execution APIs and keep CORS behavior under app control.",
  },
  {
    id: "code-execution",
    title: "Execution Environment Switching",
    summary: "Swap between Docker Space execution, Gradio-only workflows, or an external sandbox like E2B.",
    validationTarget: "One UI surface can change execution backend without code changes elsewhere in the app.",
    recommendedPath: "Abstract executor selection in app state and route tool calls through a single dispatcher.",
  },
  {
    id: "hub-crud",
    title: "Hub CRUD from Browser",
    summary: "Create, update, inspect, and delete repos or Spaces via the browser with the user's token.",
    validationTarget: "Repo creation or update flow works from the page and reports rate-limit or permission failures cleanly.",
    recommendedPath: "Use `@huggingface/hub` for browser-native Hub operations and keep file scopes explicit in the UI.",
  },
  {
    id: "gradio-client",
    title: "Gradio Space Invocation",
    summary: "Call public or duplicated Gradio Spaces for streaming model capabilities.",
    validationTarget: "Space connect, predict/submit, and file upload behavior work from the browser.",
    recommendedPath: "Use `@gradio/client` for named endpoint calls and optional ephemeral duplication.",
  },
  {
    id: "mcp-browser-transport",
    title: "Browser MCP Strategy",
    summary: "Determine whether direct HF MCP transport is usable from browsers or needs a proxy Space.",
    validationTarget: "Confirm direct browser compatibility or document the required proxy fallback.",
    recommendedPath: "Test direct HTTP transport first, then fall back to a Space proxy or client-side tool loop.",
  },
  {
    id: "dynamic-spaces",
    title: "Dynamic Space Tools",
    summary: "Surface community or runtime-discovered MCP/Gradio Spaces as tools in the interface.",
    validationTarget: "Runtime-selected Space metadata can be stored, displayed, and invoked from the same UI.",
    recommendedPath: "Treat Space tools as user-managed attachments with saved endpoints and capability labels.",
  },
  {
    id: "file-mounting",
    title: "Mounted Files and Scope",
    summary: "Make repository, upload, and session-file scope easy to switch without hiding trust boundaries.",
    validationTarget: "The user can tell which files are available to which backend and whether writes persist.",
    recommendedPath: "Expose repo id, mount path, and scope mode directly in the execution profile UI.",
  },
];

export const hfArchitecturePhases: HfArchitecturePhase[] = [
  {
    id: "phase-1",
    title: "Browser Baseline",
    summary: "Validate auth, inference routing, and profile switching without adding a server dependency beyond Spaces.",
    deliverables: [
      "HF OAuth PKCE login",
      "Router-backed chat preset",
      "Persistent Hugging Face integration lab in the shell",
    ],
  },
  {
    id: "phase-2",
    title: "Tool and Execution Layer",
    summary: "Introduce a Docker Space executor and unify tool calls behind one browser dispatcher.",
    deliverables: [
      "Docker Space CORS validation",
      "Execution backend switcher",
      "Mounted file scope controls",
    ],
  },
  {
    id: "phase-3",
    title: "Space and MCP Expansion",
    summary: "Add Gradio invocation, MCP transport verification, and dynamic tool discovery.",
    deliverables: [
      "Gradio client integration",
      "HF MCP direct-vs-proxy decision",
      "Dynamic Space registry in the UI",
    ],
  },
];

export function createEmptyHfLabState(): HfLabState {
  return {
    hfToken: "",
    authStrategy: "oauth-pkce",
    inferenceModel: "meta-llama/Llama-3.3-70B-Instruct:fireworks-ai",
    inferenceProviderRoute: "https://router.huggingface.co/v1",
    executionBackend: "docker-space",
    executionSpaceId: "user/hackare-exec",
    gradioSpaceId: "huggingface-projects/llama-demo",
    mountedRepoId: "user/hackare-session-files",
    mountedPath: "/workspace",
    mountStrategy: "hub-repo",
    scopeMode: "user-oauth",
    mcpTransport: "browser-direct",
    notes: "",
    checks: { ...defaultCheckStatus },
  };
}

export function normalizeHfLabState(state: HfLabState | undefined | null): HfLabState {
  const fallback = createEmptyHfLabState();

  return {
    hfToken: typeof state?.hfToken === "string" ? state.hfToken : fallback.hfToken,
    authStrategy:
      state?.authStrategy === "user-token" || state?.authStrategy === "oauth-pkce"
        ? state.authStrategy
        : fallback.authStrategy,
    inferenceModel: typeof state?.inferenceModel === "string" ? state.inferenceModel : fallback.inferenceModel,
    inferenceProviderRoute:
      typeof state?.inferenceProviderRoute === "string"
        ? state.inferenceProviderRoute
        : fallback.inferenceProviderRoute,
    executionBackend:
      state?.executionBackend === "gradio-space" ||
      state?.executionBackend === "e2b" ||
      state?.executionBackend === "docker-space"
        ? state.executionBackend
        : fallback.executionBackend,
    executionSpaceId:
      typeof state?.executionSpaceId === "string" ? state.executionSpaceId : fallback.executionSpaceId,
    gradioSpaceId: typeof state?.gradioSpaceId === "string" ? state.gradioSpaceId : fallback.gradioSpaceId,
    mountedRepoId: typeof state?.mountedRepoId === "string" ? state.mountedRepoId : fallback.mountedRepoId,
    mountedPath: typeof state?.mountedPath === "string" ? state.mountedPath : fallback.mountedPath,
    mountStrategy:
      state?.mountStrategy === "upload" ||
      state?.mountStrategy === "session-files" ||
      state?.mountStrategy === "hub-repo"
        ? state.mountStrategy
        : fallback.mountStrategy,
    scopeMode:
      state?.scopeMode === "space-owned" ||
      state?.scopeMode === "ephemeral" ||
      state?.scopeMode === "user-oauth"
        ? state.scopeMode
        : fallback.scopeMode,
    mcpTransport:
      state?.mcpTransport === "space-proxy" ||
      state?.mcpTransport === "client-loop" ||
      state?.mcpTransport === "browser-direct"
        ? state.mcpTransport
        : fallback.mcpTransport,
    notes: typeof state?.notes === "string" ? state.notes : "",
    checks: hfCapabilityCatalog.reduce<Record<HfCapabilityCheckId, HfCapabilityStatus>>((accumulator, capability) => {
      const candidate = state?.checks?.[capability.id];
      accumulator[capability.id] =
        candidate === "planned" || candidate === "validating" || candidate === "validated" || candidate === "blocked"
          ? candidate
          : fallback.checks[capability.id];
      return accumulator;
    }, {} as Record<HfCapabilityCheckId, HfCapabilityStatus>),
  };
}
