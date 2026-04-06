import type { Dispatch } from "react";
import { getModelContextLabel } from "../../config/models";
import { getBaseUrl, providerOptions } from "../../config/providers";
import type { AppAction, AppState, ThemeName } from "../../types/app";

const themeOptions: Array<{ value: ThemeName; label: string }> = [
  { value: "terminal", label: "Terminal" },
  { value: "paper", label: "Paper" },
  { value: "signal", label: "Signal" },
];

interface SettingsModalProps {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  onClose: () => void;
}

export function SettingsModal({ state, dispatch, onClose }: SettingsModalProps) {
  const baseUrl = getBaseUrl(state.settings);
  const modelContext = getModelContextLabel(state.settings.model);
  const modelOptions = state.settingsRuntime.availableModels.length
    ? state.settingsRuntime.availableModels
    : [state.settings.model];

  return (
    <>
      <p className="modal-copy">
        Provider, base URL, API key, Hugging Face token, model, direct system prompt, and theme persist locally in the browser.
      </p>

      <form className="app-settings-grid">
        <div className="form-group">
          <label htmlFor="base-url-select">API Provider</label>
          <select
            id="base-url-select"
            aria-label="API Provider"
            value={state.settings.provider}
            onChange={(event) =>
              dispatch({
                type: "patchSettings",
                value: { provider: event.target.value as AppState["settings"]["provider"] },
              })
            }
          >
            {providerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {state.settings.provider === "custom" ? (
          <div className="form-group">
            <label htmlFor="custom-base-url">Custom Base URL</label>
            <input
              id="custom-base-url"
              aria-label="Custom Base URL"
              type="url"
              placeholder="https://example.com/v1"
              value={state.settings.customBaseUrl}
              onChange={(event) =>
                dispatch({
                  type: "patchSettings",
                  value: { customBaseUrl: event.target.value },
                })
              }
            />
          </div>
        ) : null}

        <div className="form-group">
          <label htmlFor="resolved-base-url">Resolved Base URL</label>
          <input id="resolved-base-url" type="text" value={baseUrl} readOnly />
        </div>

        <div className="form-group">
          <label htmlFor="api-key-update">API Key</label>
          <input
            id="api-key-update"
            aria-label="API Key"
            type="password"
            placeholder="Stored locally in your browser"
            value={state.settings.apiKey}
            onChange={(event) =>
              dispatch({
                type: "patchSettings",
                value: { apiKey: event.target.value },
              })
            }
          />
          {state.settingsRuntime.apiKeyDetection ? (
            <p className="app-inline-status" role="status">
              {state.settingsRuntime.apiKeyDetection}
            </p>
          ) : null}
        </div>

        <div className="form-group">
          <label htmlFor="hf-token-update">Hugging Face Token</label>
          <input
            id="hf-token-update"
            aria-label="Hugging Face Token"
            type="password"
            placeholder="hf_... used for router, Hub, and HF test lab"
            value={state.hfLab.hfToken}
            onChange={(event) =>
              dispatch({
                type: "patchHfLab",
                value: { hfToken: event.target.value },
              })
            }
          />
          <p className="app-inline-status" role="status">
            Central Hugging Face credential for router inference, Hub calls, and MCP-related validation.
          </p>
        </div>

        <div className="form-group">
          <div className="app-label-row">
            <label htmlFor="model-select">Model</label>
            <button
              className="btn secondary-btn app-inline-button"
              type="button"
              onClick={() => dispatch({ type: "requestModelRefresh" })}
              disabled={state.settingsRuntime.isRefreshingModels}
            >
              {state.settingsRuntime.isRefreshingModels ? "Reloading..." : "Reload Models"}
            </button>
          </div>
          <select
            id="model-select"
            aria-label="Model"
            value={state.settings.model}
            onChange={(event) =>
              dispatch({
                type: "patchSettings",
                value: { model: event.target.value },
              })
            }
          >
            {modelOptions.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
          {state.settingsRuntime.modelRefreshError ? (
            <p className="app-inline-status app-inline-status-error" role="status">
              {state.settingsRuntime.modelRefreshError}
            </p>
          ) : state.settingsRuntime.lastModelRefreshAt ? (
            <p className="app-inline-status" role="status">
              Last refreshed {new Date(state.settingsRuntime.lastModelRefreshAt).toLocaleString()}
            </p>
          ) : (
            <p className="app-inline-status" role="status">
              Model list updates automatically when provider settings change.
            </p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="context-window">Context Window</label>
          <input id="context-window" type="text" value={modelContext} readOnly />
        </div>

        <div className="form-group">
          <label htmlFor="theme-select">Theme</label>
          <select
            id="theme-select"
            aria-label="Theme"
            value={state.theme}
            onChange={(event) =>
              dispatch({
                type: "setTheme",
                theme: event.target.value as ThemeName,
              })
            }
          >
            {themeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="direct-system-prompt">Direct System Prompt</label>
          <textarea
            id="direct-system-prompt"
            aria-label="Direct System Prompt"
            rows={5}
            placeholder="Legacy-compatible standalone system prompt"
            value={state.settings.systemPrompt}
            onChange={(event) =>
              dispatch({
                type: "patchSettings",
                value: { systemPrompt: event.target.value },
              })
            }
          />
        </div>

        <div className="form-group">
          <label htmlFor="open-prompts-config">System Prompt</label>
          <button
            id="open-prompts-config"
            className="btn secondary-btn"
            type="button"
            aria-label="Open System Prompt Configuration"
            onClick={() => dispatch({ type: "openModal", modal: "prompts" })}
          >
            Open System Prompt Configuration
          </button>
        </div>

        <div className="form-group">
          <label htmlFor="open-hf-lab">Hugging Face Tests</label>
          <button
            id="open-hf-lab"
            className="btn secondary-btn"
            type="button"
            aria-label="Open Hugging Face Test Lab"
            onClick={() => dispatch({ type: "openModal", modal: "hfLab" })}
          >
            Open Hugging Face Test Lab
          </button>
        </div>
      </form>

      <div className="form-actions app-form-actions">
        <p className="app-modal-note">Changes are saved locally and applied immediately.</p>
        <button className="btn secondary-btn" type="button" onClick={onClose}>
          Close Settings
        </button>
      </div>
    </>
  );
}
