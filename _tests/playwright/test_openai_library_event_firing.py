"""
Test if updateAllSectionCounts is being called when checking the OpenAI Library
"""

import pytest
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def test_event_firing(page: Page, serve_hacka_re):
    """Test if count update function is called"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Inject monitoring code
    page.evaluate("""
        () => {
            window.updateAllSectionCountsCalled = 0;
            const original = window.PromptsListManager.updateAllSectionCounts;
            window.PromptsListManager.updateAllSectionCounts = function() {
                console.log('updateAllSectionCounts called!');
                window.updateAllSectionCountsCalled++;
                return original.apply(this, arguments);
            };
        }
    """)

    # Open prompts modal
    page.locator("#prompts-btn").click()
    page.wait_for_selector("#prompts-modal", state="visible")

    # Expand sections
    page.locator(".default-prompts-header").click()
    page.wait_for_timeout(300)
    page.locator(".nested-section-header:has-text('Advanced')").click()
    page.wait_for_timeout(500)

    # Reset counter
    page.evaluate("() => { window.updateAllSectionCountsCalled = 0; }")

    # Check the checkbox
    prompt_item = page.locator(".default-prompt-item").filter(
        has_text="OpenAI Prompt Library 2025"
    )
    checkbox = prompt_item.locator(".prompt-item-checkbox")

    print("Checking checkbox...")
    checkbox.check()
    page.wait_for_timeout(1000)

    # Check if the function was called
    calls = page.evaluate("() => window.updateAllSectionCountsCalled")
    print(f"updateAllSectionCounts was called {calls} times")

    # Check the count element
    count_element = page.locator("#prompt-section-count-advanced-section")
    count_text = count_element.text_content()
    count_display = count_element.evaluate("el => el.style.display")

    print(f"Count display: {count_display}")
    print(f"Count text: {count_text}")

    screenshot_with_markdown(
        page,
        "after_check",
        {
            "updateAllSectionCounts_calls": str(calls),
            "count_display": count_display,
            "count_text": count_text
        }
    )

    assert calls > 0, "updateAllSectionCounts was not called!"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
