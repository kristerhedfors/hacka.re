import { expect, type Page } from "@playwright/test";

export const storageKey = "hackare_next_shell_v1";

export async function gotoApp(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /hacka\.re/i })).toBeVisible();
}

export async function readStoredState<T>(page: Page): Promise<T | null> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, storageKey);
}

export async function closeModal(page: Page) {
  await page.locator(".app-modal-close").click();
}
