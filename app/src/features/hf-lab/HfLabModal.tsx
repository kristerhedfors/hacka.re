import { useState } from "react";
import type { Dispatch } from "react";
import { hfArchitecturePhases, hfCapabilityCatalog } from "./catalog";
import { runHfCapabilityTest } from "./runtime";
import type { AppAction, AppState, HfCapabilityCheckId, HfCapabilityStatus } from "../../types/app";

interface HfLabModalProps {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

const capabilityStatuses: HfCapabilityStatus[] = ["planned", "validating", "validated", "blocked"];

export function HfLabModal({ state, dispatch }: HfLabModalProps) {
  const [runningCheckId, setRunningCheckId] = useState<string | null>(null);
  const [resultMessages, setResultMessages] = useState<Record<string, string>>({});
  const validatedCount = hfCapabilityCatalog.filter(
    (capability) => state.hfLab.checks[capability.id] === "validated",
  ).length;

  function patchField<Key extends keyof AppState["hfLab"]>(key: Key, value: AppState["hfLab"][Key]) {
    dispatch({
      type: "patchHfLab",
      value: { [key]: value } as Partial<AppState["hfLab"]>,
    });
  }

  async function runSingleCheck(checkId: HfCapabilityCheckId) {
    setRunningCheckId(checkId);
    dispatch({ type: "setHfCapabilityStatus", checkId, status: "validating" });
    const result = await runHfCapabilityTest(checkId, state.hfLab);
    dispatch({ type: "setHfCapabilityStatus", checkId, status: result.status });
    setResultMessages((current) => ({ ...current, [checkId]: result.message }));
    setRunningCheckId(null);
  }

  async function runAllChecks() {
    setRunningCheckId("all");

    for (const capability of hfCapabilityCatalog) {
      dispatch({ type: "setHfCapabilityStatus", checkId: capability.id, status: "validating" });
      const result = await runHfCapabilityTest(capability.id, state.hfLab);
      dispatch({ type: "setHfCapabilityStatus", checkId: capability.id, status: result.status });
      setResultMessages((current) => ({ ...current, [capability.id]: result.message }));
    }

    setRunningCheckId(null);
  }

  return (
    <>
      <p className="modal-copy">
        This lab turns the Hugging Face research into a concrete integration track for hacka.re 2.0.
        It keeps the target architecture, switching profile, and validation matrix in one browser-native
        surface so we can iterate toward a full Hugging Face-backed agent stack.
      </p>

      <section className="app-panel-section">
        <div className="app-label-row">
          <div>
            <p className="app-section-kicker">Execution Profile</p>
            <h3>Switch models, runtime, and file scope from one place</h3>
          </div>
          <span className="app-inline-status">{validatedCount}/{hfCapabilityCatalog.length} validated</span>
        </div>

        <div className="app-settings-grid">
          <div className="form-group">
            <label htmlFor="hf-central-token">Hugging Face Token</label>
            <input
              id="hf-central-token"
              type="password"
              placeholder="hf_... central token from Settings"
              value={state.hfLab.hfToken}
              onChange={(event) => patchField("hfToken", event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="hf-auth-strategy">Auth Strategy</label>
            <select
              id="hf-auth-strategy"
              value={state.hfLab.authStrategy}
              onChange={(event) => patchField("authStrategy", event.target.value as AppState["hfLab"]["authStrategy"])}
            >
              <option value="oauth-pkce">OAuth PKCE</option>
              <option value="user-token">User token</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="hf-router-url">Inference Route</label>
            <input
              id="hf-router-url"
              type="text"
              value={state.hfLab.inferenceProviderRoute}
              onChange={(event) => patchField("inferenceProviderRoute", event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="hf-model">Inference Model</label>
            <input
              id="hf-model"
              type="text"
              value={state.hfLab.inferenceModel}
              onChange={(event) => patchField("inferenceModel", event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="hf-execution-backend">Execution Backend</label>
            <select
              id="hf-execution-backend"
              value={state.hfLab.executionBackend}
              onChange={(event) =>
                patchField("executionBackend", event.target.value as AppState["hfLab"]["executionBackend"])
              }
            >
              <option value="docker-space">Docker Space</option>
              <option value="gradio-space">Gradio Space</option>
              <option value="e2b">E2B</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="hf-execution-space">Execution Space</label>
            <input
              id="hf-execution-space"
              type="text"
              value={state.hfLab.executionSpaceId}
              onChange={(event) => patchField("executionSpaceId", event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="hf-gradio-space">Primary Gradio Space</label>
            <input
              id="hf-gradio-space"
              type="text"
              value={state.hfLab.gradioSpaceId}
              onChange={(event) => patchField("gradioSpaceId", event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="hf-mounted-repo">Mounted Repo</label>
            <input
              id="hf-mounted-repo"
              type="text"
              value={state.hfLab.mountedRepoId}
              onChange={(event) => patchField("mountedRepoId", event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="hf-mounted-path">Mounted Path</label>
            <input
              id="hf-mounted-path"
              type="text"
              value={state.hfLab.mountedPath}
              onChange={(event) => patchField("mountedPath", event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="hf-mount-strategy">Mount Strategy</label>
            <select
              id="hf-mount-strategy"
              value={state.hfLab.mountStrategy}
              onChange={(event) => patchField("mountStrategy", event.target.value as AppState["hfLab"]["mountStrategy"])}
            >
              <option value="hub-repo">Hub repo</option>
              <option value="upload">Direct upload</option>
              <option value="session-files">Session files</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="hf-scope-mode">Scope Mode</label>
            <select
              id="hf-scope-mode"
              value={state.hfLab.scopeMode}
              onChange={(event) => patchField("scopeMode", event.target.value as AppState["hfLab"]["scopeMode"])}
            >
              <option value="user-oauth">User OAuth</option>
              <option value="space-owned">Space-owned</option>
              <option value="ephemeral">Ephemeral</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="hf-mcp-transport">MCP Transport</label>
            <select
              id="hf-mcp-transport"
              value={state.hfLab.mcpTransport}
              onChange={(event) =>
                patchField("mcpTransport", event.target.value as AppState["hfLab"]["mcpTransport"])
              }
            >
              <option value="browser-direct">Browser direct</option>
              <option value="space-proxy">Space proxy</option>
              <option value="client-loop">Client loop</option>
            </select>
          </div>
        </div>

        <div className="app-form-actions">
          <p className="app-inline-status">
            Recommended default: OAuth PKCE + HF router in browser + Docker Space executor + explicit mounted repo scope.
          </p>
          <button
            className="btn secondary-btn app-inline-button"
            type="button"
            onClick={() =>
              dispatch({
                type: "patchSettings",
                value: {
                  provider: "custom",
                  customBaseUrl: state.hfLab.inferenceProviderRoute,
                  apiKey: state.hfLab.hfToken.trim() || state.settings.apiKey,
                  model: state.hfLab.inferenceModel,
                },
              })
            }
          >
            Apply router preset to chat settings
          </button>
        </div>
      </section>

      <section className="app-panel-section">
        <div className="app-label-row">
          <div>
            <p className="app-section-kicker">Phased Delivery</p>
            <h3>Implementation sequence for full integration</h3>
          </div>
          <span className="app-inline-status">Plan anchored to this lab</span>
        </div>

        <div className="hf-phase-grid">
          {hfArchitecturePhases.map((phase) => (
            <article key={phase.id} className="hf-phase-card">
              <h4>{phase.title}</h4>
              <p>{phase.summary}</p>
              <ul className="status-list">
                {phase.deliverables.map((deliverable) => (
                  <li key={deliverable}>{deliverable}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="app-panel-section">
        <div className="app-label-row">
          <div>
            <p className="app-section-kicker">Assumption Matrix</p>
            <h3>Track validation status for every major capability</h3>
          </div>
          <div className="hf-test-actions">
            <span className="app-inline-status">Update after each live HF test</span>
            <button
              className="btn secondary-btn app-inline-button"
              type="button"
              onClick={() => void runAllChecks()}
              disabled={runningCheckId !== null}
            >
              {runningCheckId === "all" ? "Running all..." : "Run All Tests"}
            </button>
          </div>
        </div>

        <div className="hf-capability-list">
          {hfCapabilityCatalog.map((capability) => (
            <article key={capability.id} className="hf-capability-card">
              <div className="app-label-row">
                <div>
                  <h4>{capability.title}</h4>
                  <p className="app-inline-status">{capability.summary}</p>
                </div>
                <select
                  aria-label={`${capability.title} status`}
                  value={state.hfLab.checks[capability.id]}
                  onChange={(event) =>
                    dispatch({
                      type: "setHfCapabilityStatus",
                      checkId: capability.id,
                      status: event.target.value as HfCapabilityStatus,
                    })
                  }
                >
                  {capabilityStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="hf-capability-actions">
                <button
                  className="btn secondary-btn app-inline-button"
                  type="button"
                  onClick={() => void runSingleCheck(capability.id)}
                  disabled={runningCheckId !== null}
                >
                  {runningCheckId === capability.id ? "Running..." : "Run Test"}
                </button>
              </div>
              <p><strong>Validation target:</strong> {capability.validationTarget}</p>
              <p><strong>Recommended path:</strong> {capability.recommendedPath}</p>
              {resultMessages[capability.id] ? (
                <p className="app-inline-status" role="status">
                  {resultMessages[capability.id]}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="app-panel-section">
        <div className="app-label-row">
          <div>
            <p className="app-section-kicker">Working Notes</p>
            <h3>Capture live test outcomes and blockers</h3>
          </div>
          <span className="app-inline-status">Stored only in this browser</span>
        </div>
        <textarea
          id="hf-lab-notes"
          className="hf-notes"
          rows={8}
          placeholder="Record live test URLs, CORS findings, Space names, build times, and blockers."
          value={state.hfLab.notes}
          onChange={(event) => patchField("notes", event.target.value)}
        />
      </section>
    </>
  );
}
