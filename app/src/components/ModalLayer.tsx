import type { Dispatch } from "react";
import { McpModal } from "../features/mcp/McpModal";
import { PromptsModal } from "../features/prompts/PromptsModal";
import { SettingsModal } from "../features/settings/SettingsModal";
import type { AppAction, AppState, ModalId } from "../types/app";

interface ModalLayerProps {
  activeModal: ModalId | null;
  state: AppState;
  dispatch: Dispatch<AppAction>;
  onClose: () => void;
}

const modalContent: Record<
  Exclude<ModalId, "prompts" | "settings" | "mcp">,
  { title: string; body: string; checkpoints: string[] }
> = {
  share: {
    title: "Share Configuration",
    body: "Encrypted share-link generation and legacy-compatible payload handling still need to be ported from the original app.",
    checkpoints: [
      "Share payload schema",
      "Password and size estimation flow",
      "Legacy/next compatibility fixtures",
    ],
  },
  functions: {
    title: "Function Calling",
    body: "The function library, editor, and execution pipeline still need a typed React port.",
    checkpoints: [
      "Function schema and registry",
      "Editor and list views",
      "Execution pipeline integration",
    ],
  },
  rag: {
    title: "Knowledge Base",
    body: "Bundle indexing, query expansion, and RAG-assisted prompt augmentation still need to be reintroduced.",
    checkpoints: [
      "Bundle and chunk schemas",
      "Indexing and storage services",
      "Prompt augmentation flow",
    ],
  },
};

export function ModalLayer({ activeModal, state, dispatch, onClose }: ModalLayerProps) {
  if (!activeModal) {
    return null;
  }

  const modal =
    activeModal === "prompts" || activeModal === "settings" || activeModal === "mcp"
      ? null
      : modalContent[activeModal as Exclude<ModalId, "prompts" | "settings" | "mcp">];
  const modalTitle =
    activeModal === "prompts"
      ? "System Prompts"
      : activeModal === "settings"
        ? "Settings"
        : activeModal === "mcp"
          ? "Model Context Protocol"
          : modal!.title;

  return (
    <div className="modal active app-modal" role="presentation" onClick={onClose}>
      <section
        className={`modal-content${activeModal === "prompts" ? " modal-content-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="settings-header">
          <div className="app-modal-title">
            <p className="app-section-kicker">
              {activeModal === "prompts" || activeModal === "settings" || activeModal === "mcp"
                ? "Live Feature"
                : "Port target"}
            </p>
            <h2 id="modal-title">{modalTitle}</h2>
          </div>
          <button className="icon-btn app-modal-close" type="button" onClick={onClose} title="Close">
            ×
          </button>
        </div>

        {activeModal === "settings" ? (
          <SettingsModal state={state} dispatch={dispatch} onClose={onClose} />
        ) : activeModal === "mcp" ? (
          <McpModal state={state} dispatch={dispatch} />
        ) : activeModal === "prompts" ? (
          <PromptsModal state={state} dispatch={dispatch} />
        ) : (
          <>
            <p className="modal-copy">{modal!.body}</p>

            <ul className="status-list">
              {modal!.checkpoints.map((checkpoint) => (
                <li key={checkpoint}>{checkpoint}</li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
