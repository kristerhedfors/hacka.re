import { expect, test } from "@playwright/test";
import { closeModal, gotoApp, readStoredState } from "./fixtures";

test.describe("2.0 browser smoke", () => {
  test("renders the shell and core controls", async ({ page }) => {
    await gotoApp(page);

    await expect(page).toHaveTitle(/hacka\.re/i);
    await expect(page.getByRole("button", { name: /model context protocol/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /settings/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /cycle theme/i })).toBeVisible();
    await expect(page.getByLabel("Message input")).toBeVisible();
    await expect(page.locator("#chat-container")).toBeVisible();
    await expect(page.locator("#chat-messages .message")).toHaveCount(2);
    await expect(page.getByText(/0 prompts? \+ 1 MCP guide active/i)).toBeVisible();
  });

  test("persists settings locally and rehydrates after reload", async ({ page }) => {
    await page.route("https://proxy.example/v1/models", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [{ id: "gpt-4o" }, { id: "gpt-4.1-mini" }],
        }),
      });
    });

    await gotoApp(page);
    await page.getByRole("button", { name: /settings/i }).click();
    await page.getByLabel("API Provider").selectOption("custom");
    await page.getByLabel("Custom Base URL").fill("https://proxy.example/v1");
    await page.getByLabel("API Key").fill("sk-live-example");
    await page.getByLabel("Hugging Face Token").fill("hf_live_example");
    await page.getByLabel("Model", { exact: true }).selectOption("gpt-4o");
    await page.getByLabel("Theme", { exact: true }).selectOption("signal");
    await closeModal(page);

    await expect
      .poll(async () => {
        const saved = await readStoredState<{
          version: number;
          theme: string;
          settings: {
            provider: string;
            customBaseUrl: string;
            apiKey: string;
            model: string;
          };
        }>(page);
        return saved
          ? {
              version: saved.version,
              theme: saved.theme,
              provider: saved.settings.provider,
              customBaseUrl: saved.settings.customBaseUrl,
              apiKey: saved.settings.apiKey,
              model: saved.settings.model,
            }
          : null;
      })
      .toEqual({
        version: 6,
        theme: "signal",
        provider: "custom",
        customBaseUrl: "https://proxy.example/v1",
        apiKey: "sk-live-example",
        model: "gpt-4o",
      });

    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "signal");
    await expect(page.getByText("gpt-4o")).toBeVisible();
    await expect(page.getByText("custom")).toBeVisible();
    await expect(page.getByText("https://proxy.example/v1")).toBeVisible();
  });

  test("saves a custom prompt and includes it in the chat request", async ({ page }) => {
    let lastChatRequest: null | {
      model?: string;
      messages?: Array<{ role?: string; content?: string }>;
    } = null;

    await page.route("https://api.openai.com/v1/models", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [{ id: "gpt-5-nano" }, { id: "gpt-4o" }],
        }),
      });
    });

    await page.route("https://api.openai.com/v1/chat/completions", async (route) => {
      lastChatRequest = route.request().postDataJSON() as typeof lastChatRequest;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          choices: [{ message: { content: "Acknowledged." } }],
        }),
      });
    });

    await gotoApp(page);
    await page.getByRole("button", { name: /system prompts/i }).click();
    await page.getByLabel("Prompt Name").fill("Security reviewer");
    await page
      .getByLabel("Prompt Content")
      .fill("Review the code for security and trust-boundary failures.");
    await page.getByRole("button", { name: /save prompt/i }).click();

    await expect(page.getByText("Security reviewer")).toBeVisible();
    await closeModal(page);

    await page.getByRole("button", { name: /settings/i }).click();
    await page.getByLabel("API Key").fill("sk-test-abcdefghijklmnopqrstuvwxyz");
    await page.getByRole("button", { name: "Close Settings" }).click();

    await page.getByLabel("Message input").fill("Use the active prompt.");
    await page.getByRole("button", { name: /^send$/i }).click();

    await expect(page.getByText("Acknowledged.")).toBeVisible();
    await expect.poll(() => lastChatRequest?.messages?.length ?? 0).toBeGreaterThan(0);
    expect(lastChatRequest?.messages?.[0]?.role).toBe("system");
    expect(lastChatRequest?.messages?.at(-1)).toMatchObject({
      role: "user",
      content: "Use the active prompt.",
    });
    expect(lastChatRequest?.messages?.[0]?.content).toContain(
      "Review the code for security and trust-boundary failures.",
    );

    const saved = await readStoredState<{
      prompts: {
        customPrompts: Array<{ id: string; name: string }>;
        selectedCustomPromptIds: string[];
      };
    }>(page);
    expect(saved?.prompts.customPrompts).toHaveLength(1);
    expect(saved?.prompts.selectedCustomPromptIds).toContain(saved?.prompts.customPrompts[0]?.id);
  });

  test("opens the Hugging Face lab and applies the router preset", async ({ page }) => {
    await gotoApp(page);

    await page.getByRole("button", { name: /settings/i }).click();
    await page.getByLabel("Hugging Face Token").fill("hf_test_token");
    await page.getByRole("button", { name: /open hugging face test lab/i }).click();
    await expect(page.getByRole("heading", { name: /hugging Face Lab/i })).toBeVisible();

    await page.getByLabel("Inference Model").fill("Qwen/Qwen2.5-Coder-32B-Instruct:fireworks-ai");
    await page.getByLabel("HF OAuth with PKCE status").selectOption("validated");
    await page.getByRole("button", { name: /apply router preset to chat settings/i }).click();

    await expect(page.getByText("Qwen/Qwen2.5-Coder-32B-Instruct:fireworks-ai")).toBeVisible();
    await expect(page.getByText("https://router.huggingface.co/v1")).toBeVisible();

    const saved = await readStoredState<{
      version: number;
      settings: {
        provider: string;
        customBaseUrl: string;
        apiKey: string;
        model: string;
      };
      hfLab: {
        checks: Record<string, string>;
      };
    }>(page);

    expect(saved?.version).toBe(6);
    expect(saved?.settings.provider).toBe("custom");
    expect(saved?.settings.customBaseUrl).toBe("https://router.huggingface.co/v1");
    expect(saved?.settings.apiKey).toBe("hf_test_token");
    expect(saved?.settings.model).toBe("Qwen/Qwen2.5-Coder-32B-Instruct:fireworks-ai");
    expect(saved?.hfLab.checks["oauth-pkce"]).toBe("validated");
  });
});
