import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

const storageKey = "hackare_next_shell_v1";

describe("App shell", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the shell and core controls", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: /hacka\.re/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /model context protocol/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /settings/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /cycle theme/i })).toBeVisible();
    expect(screen.getByLabelText(/message input/i)).toBeVisible();
    expect(screen.getByText(/0 prompt.*1 MCP guide active/i)).toBeVisible();
  });

  it("hydrates persisted theme and settings from local storage", async () => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 1,
        theme: "paper",
        settings: {
          provider: "custom",
          customBaseUrl: "https://example.test/v1",
          apiKey: "sk-test",
          model: "gpt-4o",
        },
      }),
    );

    render(<App />);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("paper");
    });

    expect(screen.getByText("gpt-4o")).toBeVisible();
    expect(screen.getByText("custom")).toBeVisible();
    expect(screen.getByText("https://example.test/v1")).toBeVisible();
  });

  it("updates settings and persists them", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "fetch").mockRejectedValue(new Error("offline"));
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: /settings/i })[0]);

    const providerSelect = screen.getByLabelText(/api provider/i);
    await user.selectOptions(providerSelect, "custom");

    const customBaseUrlInput = await screen.findByLabelText(/custom base url/i);
    await user.type(customBaseUrlInput, "https://proxy.example/v1");

    const apiKeyInput = screen.getByLabelText(/api key/i);
    await user.type(apiKeyInput, "sk-live-example");

    const modelSelect = screen.getByLabelText(/^model$/i);
    await user.selectOptions(modelSelect, "gpt-4o");

    const themeSelect = screen.getByLabelText(/^theme$/i);
    await user.selectOptions(themeSelect, "signal");

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}");
      expect(saved.theme).toBe("signal");
      expect(saved.settings.provider).toBe("custom");
      expect(saved.settings.customBaseUrl).toContain("https://proxy.example/v1");
      expect(saved.settings.apiKey).toContain("sk-live-example");
      expect(saved.settings.model).toBe("gpt-4o");
      expect(saved.version).toBe(4);
      expect(saved.mcp.servers.huggingface.enabled).toBe(true);
    });

    expect(document.documentElement.dataset.theme).toBe("signal");
    expect(screen.getAllByDisplayValue("https://proxy.example/v1")).toHaveLength(2);
  });

  it("saves and auto-enables a custom prompt", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /system prompts/i }));
    await user.type(screen.getByLabelText(/prompt name/i), "Security reviewer");
    await user.type(
      screen.getByLabelText(/prompt content/i),
      "Review the code for security and trust-boundary failures.",
    );
    await user.click(screen.getByRole("button", { name: /save prompt/i }));

    expect(screen.getByText("Security reviewer")).toBeVisible();
    expect(screen.getAllByText(/security and trust-boundary failures/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}");
      expect(saved.version).toBe(4);
      expect(saved.prompts.customPrompts).toHaveLength(1);
      expect(saved.prompts.selectedCustomPromptIds).toContain(saved.prompts.customPrompts[0].id);
    });
  });

  it("renders the Hugging Face MCP server modal and persists local server settings", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /model context protocol/i }));

    expect(screen.getByRole("heading", { name: /Hugging Face MCP Server/i })).toBeVisible();
    expect(screen.getByDisplayValue("https://huggingface.co/mcp")).toBeVisible();
    expect(screen.getAllByText(/Spaces Semantic Search/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Run and Manage Jobs/i).length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText(/hugging face access token/i), "hf_test_token");
    await user.click(screen.getByRole("checkbox", { name: /include the hugging face mcp guide/i }));

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}");
      expect(saved.version).toBe(4);
      expect(saved.mcp.servers.huggingface.accessToken).toContain("hf_test_token");
      expect(saved.mcp.servers.huggingface.promptEnabled).toBe(false);
    });
  });

  it("auto-detects the provider from the API key and exposes the prompts shortcut", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: "moonshotai/kimi-k2-instruct" }, { id: "llama-3.3-70b-versatile" }],
      }),
    } as Response);

    render(<App />);

    await user.click(screen.getByRole("button", { name: /settings/i }));
    await user.type(screen.getByLabelText(/api key/i), "gsk_12345678901234567890123456789012");

    await waitFor(() => {
      expect(screen.getByLabelText(/api provider/i)).toHaveValue("groq");
    });

    expect(screen.getByText(/GroqCloud API key detected and auto-selected/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /open system prompt configuration/i })).toBeVisible();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.groq.com/openai/v1/models",
        expect.objectContaining({
          method: "GET",
        }),
      );
    });
  });

  it("reloads the available model list on demand", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: "gpt-5" }, { id: "gpt-4.1-mini" }],
      }),
    } as Response);

    render(<App />);

    await user.click(screen.getByRole("button", { name: /settings/i }));
    await user.type(screen.getByLabelText(/api key/i), "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890ABCDE");
    await user.click(screen.getByRole("button", { name: /reload models/i }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    });

    expect(screen.getByRole("option", { name: "gpt-4.1-mini" })).toBeVisible();
  });

  it("includes the composed system prompt in chat requests", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Acknowledged." } }],
      }),
    } as Response);

    render(<App />);

    await user.click(screen.getByRole("button", { name: /system prompts/i }));
    await user.click(screen.getByRole("checkbox", { name: /README\.md/i }));
    await user.click(screen.getByRole("button", { name: "×" }));
    await user.click(screen.getByRole("button", { name: /settings/i }));
    await user.type(screen.getByLabelText(/api key/i), "sk-test");
    await user.click(screen.getByRole("button", { name: "Close Settings" }));
    await user.type(screen.getByLabelText(/message input/i), "Use the active prompt.");
    await user.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const request = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(request.messages[0].role).toBe("system");
    expect(request.messages[0].content).toContain("Privacy-first AI chat interface");
    expect(request.messages[0].content).toContain("Hugging Face MCP server guide loaded");
  });

  it("submits the composer on enter", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Sent from enter." } }],
      }),
    } as Response);

    render(<App />);

    await user.click(screen.getByRole("button", { name: /settings/i }));
    await user.type(screen.getByLabelText(/api key/i), "sk-test");
    await user.click(screen.getByRole("button", { name: "Close Settings" }));

    const input = screen.getByLabelText(/message input/i);
    await user.type(input, "Send with enter");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(input).toHaveValue("");
  });

  it("keeps a newline on shift-enter without submitting", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Should not send." } }],
      }),
    } as Response);

    render(<App />);

    const input = screen.getByLabelText(/message input/i);
    await user.type(input, "First line");
    await user.keyboard("{Shift>}{Enter}{/Shift}Second line");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(input).toHaveValue("First line\nSecond line");
  });
});
