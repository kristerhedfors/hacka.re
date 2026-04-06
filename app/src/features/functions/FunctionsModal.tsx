import { useState } from "react";
import type { Dispatch } from "react";
import { getOrderedFunctions } from "./library";
import type { AppAction, AppState, FunctionDraft } from "../../types/app";

interface FunctionsModalProps {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

const emptyDraft: FunctionDraft = {
  name: "",
  code: "",
};

export function FunctionsModal({ state, dispatch }: FunctionsModalProps) {
  const [draft, setDraft] = useState<FunctionDraft>(emptyDraft);
  const [previousName, setPreviousName] = useState<string | undefined>(undefined);
  const [collectionName, setCollectionName] = useState("");
  const functions = getOrderedFunctions(state.functions);

  function handleSave() {
    const name = draft.name.trim();
    const code = draft.code.trim();

    if (!name || !code) {
      return;
    }

    dispatch({
      type: "saveFunction",
      functionDraft: {
        name,
        code,
      },
      previousName,
      collectionName: collectionName.trim() || undefined,
    });
    setDraft(emptyDraft);
    setPreviousName(undefined);
    setCollectionName("");
  }

  return (
    <>
      <p className="modal-copy">
        User functions and legacy default-function selections are now persisted in the 2.0 shell so
        encrypted share links can round-trip the same function library structure as the legacy app.
      </p>

      <div className="app-settings-grid">
        <div className="form-group">
          <label htmlFor="function-name">Function Name</label>
          <input
            id="function-name"
            aria-label="Function Name"
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          />
        </div>

        <div className="form-group">
          <label htmlFor="function-collection">Collection Name</label>
          <input
            id="function-collection"
            aria-label="Collection Name"
            placeholder="Optional legacy collection label"
            value={collectionName}
            onChange={(event) => setCollectionName(event.target.value)}
          />
        </div>

        <div className="form-group app-span-full">
          <label htmlFor="function-code">Function Code</label>
          <textarea
            id="function-code"
            aria-label="Function Code"
            rows={12}
            placeholder={"function example() {\n  return \"ok\";\n}"}
            value={draft.code}
            onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
          />
        </div>

        <div className="form-group">
          <label htmlFor="default-function-ids">Legacy Default Function IDs</label>
          <input
            id="default-function-ids"
            aria-label="Legacy Default Function IDs"
            placeholder="collection:function,another:function"
            value={state.functions.selectedDefaultFunctionIds.join(",")}
            onChange={(event) =>
              dispatch({
                type: "setSelectedDefaultFunctionIds",
                ids: event.target.value
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>

        <div className="form-group">
          <label htmlFor="default-function-collection-ids">Legacy Default Function Collection IDs</label>
          <input
            id="default-function-collection-ids"
            aria-label="Legacy Default Function Collection IDs"
            placeholder="math-utilities,rc4"
            value={state.functions.selectedDefaultFunctionCollectionIds.join(",")}
            onChange={(event) =>
              dispatch({
                type: "setSelectedDefaultFunctionCollectionIds",
                ids: event.target.value
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      </div>

      <div className="form-actions app-form-actions">
        <button className="btn secondary-btn" type="button" onClick={handleSave}>
          {previousName ? "Update Function" : "Save Function"}
        </button>
      </div>

      <ul className="status-list">
        {functions.length ? (
          functions.map((entry) => (
            <li key={entry.name}>
              <strong>{entry.name}</strong>
              {state.functions.functionCollections[entry.name]
                ? ` · ${state.functions.functionCollections[entry.name]}`
                : ""}
              <button
                className="btn secondary-btn app-inline-button"
                type="button"
                onClick={() => {
                  setDraft(entry);
                  setPreviousName(entry.name);
                  setCollectionName(state.functions.functionCollections[entry.name] ?? "");
                }}
              >
                Edit
              </button>
              <button
                className="btn secondary-btn app-inline-button"
                type="button"
                onClick={() => dispatch({ type: "deleteFunction", name: entry.name })}
              >
                Delete
              </button>
            </li>
          ))
        ) : (
          <li>No user functions saved yet.</li>
        )}
      </ul>
    </>
  );
}
