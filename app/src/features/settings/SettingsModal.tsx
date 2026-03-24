import type { Dispatch } from "react";
import { modelOptions, getModelContextLabel } from "../../config/models";
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

  return (
    <>
      <p className="modal-copy">
        Provider, base URL, API key, model, and theme persist locally in the browser.
      </p>

      <form className="settings-grid">
        <label className="field">
          <span>API Provider</span>
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
        </label>

        {state.settings.provider === "custom" ? (
          <label className="field">
            <span>Custom Base URL</span>
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
          </label>
        ) : null}

        <label className="field">
          <span>Resolved Base URL</span>
          <input type="text" value={baseUrl} readOnly />
        </label>

        <label className="field">
          <span>API Key</span>
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
        </label>

        <label className="field">
          <span>Model</span>
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
        </label>

        <label className="field">
          <span>Context Window</span>
          <input type="text" value={modelContext} readOnly />
        </label>

        <label className="field">
          <span>Theme</span>
          <select
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
        </label>
      </form>

      <div className="modal-footer">
        <p className="modal-footnote">Changes are saved locally and applied immediately.</p>
        <button className="primary-button" type="button" onClick={onClose}>
          Close Settings
        </button>
      </div>
    </>
  );
}
