"""
Manually trigger checkbox change and inspect what happens
"""

import pytest
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal


def test_manual_trigger(page: Page, serve_hacka_re):
    """Manually trigger checkbox and trace execution"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    page.locator("#prompts-btn").click()
    page.wait_for_selector("#prompts-modal", state="visible")

    page.locator(".default-prompts-header").click()
    page.wait_for_timeout(300)
    page.locator(".nested-section-header:has-text('Advanced')").click()
    page.wait_for_timeout(500)

    # Find the checkbox element directly
    checkbox_info = page.evaluate("""
        () => {
            const item = document.querySelector('[data-prompt-id="openai-prompt-library-2025"]');
            if (!item) return { error: 'Item not found' };

            const checkbox = item.querySelector('input[type="checkbox"]');
            if (!checkbox) return { error: 'Checkbox not found' };

            return {
                exists: true,
                checked: checkbox.checked,
                disabled: checkbox.disabled,
                id: checkbox.id,
                name: checkbox.name
            };
        }
    """)

    print("Checkbox info:", checkbox_info)

    # Try to check it and see what happens
    result = page.evaluate("""
        () => {
            const item = document.querySelector('[data-prompt-id="openai-prompt-library-2025"]');
            const checkbox = item.querySelector('input[type="checkbox"]');

            // Check initial state
            const beforeState = {
                checked: checkbox.checked,
                selectedIds: window.DefaultPromptsService.getSelectedDefaultPromptIds()
            };

            // Click the checkbox
            checkbox.click();

            // Wait a moment
            return new Promise(resolve => {
                setTimeout(() => {
                    const afterState = {
                        checked: checkbox.checked,
                        selectedIds: window.DefaultPromptsService.getSelectedDefaultPromptIds(),
                        countElementDisplay: document.getElementById('prompt-section-count-advanced-section').style.display,
                        countElementText: document.getElementById('prompt-section-count-advanced-section').textContent
                    };

                    resolve({ before: beforeState, after: afterState });
                }, 500);
            });
        }
    """)

    print("\nBefore click:", result['before'])
    print("After click:", result['after'])

    # Check if it was added to selected IDs
    assert 'openai-prompt-library-2025' in result['after']['selectedIds'], \
        "OpenAI Library was not added to selected IDs!"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
