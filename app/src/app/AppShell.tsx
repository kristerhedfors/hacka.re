import type { Dispatch, ReactNode } from "react";
import { ModalLayer } from "../components/ModalLayer";
import { composeSystemPrompt } from "../features/prompts/library";
import { getBaseUrl } from "../config/providers";
import type { AppAction, AppState, ModalId } from "../types/app";

interface AppShellProps {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  onSubmitMessage: () => Promise<void>;
}

const controlButtons: Array<{
  id: string;
  label: string;
  symbol: ReactNode;
  modal?: ModalId;
  kind?: "text" | "svg";
}> = [
  {
    id: "mcp-servers-btn",
    label: "Model Context Protocol",
    symbol: <span className="mcp-icon">MCP</span>,
    modal: "mcp",
    kind: "text",
  },
  {
    id: "function-btn",
    label: "Function Calling",
    symbol: <span className="function-icon">𝑓</span>,
    modal: "functions",
    kind: "text",
  },
  {
    id: "rag-btn",
    label: "Knowledge Base",
    symbol: <span className="rag-icon">RAG</span>,
    modal: "rag",
    kind: "text",
  },
  { id: "prompts-btn", label: "System Prompts", symbol: <ListIcon />, modal: "prompts", kind: "svg" },
  { id: "share-btn", label: "Share Configuration", symbol: <ShareIcon />, modal: "share", kind: "svg" },
];

function HatMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="10" rx="7" ry="5.5" fill="currentColor" />
      <ellipse cx="12" cy="15" rx="11" ry="3.5" fill="currentColor" />
      <path
        d="M 1 12 Q 12 15.5 23 12"
        stroke="var(--primary-color)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.7"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="5"
        y="5"
        width="14"
        height="14"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9 9h6M9 12h6M9 15h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="7" cy="12" r="2.2" fill="currentColor" />
      <circle cx="17" cy="7" r="2.2" fill="currentColor" />
      <circle cx="17" cy="17" r="2.2" fill="currentColor" />
      <path
        d="M8.9 11.1l6.2-3.2M8.9 12.9l6.2 3.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BrushIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14.8 4.2l5 5-7.8 7.8c-.7.7-1.7 1.2-2.7 1.3l-3.9.5.5-3.9c.1-1 .6-2 1.3-2.7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M13.4 5.6l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4.5l1 .2.6 1.8 1.7.8 1.8-.7.8.7-.7 1.8.8 1.7 1.8.6.2 1-1.5 1v1.9l1.5 1-.2 1-1.8.6-.8 1.7.7 1.8-.8.7-1.8-.7-1.7.8-.6 1.8-1 .2-1-.2-.6-1.8-1.7-.8-1.8.7-.8-.7.7-1.8-.8-1.7-1.8-.6-.2-1 1.5-1v-1.9l-1.5-1 .2-1 1.8-.6.8-1.7-.7-1.8.8-.7 1.8.7 1.7-.8.6-1.8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 7V5h6v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M8 7l.8 11a2 2 0 0 0 2 1.8h2.4a2 2 0 0 0 2-1.8L16 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 11.5 20 4l-4.8 16-2.8-6-6.4-2.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M20 4 12.4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function AppShell({ state, dispatch, onSubmitMessage }: AppShellProps) {
  const usageBarStyle = {
    width: `${state.contextUsagePercent}%`,
  };
  const activePromptCount =
    state.prompts.selectedCustomPromptIds.length + state.prompts.selectedDefaultPromptIds.length;
  const hasSystemPrompt = composeSystemPrompt(state.prompts).length > 0;

  async function handleComposerSubmit() {
    await onSubmitMessage();
  }

  return (
    <>
      <div className="app-container">
        <header>
          <div className="settings" aria-label="primary controls">
            <button id="heart-btn" className="icon-btn" type="button" aria-label="hacka.re" title="hacka.re">
              <span className="heart-logo">
                <HatMark />
                <div className="tooltip tree-menu">
                  <div className="tree-content">
                    <div className="logo-line hacka-re-font">hacka.re: serverless agency</div>
                    <div className="logo-line">│</div>
                    <div className="logo-line">├─ <a href="../legacy/" className="tree-link">Legacy</a></div>
                    <div className="logo-line">├─ <a href="../legacy/about/index.html" className="tree-link">About</a></div>
                    <div className="logo-line">├─ <span className="feature-link">TypeScript rewrite</span></div>
                    <div className="logo-line">├─ <span className="feature-link">Static deploy</span></div>
                    <div className="logo-line">├─ <span className="feature-link">Local-first settings</span></div>
                    <div className="logo-line">└─ <span className="feature-link">Workflow parity</span></div>
                  </div>
                </div>
              </span>
            </button>

            {controlButtons.map((button) => (
              <button
                key={button.id}
                id={button.id}
                className={`icon-btn ${button.kind === "text" ? "header-text-btn" : "header-svg-btn"}`}
                type="button"
                onClick={() => button.modal && dispatch({ type: "openModal", modal: button.modal })}
                aria-label={button.label}
                title={button.label}
              >
                {button.symbol}
              </button>
            ))}

            <button
              id="theme-toggle-btn"
              className="icon-btn"
              type="button"
              onClick={() => dispatch({ type: "cycleTheme" })}
              aria-label="Cycle theme"
              title="Cycle theme"
            >
              <BrushIcon />
            </button>

            <button
              id="settings-btn"
              className="icon-btn"
              type="button"
              onClick={() => dispatch({ type: "openModal", modal: "settings" })}
              aria-label="Settings"
              title="Settings"
            >
              <CogIcon />
            </button>
          </div>

          <span className="beta-tag header-beta">BETA</span>

          <div className="model-info">
            <div className="model-name-display">{state.settings.model}</div>
            <div className="model-stats">
              <span className="model-context">{state.modelContext}</span>
              <span className="context-usage">
                <span className="usage-bar" aria-label="context usage">
                  <span className="usage-fill" style={usageBarStyle} />
                </span>
                <span className="usage-text">{state.contextUsagePercent}%</span>
              </span>
              <span className="token-speed">
                <span className="token-speed-text">{state.tokenSpeed}</span>
              </span>
            </div>
          </div>
        </header>

        <main>
          <div id="chat-container">
            <div id="chat-header">
              <button
                id="copy-chat-btn"
                className="icon-btn chat-action-btn"
                type="button"
                aria-label="Copy chat"
                title="Copy chat"
              >
                <CopyIcon />
              </button>
              <div className="chat-runtime-meta">
                <span>{state.isGenerating ? "Waiting for OpenAI..." : state.settings.provider}</span>
                <span>{getBaseUrl(state.settings) || "No base URL configured yet."}</span>
                <span>
                  {hasSystemPrompt
                    ? `${activePromptCount} prompt${activePromptCount === 1 ? "" : "s"} active`
                    : "No system prompts active"}
                </span>
              </div>
            </div>

            <div id="chat-messages">
              {state.messages.map((message) => (
                <div key={message.id} className={`message ${message.role}`}>
                  <div className="message-content">
                    {message.meta ? <div className="message-meta-label">{message.meta}</div> : null}
                    <p>{message.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <div id="chat-input-container">
              <div className="input-with-actions">
                <button
                  id="clear-chat-btn"
                  className="icon-btn"
                  type="button"
                  aria-label="Clear chat"
                  title="Clear chat"
                >
                  <TrashIcon />
                </button>
                <button
                  id="prompt-library-btn"
                  className="icon-btn"
                  type="button"
                  style={{ display: "none" }}
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <form
                  id="chat-form"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    await handleComposerSubmit();
                  }}
                >
                  <div id="message-input-wrapper" className="message-input-wrapper">
                    <label className="sr-only" htmlFor="message-input">
                      Message input
                    </label>
                    <textarea
                      id="message-input"
                      rows={1}
                      placeholder="Type your message..."
                      value={state.composerText}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleComposerSubmit();
                        }
                      }}
                      onChange={(event) =>
                        dispatch({ type: "setComposerText", value: event.target.value })
                      }
                    />
                  </div>
                  <button
                    type="submit"
                    id="send-btn"
                    className="icon-btn"
                    name="send-message-button"
                    aria-label={state.isGenerating ? "Sending..." : "Send"}
                    disabled={state.isGenerating}
                  >
                    <SendIcon />
                  </button>
                </form>
              </div>

              {state.errorMessage ? (
                <div className="app-error-banner" role="alert">
                  <span>{state.errorMessage}</span>
                  <button className="btn secondary-btn" type="button" onClick={() => dispatch({ type: "clearError" })}>
                    Dismiss
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </main>
      </div>

      <ModalLayer
        activeModal={state.activeModal}
        state={state}
        dispatch={dispatch}
        onClose={() => dispatch({ type: "closeModal" })}
      />
    </>
  );
}
