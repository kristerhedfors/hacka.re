import { expect, test } from "@playwright/test";
import { gotoApp } from "./fixtures";

const openAiApiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
const openAiModel = process.env.OPENAI_API_MODEL?.trim() || "o4-mini";

test.describe("OpenAI live browser validation", () => {
  test.skip(!openAiApiKey, "OPENAI_API_KEY is required for live OpenAI e2e coverage.");

  test("fills settings, selects a model, and completes a real chat request", async ({ page }) => {
    await gotoApp(page);

    await page.getByRole("button", { name: /settings/i }).click();
    await page.getByLabel("API Provider").selectOption("openai");
    await page.getByLabel("API Key").fill(openAiApiKey);

    const modelSelect = page.getByLabel("Model", { exact: true });
    await expect(modelSelect).toBeVisible();
    await modelSelect.selectOption(openAiModel);
    await page.getByRole("button", { name: "Close Settings" }).click();

    await page.getByLabel("Message input").fill(
      "Reply with exactly the word PONG and nothing else.",
    );
    await page.getByRole("button", { name: /^send$/i }).click();

    await expect(page.getByText(/\bPONG\b/i)).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('[role="alert"]')).toHaveCount(0);
  });
});
