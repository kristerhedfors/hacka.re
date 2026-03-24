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
}> = [
  { id: "mcp-servers-btn", label: "Model Context Protocol", symbol: <span>MCP</span>, modal: "mcp" },
  { id: "function-btn", label: "Function Calling", symbol: <span>𝑓</span>, modal: "functions" },
  { id: "rag-btn", label: "Knowledge Base", symbol: <span>RAG</span>, modal: "rag" },
  { id: "prompts-btn", label: "System Prompts", symbol: <ListIcon />, modal: "prompts" },
  { id: "share-btn", label: "Share Configuration", symbol: <ShareIcon />, modal: "share" },
];

function HatMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="10" rx="7" ry="5.5" fill="currentColor" />
      <ellipse cx="12" cy="15" rx="11" ry="3.5" fill="currentColor" />
      <path
        d="M 1 12 Q 12 15.5 23 12"
        stroke="var(--bg-strong)"
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
      <main className="shell-page">
        <section className="shell-frame">
          <header className="topbar">
            <div className="settings-strip">
              <button
                id="heart-btn"
                className="brand-button icon-control"
                type="button"
                aria-label="hacka.re"
                title="hacka.re"
              >
                <span className="brand-mark">
                  <HatMark />
                </span>
              </button>

              <div className="control-row" aria-label="primary controls">
                {controlButtons.map((button) => (
                  <button
                    key={button.id}
                    id={button.id}
                    className="icon-control"
                    type="button"
                    onClick={() =>
                      button.modal && dispatch({ type: "openModal", modal: button.modal })
                    }
                    aria-label={button.label}
                    title={button.label}
                  >
                    {button.symbol}
                  </button>
                ))}

                <button
                  id="theme-toggle-btn"
                  className="icon-control"
                  type="button"
                  onClick={() => dispatch({ type: "cycleTheme" })}
                  aria-label="Cycle theme"
                  title="Cycle theme"
                >
                  <BrushIcon />
                </button>

                <button
                  id="settings-btn"
                  className="icon-control"
                  type="button"
                  onClick={() => dispatch({ type: "openModal", modal: "settings" })}
                  aria-label="Settings"
                  title="Settings"
                >
                  <CogIcon />
                </button>
              </div>
            </div>

            <span className="beta-pill">BETA</span>

            <div className="model-panel">
              <div className="model-name">{state.settings.model}</div>
              <div className="model-stats">
                <span>{state.modelContext}</span>
                <span className="usage-meter" aria-label="context usage">
                  <span className="usage-meter-fill" style={usageBarStyle} />
                </span>
                <span>{state.contextUsagePercent}%</span>
                <span>{state.tokenSpeed}</span>
              </div>
            </div>
          </header>

          <div className="workspace">
            <section className="chat-surface" aria-label="chat surface">
              <h1 className="sr-only">hacka.re chat</h1>

              <div id="chat-messages" className="message-list">
                {state.messages.map((message) => (
                  <article
                    key={message.id}
                    className={`message-card role-${message.role}`}
                    data-role={message.role}
                  >
                    <div className="message-meta">
                      <span className="message-role">{message.role}</span>
                      {message.meta ? <span className="message-tag">{message.meta}</span> : null}
                    </div>
                    <p>{message.content}</p>
                  </article>
                ))}
              </div>

              <form
                className="composer-shell"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await handleComposerSubmit();
                }}
              >
                <div id="message-input-wrapper" className="composer-input">
                  <label className="sr-only" htmlFor="message-input">
                    Message input
                  </label>
                  <textarea
                    id="message-input"
                    rows={3}
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

                {state.errorMessage ? (
                  <div className="error-banner" role="alert">
                    <span>{state.errorMessage}</span>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => dispatch({ type: "clearError" })}
                    >
                      Dismiss
                    </button>
                  </div>
                ) : null}

                <div className="composer-actions">
                  <div className="composer-status">
                    <span>{state.isGenerating ? "Waiting for OpenAI..." : state.settings.provider}</span>
                    <span>{getBaseUrl(state.settings) || "No base URL configured yet."}</span>
                    <span>
                      {hasSystemPrompt
                        ? `${activePromptCount} prompt${activePromptCount === 1 ? "" : "s"} active`
                        : "No system prompts active"}
                    </span>
                  </div>
                  <button className="primary-button" type="submit" disabled={state.isGenerating}>
                    {state.isGenerating ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </section>
      </main>

      <ModalLayer
        activeModal={state.activeModal}
        state={state}
        dispatch={dispatch}
        onClose={() => dispatch({ type: "closeModal" })}
      />
    </>
  );
}
