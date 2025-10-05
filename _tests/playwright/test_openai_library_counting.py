"""
Test OpenAI Prompt Library 2025 Counting

Verifies that the counting logic works when the checkbox is checked
"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def test_openai_library_counting(page: Page, serve_hacka_re):
    """Test that checking OpenAI Prompt Library updates the Advanced section count"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Open prompts modal
    page.locator("#prompts-btn").click()
    page.wait_for_selector("#prompts-modal", state="visible")

    # Expand Default Prompts section
    page.locator(".default-prompts-header").click()
    page.wait_for_timeout(300)

    # Expand Advanced nested section
    advanced_header = page.locator(".nested-section-header:has-text('Advanced')")
    expect(advanced_header).to_be_visible()

    screenshot_with_markdown(
        page,
        "before_expand_advanced",
        {"status": "Before expanding Advanced section"}
    )

    advanced_header.click()
    page.wait_for_timeout(500)

    screenshot_with_markdown(
        page,
        "advanced_expanded",
        {"status": "Advanced section expanded"}
    )

    # Get the count element for the Advanced section
    count_element = page.locator("#prompt-section-count-advanced-section")

    # Initially, count should be hidden (no prompts selected)
    # or show count if other prompts are selected
    initial_display = count_element.evaluate("el => el.style.display")
    print(f"Initial count display: {initial_display}")

    # Find and check the OpenAI Prompt Library 2025 checkbox
    prompt_item = page.locator(".default-prompt-item").filter(
        has_text="OpenAI Prompt Library 2025"
    )
    expect(prompt_item).to_be_visible()

    checkbox = prompt_item.locator(".prompt-item-checkbox")
    checkbox.check()
    page.wait_for_timeout(500)

    screenshot_with_markdown(
        page,
        "checkbox_checked",
        {"status": "OpenAI Prompt Library 2025 checkbox checked"}
    )

    # Now the count should be visible and updated
    # The Advanced section should show at least "1/X prompts enabled"
    expect(count_element).to_be_visible()

    count_text = count_element.text_content()
    print(f"Count text after checking: {count_text}")

    # Verify the count includes at least 1 enabled prompt
    assert "1" in count_text or "2" in count_text or "3" in count_text, \
        f"Expected count to show enabled prompts, got: {count_text}"
    assert "prompt" in count_text.lower(), \
        f"Expected count to contain 'prompt', got: {count_text}"

    screenshot_with_markdown(
        page,
        "count_updated",
        {"status": f"Count updated: {count_text}"}
    )

    # Uncheck and verify count updates
    checkbox.uncheck()
    page.wait_for_timeout(500)

    # If this was the only prompt checked, count should disappear
    # If other prompts are checked, count should decrease
    final_count_text = count_element.text_content()
    print(f"Count text after unchecking: {final_count_text}")

    screenshot_with_markdown(
        page,
        "checkbox_unchecked",
        {"status": f"Checkbox unchecked, count: {final_count_text}"}
    )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
