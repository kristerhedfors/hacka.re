import { expect, test } from "@playwright/test";
import { gotoApp, readStoredState } from "./fixtures";

const huggingFacePat = process.env.HUGGINGFACE_PAT?.trim() ?? "";

test.describe("Hugging Face live browser validation", () => {
  test.skip(!huggingFacePat, "HUGGINGFACE_PAT is required for live Hugging Face e2e coverage.");

  test("runs browser-side Hugging Face capability probes with the configured token", async ({ page }) => {
    await gotoApp(page);

    await page.getByRole("button", { name: /settings/i }).click();
    await page.getByLabel("Hugging Face Token").fill(huggingFacePat);
    await page.getByRole("button", { name: /open hugging face test lab/i }).click();

    await page.getByLabel("Primary Gradio Space").fill("abidlabs/en2fr");

    const checks = [
      { label: "HF OAuth with PKCE status", expected: "validated" },
      { label: "Inference Router Browser Calls status", expected: "validated" },
      { label: "Cold-Start Retry Logic status", expected: "validated" },
      { label: "Hub CRUD from Browser status", expected: "validated" },
      { label: "Gradio Space Invocation status", expected: "validated" },
      { label: "Dynamic Space Tools status", expected: "validated" },
      { label: "Mounted Files and Scope status", expected: "validated" },
    ] as const;

    for (const check of checks) {
      const runButton = page
        .getByLabel(check.label)
        .locator("..")
        .locator("..")
        .getByRole("button", { name: /run test/i });

      await runButton.click();
      await expect(page.getByLabel(check.label)).toHaveValue(check.expected, { timeout: 20_000 });
    }

    const saved = await readStoredState<{
      hfLab: {
        hfToken: string;
        checks: Record<string, string>;
        gradioSpaceId: string;
      };
    }>(page);

    expect(saved?.hfLab.hfToken).toBe(huggingFacePat);
    expect(saved?.hfLab.gradioSpaceId).toBe("abidlabs/en2fr");
    expect(saved?.hfLab.checks["router-cors"]).toBe("validated");
    expect(saved?.hfLab.checks["hub-crud"]).toBe("validated");
    expect(saved?.hfLab.checks["gradio-client"]).toBe("validated");
  });
});
