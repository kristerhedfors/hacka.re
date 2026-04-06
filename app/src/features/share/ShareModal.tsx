import { useMemo, useState } from "react";
import type { AppState } from "../../types/app";
import { createLegacyShareLink } from "../../services/share";

interface ShareModalProps {
  state: AppState;
}

export function ShareModal({ state }: ShareModalProps) {
  const [password, setPassword] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const functionCount = Object.keys(state.functions.userFunctions).length;
  const promptCount = state.prompts.customPrompts.length;
  const messageCount = state.messages.filter((entry) => entry.role !== "system").length;
  const mcpCount = useMemo(() => {
    return [
      state.mcp.servers.huggingface.accessToken ? 1 : 0,
      state.legacyShare.rawPayload.mcpConnections &&
      typeof state.legacyShare.rawPayload.mcpConnections === "object"
        ? Object.keys(state.legacyShare.rawPayload.mcpConnections as Record<string, unknown>).length
        : 0,
    ].reduce((total, value) => total + value, 0);
  }, [state]);

  async function handleGenerate() {
    try {
      const nextLink = await createLegacyShareLink(state, password);
      setShareLink(nextLink);
      setStatus("Legacy-compatible encrypted link generated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to generate share link.");
    }
  }

  async function handleCopy() {
    if (!shareLink) {
      return;
    }

    await navigator.clipboard.writeText(shareLink);
    setStatus("Share link copied.");
  }

  return (
    <>
      <p className="modal-copy">
        Generates the legacy `#gpt=` encrypted link format. The payload includes current settings,
        prompts, user functions, default-function selections, chat history, theme, and preserved
        legacy passthrough fields so older links and unsupported connectors keep round-tripping.
      </p>

      <div className="app-settings-grid">
        <div className="form-group">
          <label htmlFor="share-password">Share Password</label>
          <input
            id="share-password"
            aria-label="Share Password"
            type="text"
            placeholder="Required for legacy-compatible encryption"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="share-welcome-message">Welcome Message</label>
          <input
            id="share-welcome-message"
            aria-label="Welcome Message"
            value={state.legacyShare.welcomeMessage}
            readOnly
          />
        </div>

        <div className="form-group app-span-full">
          <label htmlFor="generated-share-link">Generated Legacy Share Link</label>
          <textarea
            id="generated-share-link"
            aria-label="Generated Legacy Share Link"
            rows={4}
            readOnly
            value={shareLink}
          />
        </div>
      </div>

      <ul className="status-list">
        <li>{promptCount} custom prompts in payload.</li>
        <li>{functionCount} user functions in payload.</li>
        <li>{messageCount} conversation messages in payload.</li>
        <li>{mcpCount} MCP connection payload entries preserved.</li>
        <li>{state.functions.selectedDefaultFunctionIds.length} legacy default function IDs preserved.</li>
        <li>
          {state.functions.selectedDefaultFunctionCollectionIds.length} legacy default function
          collection IDs preserved.
        </li>
      </ul>

      <div className="form-actions app-form-actions">
        <button className="btn secondary-btn" type="button" onClick={handleGenerate}>
          Generate Legacy Share Link
        </button>
        <button className="btn secondary-btn" type="button" onClick={handleCopy} disabled={!shareLink}>
          Copy Link
        </button>
      </div>

      {status ? (
        <p className="app-inline-status" role="status">
          {status}
        </p>
      ) : null}
    </>
  );
}
