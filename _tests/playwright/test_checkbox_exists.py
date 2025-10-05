"""
Check if checkbox exists and has event handler
"""

import pytest
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal


def test_checkbox_exists(page: Page, serve_hacka_re):
    """Test if checkbox element exists"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    page.locator("#prompts-btn").click()
    page.wait_for_selector("#prompts-modal", state="visible")

    page.locator(".default-prompts-header").click()
    page.wait_for_timeout(300)
    page.locator(".nested-section-header:has-text('Advanced')").click()
    page.wait_for_timeout(500)

    # Check if the prompt item exists
    prompt_info = page.evaluate("""
        () => {
            const items = document.querySelectorAll('.default-prompt-item');
            const results = [];

            items.forEach(item => {
                const id = item.getAttribute('data-prompt-id');
                const checkbox = item.querySelector('input[type="checkbox"]');
                const hasChangeListener = checkbox ? checkbox.onchange !== null : false;

                results.push({
                    id,
                    hasCheckbox: !!checkbox,
                    hasChangeListener,
                    checkboxId: checkbox ? checkbox.id : null
                });
            });

            return results;
        }
    """)

    print("\nPrompt items:")
    for item in prompt_info:
        print(f"  {item['id']}: hasCheckbox={item['hasCheckbox']}, hasListener={item['hasChangeListener']}")

    # Find OpenAI Library item
    openai_item = next((item for item in prompt_info if 'openai-prompt-library' in item['id']), None)
    print(f"\nOpenAI Prompt Library item: {openai_item}")

    assert openai_item is not None, "OpenAI Prompt Library item not found"
    assert openai_item['hasCheckbox'], "Checkbox not found"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
