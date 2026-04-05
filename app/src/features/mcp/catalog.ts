import type { McpServerId, McpServerState, McpState } from "../../types/app";

export interface McpBuiltInToolDefinition {
  name: string;
  summary: string;
}

export interface McpOptionDefinition {
  name: string;
  summary: string;
}

export interface McpServerDefinition {
  id: McpServerId;
  name: string;
  shortDescription: string;
  endpoint: string;
  docsUrl: string;
  settingsUrl: string;
  changelogUrl: string;
  tokenRequirement: string;
  supportedClients: string[];
  builtInTools: McpBuiltInToolDefinition[];
  communityOptions: McpOptionDefinition[];
  promptName: string;
  promptSummary: string;
  promptContent: string;
}

export const huggingFaceMcpDefinition: McpServerDefinition = {
  id: "huggingface",
  name: "Hugging Face MCP Server",
  shortDescription:
    "Official Hugging Face Hub MCP server for Hub search, docs search, jobs, repo details, and MCP-compatible Spaces.",
  endpoint: "https://huggingface.co/mcp",
  docsUrl: "https://huggingface.co/docs/hub/agents-mcp",
  settingsUrl: "https://huggingface.co/settings/mcp",
  changelogUrl: "https://huggingface.co/changelog/hf-mcp-server",
  tokenRequirement: "Hugging Face access token with Read permissions.",
  supportedClients: ["Codex", "Cursor", "VS Code extensions", "Zed", "ChatGPT", "Claude Desktop"],
  builtInTools: [
    {
      name: "Spaces Semantic Search",
      summary: "Search MCP-compatible AI apps on the Hub with natural-language queries.",
    },
    {
      name: "Papers Semantic Search",
      summary: "Search machine-learning research papers with natural-language queries.",
    },
    {
      name: "Model Search",
      summary: "Search models with Hub metadata and filters such as task or library.",
    },
    {
      name: "Dataset Search",
      summary: "Search datasets with Hub metadata and filters such as author or tags.",
    },
    {
      name: "Documentation Semantic Search",
      summary: "Search Hugging Face docs for guides, API references, and tutorials.",
    },
    {
      name: "Run and Manage Jobs",
      summary: "Run, monitor, and schedule jobs on Hugging Face infrastructure.",
    },
    {
      name: "Hub Repository Details",
      summary: "Fetch detailed information about models, datasets, and Spaces, optionally with README content.",
    },
  ],
  communityOptions: [
    {
      name: "Community Space tools",
      summary: "Add MCP-compatible Gradio Spaces as callable tools from Hugging Face settings.",
    },
    {
      name: "Dynamic Spaces (Experimental)",
      summary: "Discover and call MCP-compatible Spaces at runtime without pre-adding each one.",
    },
    {
      name: "Remove Embedded Images",
      summary: "Strip embedded Gradio image payloads for text-only or limited clients.",
    },
    {
      name: "MCP-UI Support (Experimental)",
      summary: "Embed Gradio Spaces directly in MCP-UI-capable clients.",
    },
  ],
  promptName: "Hugging Face MCP server guide",
  promptSummary:
    "Capability and behavior guide for the official Hugging Face MCP server as documented by Hugging Face.",
  promptContent: `You are operating with the official Hugging Face MCP server guide loaded.

Only claim a Hugging Face MCP tool was executed when tool results are actually present in the runtime or conversation. If tool execution is unavailable, say so plainly and fall back to reasoning or ask the user to connect the server.

Use the Hugging Face MCP server for Hugging Face-specific tasks:
- Search Hub resources: models, datasets, Spaces, and papers.
- Search Hugging Face documentation with natural-language queries.
- Retrieve repository details for models, datasets, and Spaces.
- Run, monitor, and schedule Hugging Face Jobs when that tool is available.
- Use MCP-compatible Gradio Spaces from the community as tools when configured.

Current built-in Hugging Face MCP capabilities documented by Hugging Face:
- Spaces Semantic Search
- Papers Semantic Search
- Model Search
- Dataset Search
- Documentation Semantic Search
- Run and Manage Jobs
- Hub Repository Details

Community and dynamic tool behavior:
- Hugging Face can expose MCP-compatible Gradio Spaces as tools.
- Dynamic Spaces is experimental and may discover tools at runtime.
- Remove Embedded Images can be enabled for text-only clients.
- MCP-UI Support is experimental and enables richer Space embeddings in compatible clients.

Operational guidance:
- Prefer Hugging Face MCP for Hub discovery, documentation lookup, repository inspection, and Space-based tools.
- Summarize results with useful context instead of dumping raw identifiers.
- Include canonical Hugging Face links for models, datasets, Spaces, papers, and docs whenever relevant.
- If the user needs a Hugging Face token, note that Hugging Face documents using a Read-permission token for MCP tools.
- If a question is better answered by Hugging Face docs, say that the answer comes from the docs search capability when tool results support it.
`,
};

export const mcpServerCatalog: Record<McpServerId, McpServerDefinition> = {
  huggingface: huggingFaceMcpDefinition,
};

export function createEmptyMcpState(): McpState {
  return {
    servers: {
      huggingface: {
        enabled: true,
        promptEnabled: true,
        accessToken: "",
      },
    },
  };
}

export function normalizeMcpState(state: McpState): McpState {
  const fallback = createEmptyMcpState();
  const server = state.servers?.huggingface;

  return {
    servers: {
      huggingface: {
        enabled: typeof server?.enabled === "boolean" ? server.enabled : fallback.servers.huggingface.enabled,
        promptEnabled:
          typeof server?.promptEnabled === "boolean"
            ? server.promptEnabled
            : fallback.servers.huggingface.promptEnabled,
        accessToken: typeof server?.accessToken === "string" ? server.accessToken : "",
      },
    },
  };
}

export function getEnabledMcpPromptSections(mcpState: McpState): string[] {
  return Object.entries(mcpState.servers)
    .filter(([, serverState]) => serverState.enabled && serverState.promptEnabled)
    .map(([serverId]) => mcpServerCatalog[serverId as McpServerId].promptContent.trim());
}

export function getMcpServerState(mcpState: McpState, serverId: McpServerId): McpServerState {
  return mcpState.servers[serverId];
}
