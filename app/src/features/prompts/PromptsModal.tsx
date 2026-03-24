import { useEffect, useState, type Dispatch } from "react";
import {
  composeSystemPrompt,
  createPromptId,
  defaultPromptCatalog,
} from "./library";
import type { AppAction, AppState, PromptDraft } from "../../types/app";

interface PromptsModalProps {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

function PromptEditor({
  activePrompt,
  onCancel,
  onDelete,
  onSave,
}: {
  activePrompt: PromptDraft | null;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onSave: (prompt: PromptDraft) => void;
}) {
  const [name, setName] = useState(activePrompt?.name ?? "");
  const [content, setContent] = useState(activePrompt?.content ?? "");

  useEffect(() => {
    setName(activePrompt?.name ?? "");
    setContent(activePrompt?.content ?? "");
  }, [activePrompt]);

  function handleSave() {
    if (!name.trim() || !content.trim()) {
      return;
    }

    onSave({
      id: activePrompt?.id ?? createPromptId(),
      name: name.trim(),
      content: content.trim(),
    });
  }

  return (
    <section className="prompts-editor">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Editor</p>
          <h3>{activePrompt ? "Edit custom prompt" : "New custom prompt"}</h3>
        </div>
        {activePrompt ? (
          <button className="text-button" type="button" onClick={onCancel}>
            New Prompt
          </button>
        ) : null}
      </div>

      <label className="field">
        <span>Name</span>
        <input
          aria-label="Prompt Name"
          type="text"
          placeholder="Prompt name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <label className="field">
        <span>Content</span>
        <textarea
          className="prompt-editor-textarea"
          aria-label="Prompt Content"
          rows={10}
          placeholder="Write the prompt content here"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </label>

      <div className="modal-footer prompts-editor-actions">
        <p className="modal-footnote">New prompts are auto-enabled to match the legacy behavior.</p>
        <div className="button-row">
          {activePrompt ? (
            <button
              className="text-button danger-button"
              type="button"
              onClick={() => onDelete(activePrompt.id)}
            >
              Delete
            </button>
          ) : null}
          <button className="primary-button" type="button" onClick={handleSave}>
            {activePrompt ? "Save Changes" : "Save Prompt"}
          </button>
        </div>
      </div>
    </section>
  );
}

function renderPromptPreview(prompt: string) {
  if (!prompt) {
    return "No system prompt is currently composed.";
  }

  return prompt;
}

export function PromptsModal({ state, dispatch }: PromptsModalProps) {
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const activePrompt =
    state.prompts.customPrompts.find((prompt) => prompt.id === editingPromptId) ?? null;
  const systemPrompt = composeSystemPrompt(state.prompts);

  function handleSave(prompt: PromptDraft) {
    dispatch({ type: "saveCustomPrompt", prompt });
    setEditingPromptId(prompt.id);
  }

  function handleDelete(id: string) {
    dispatch({ type: "deleteCustomPrompt", id });
    setEditingPromptId(null);
  }

  async function handleCopyPreview() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(renderPromptPreview(systemPrompt));
  }

  return (
    <>
      <p className="modal-copy">
        The prompt library now composes a real system prompt for chat requests. The layout follows
        the legacy organization: custom prompts first, default prompts second, editor third.
      </p>

      <section className="prompt-preview-card">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Active System Prompt</p>
            <h3>Composed prompt preview</h3>
          </div>
          <button className="text-button" type="button" onClick={handleCopyPreview}>
            Copy
          </button>
        </div>
        <p className="modal-footnote">
          {state.prompts.selectedDefaultPromptIds.length + state.prompts.selectedCustomPromptIds.length}{" "}
          prompt selections active.
        </p>
        <pre className="prompt-preview">{renderPromptPreview(systemPrompt)}</pre>
      </section>

      <div className="prompts-layout">
        <section className="prompts-section">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Custom Prompts</p>
              <h3>Your Custom Prompts</h3>
            </div>
          </div>

          <div className="prompt-list">
            {state.prompts.customPrompts.length === 0 ? (
              <p className="empty-state">No custom prompts yet.</p>
            ) : (
              state.prompts.customPrompts.map((prompt) => {
                const isSelected = state.prompts.selectedCustomPromptIds.includes(prompt.id);
                const isEditing = editingPromptId === prompt.id;

                return (
                  <article
                    key={prompt.id}
                    className={`prompt-row${isEditing ? " is-editing" : ""}`}
                  >
                    <label className="prompt-toggle">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => dispatch({ type: "toggleCustomPrompt", id: prompt.id })}
                      />
                      <span>
                        <strong>{prompt.name}</strong>
                        <span>{prompt.content.slice(0, 120) || "No preview available."}</span>
                      </span>
                    </label>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setEditingPromptId(prompt.id)}
                    >
                      Edit
                    </button>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="prompts-section">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Default Prompts</p>
              <h3>Legacy Seed Prompts</h3>
            </div>
          </div>

          <div className="prompt-list">
            {defaultPromptCatalog.map((prompt) => {
              const isSelected = state.prompts.selectedDefaultPromptIds.includes(prompt.id);

              return (
                <article key={prompt.id} className="prompt-row">
                  <label className="prompt-toggle">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => dispatch({ type: "toggleDefaultPrompt", id: prompt.id })}
                    />
                    <span>
                      <strong>{prompt.name}</strong>
                      <span>{prompt.summary}</span>
                    </span>
                  </label>
                </article>
              );
            })}
          </div>
        </section>

        <PromptEditor
          activePrompt={activePrompt}
          onCancel={() => setEditingPromptId(null)}
          onDelete={handleDelete}
          onSave={handleSave}
        />
      </div>
    </>
  );
}
