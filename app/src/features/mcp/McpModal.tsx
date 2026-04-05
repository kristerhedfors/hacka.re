import type { Dispatch } from "react";
import { getMcpServerState, huggingFaceMcpDefinition } from "./catalog";
import type { AppAction, AppState } from "../../types/app";

interface McpModalProps {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

export function McpModal({ state, dispatch }: McpModalProps) {
  const server = getMcpServerState(state.mcp, "huggingface");

  return (
    <>
      <p className="modal-copy">
        The 2.0 app now carries its first live MCP server definition. This Hugging Face entry is based
        on the current Hugging Face Hub documentation and keeps server settings local in the browser.
      </p>

      <section className="app-panel-section mcp-server-card">
        <div className="app-label-row">
          <div>
            <p className="app-section-kicker">First 2.0 MCP Server</p>
            <h3>{huggingFaceMcpDefinition.name}</h3>
          </div>
          <span className={`mcp-status-pill${server.enabled ? " is-active" : ""}`}>
            {server.enabled ? "Enabled" : "Disabled"}
          </span>
        </div>

        <p>{huggingFaceMcpDefinition.shortDescription}</p>

        <div className="app-settings-grid">
          <div className="form-group">
            <label className="checkbox-row" htmlFor="hf-mcp-enabled">
              <input
                id="hf-mcp-enabled"
                type="checkbox"
                checked={server.enabled}
                onChange={(event) =>
                  dispatch({
                    type: "patchMcpServer",
                    serverId: "huggingface",
                    value: { enabled: event.target.checked },
                  })
                }
              />
              <span>Enable Hugging Face MCP server in 2.0</span>
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-row" htmlFor="hf-mcp-prompt-enabled">
              <input
                id="hf-mcp-prompt-enabled"
                type="checkbox"
                checked={server.promptEnabled}
                onChange={(event) =>
                  dispatch({
                    type: "patchMcpServer",
                    serverId: "huggingface",
                    value: { promptEnabled: event.target.checked },
                  })
                }
              />
              <span>Include the Hugging Face MCP guide in the system prompt</span>
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="hf-mcp-endpoint">Endpoint</label>
            <input id="hf-mcp-endpoint" type="text" readOnly value={huggingFaceMcpDefinition.endpoint} />
          </div>

          <div className="form-group">
            <label htmlFor="hf-mcp-token">Access Token</label>
            <input
              id="hf-mcp-token"
              aria-label="Hugging Face Access Token"
              type="password"
              placeholder="hf_... stored locally in your browser"
              value={server.accessToken}
              onChange={(event) =>
                dispatch({
                  type: "patchMcpServer",
                  serverId: "huggingface",
                  value: { accessToken: event.target.value },
                })
              }
            />
            <p className="app-inline-status" role="status">
              {huggingFaceMcpDefinition.tokenRequirement}
            </p>
          </div>
        </div>

        <div className="mcp-link-row">
          <a href={huggingFaceMcpDefinition.docsUrl} target="_blank" rel="noreferrer">
            Docs
          </a>
          <a href={huggingFaceMcpDefinition.settingsUrl} target="_blank" rel="noreferrer">
            MCP Settings
          </a>
          <a href={huggingFaceMcpDefinition.changelogUrl} target="_blank" rel="noreferrer">
            Changelog
          </a>
        </div>
      </section>

      <div className="mcp-grid">
        <section className="app-panel-section">
          <div className="app-label-row">
            <h3>Built-in tools</h3>
            <span className="app-inline-status">{huggingFaceMcpDefinition.builtInTools.length} current tools</span>
          </div>
          <div className="status-list">
            {huggingFaceMcpDefinition.builtInTools.map((tool) => (
              <article key={tool.name} className="mcp-capability-row">
                <strong>{tool.name}</strong>
                <span>{tool.summary}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="app-panel-section">
          <div className="app-label-row">
            <h3>Spaces and options</h3>
            <span className="app-inline-status">Community and experimental</span>
          </div>
          <div className="status-list">
            {huggingFaceMcpDefinition.communityOptions.map((option) => (
              <article key={option.name} className="mcp-capability-row">
                <strong>{option.name}</strong>
                <span>{option.summary}</span>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="app-panel-section">
        <div className="app-label-row">
          <h3>Server prompt</h3>
          <span className="app-inline-status">{huggingFaceMcpDefinition.promptName}</span>
        </div>
        <p className="app-modal-note">{huggingFaceMcpDefinition.promptSummary}</p>
        <pre className="prompt-preview">{huggingFaceMcpDefinition.promptContent}</pre>
      </section>

      <section className="app-panel-section">
        <div className="app-label-row">
          <h3>Documented clients</h3>
          <span className="app-inline-status">From Hugging Face docs</span>
        </div>
        <p>{huggingFaceMcpDefinition.supportedClients.join(", ")}</p>
      </section>
    </>
  );
}
