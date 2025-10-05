"""
Test OpenAI Prompt Library 2025 Modal Behavior

Verifies that clicking the prompt name opens the viewer modal with markdown rendering
"""

import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def test_openai_library_opens_viewer_modal(page: Page, serve_hacka_re):
    """Test that clicking the OpenAI Prompt Library name opens viewer modal"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Open prompts modal
    page.locator("#prompts-btn").click()
    page.wait_for_selector("#prompts-modal", state="visible")

    # First expand Default Prompts section
    page.locator(".default-prompts-header").click()
    page.wait_for_timeout(300)

    # Then expand Advanced nested section
    advanced_header = page.locator(".nested-section-header:has-text('Advanced')")
    expect(advanced_header).to_be_visible()
    advanced_header.click()
    page.wait_for_timeout(500)

    screenshot_with_markdown(
        page,
        "advanced_expanded",
        {"status": "Advanced section expanded"}
    )

    # Find the OpenAI Prompt Library 2025 item
    prompt_item = page.locator(".default-prompt-item").filter(
        has_text="OpenAI Prompt Library 2025"
    )
    expect(prompt_item).to_be_visible()

    # Click on the prompt name (not checkbox)
    prompt_name = prompt_item.locator(".prompt-item-name")
    expect(prompt_name).to_be_visible()
    prompt_name.click()
    page.wait_for_timeout(500)

    screenshot_with_markdown(
        page,
        "after_name_click",
        {"status": "Clicked on prompt name"}
    )

    # Verify the viewer modal appeared
    viewer_modal = page.locator("#default-prompt-viewer-modal")
    expect(viewer_modal).to_be_visible(timeout=2000)

    screenshot_with_markdown(
        page,
        "viewer_modal_open",
        {"status": "Viewer modal opened"}
    )

    # Verify modal title
    modal_title = viewer_modal.locator(".settings-header h2")
    expect(modal_title).to_contain_text("OpenAI Prompt Library 2025")

    # Verify tabs exist (Raw and Rendered)
    raw_tab = viewer_modal.locator(".tab-btn[data-tab='raw']")
    rendered_tab = viewer_modal.locator(".tab-btn[data-tab='rendered']")
    expect(raw_tab).to_be_visible()
    expect(rendered_tab).to_be_visible()

    # Verify raw content is visible by default (Raw tab is active first)
    raw_content = viewer_modal.locator("#prompt-viewer-raw-content")
    expect(raw_content).to_be_visible()

    # Check raw content
    raw_text = raw_content.text_content()
    assert "# OpenAI Prompt Library 2025" in raw_text, "Missing markdown title"
    assert "categories:" in raw_text, "Missing YAML in raw view"

    screenshot_with_markdown(
        page,
        "raw_view",
        {"status": "Raw view showing plain text content (default tab)"}
    )

    # Switch to rendered tab
    rendered_tab.click()
    page.wait_for_timeout(300)

    # Verify rendered content is now visible
    rendered_content = viewer_modal.locator("#prompt-viewer-rendered-content")
    expect(rendered_content).to_be_visible()

    # Check that content includes expected sections
    content_html = rendered_content.inner_html()
    assert "OpenAI Prompt Library 2025" in content_html, "Missing title"
    assert "Overview" in content_html, "Missing overview section"
    assert "Use Cases" in content_html, "Missing use cases section"
    assert "categories:" in content_html or "yaml" in content_html, "Missing YAML content"

    screenshot_with_markdown(
        page,
        "rendered_view",
        {"status": "Rendered view showing markdown content"}
    )

    # Close modal by clicking close button
    close_btn = viewer_modal.locator(".modal-close")
    if close_btn.is_visible():
        close_btn.click()
        page.wait_for_timeout(300)

    # Verify modal closed
    expect(viewer_modal).not_to_be_visible()

    screenshot_with_markdown(
        page,
        "modal_closed",
        {"status": "Modal closed successfully"}
    )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
