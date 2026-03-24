import type { Dispatch } from "react";
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
  Exclude<ModalId, "prompts">,
  { title: string; body: string; checkpoints: string[] }
> = {
  settings: {
    title: "Settings",
    body: "This slot owns provider selection, API key storage, base URL management, model selection, and theme persistence.",
    checkpoints: [
      "Typed settings state and storage schema",
      "Provider/base URL controls",
      "Immediate local persistence",
    ],
  },
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
  mcp: {
    title: "Model Context Protocol",
    body: "MCP connection management, OAuth flows, and tool exposure into chat are not yet ported.",
    checkpoints: [
      "Connection model and storage",
      "OAuth and registration adapters",
      "Tool registry bridge",
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
    activeModal === "prompts" || activeModal === "settings"
      ? null
      : modalContent[activeModal as Exclude<ModalId, "prompts" | "settings">];
  const modalTitle =
    activeModal === "prompts" ? "System Prompts" : activeModal === "settings" ? "Settings" : modal!.title;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className={`modal-card${activeModal === "prompts" ? " modal-card-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="section-kicker">{activeModal === "prompts" ? "Live Feature" : "Port target"}</p>
            <h2 id="modal-title">{modalTitle}</h2>
          </div>
          <button className="icon-control modal-close" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        {activeModal === "settings" ? (
          <SettingsModal state={state} dispatch={dispatch} onClose={onClose} />
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
