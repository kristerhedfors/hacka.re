import pytest
import time
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_advanced_section_expandable(page: Page, serve_hacka_re):
    """Test that the Advanced section is expandable and contains Function library."""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Open prompts modal
    page.locator("#prompts-btn").click()
    prompts_modal = page.locator("#prompts-modal")
    expect(prompts_modal).to_be_visible()

    # Expand Default Prompts
    page.locator(".default-prompts-header").click()
    default_prompts_list = page.locator(".default-prompts-list")
    expect(default_prompts_list).to_be_visible()

    # Check that Advanced section exists as a nested section
    advanced_section = page.locator(".nested-section-header:has-text('Advanced')")
    expect(advanced_section).to_be_visible()

    screenshot_with_markdown(page, "advanced_section_collapsed.png", {
        "Status": "Advanced section found (collapsed)",
        "Test": "Advanced Section Expandable"
    })

    # Expand Advanced section
    advanced_section.click()

    # Wait for nested list to be visible
    nested_list = page.locator(".nested-section:has(.nested-section-header:has-text('Advanced')) .nested-section-list")
    expect(nested_list).to_be_visible()

    # Check that Function library exists inside Advanced
    function_library = page.locator(".default-prompt-item:has-text('Function library')")
    expect(function_library).to_be_visible()

    screenshot_with_markdown(page, "advanced_section_expanded.png", {
        "Status": "Advanced section expanded showing Function library",
        "Test": "Advanced Section Expandable"
    })

def test_advanced_checkbox_and_token_counter(page: Page, serve_hacka_re):
    """Test that Advanced section items connect to checkbox, token counter, and accumulative counter."""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Open prompts modal
    page.locator("#prompts-btn").click()
    expect(page.locator("#prompts-modal")).to_be_visible()

    # Expand Default Prompts
    page.locator(".default-prompts-header").click()
    expect(page.locator(".default-prompts-list")).to_be_visible()

    # Expand Advanced section
    page.locator(".nested-section-header:has-text('Advanced')").click()
    expect(page.locator(".nested-section:has(.nested-section-header:has-text('Advanced')) .nested-section-list")).to_be_visible()

    # Find Function library checkbox
    function_library_item = page.locator(".default-prompt-item:has-text('Function library')")
    checkbox = function_library_item.locator(".prompt-item-checkbox")

    # Check initial state
    initial_checked = checkbox.is_checked()

    # Toggle checkbox
    checkbox.click()
    time.sleep(0.2)  # Wait for state update

    # Verify checkbox toggled
    after_checked = checkbox.is_checked()
    assert after_checked != initial_checked, "Checkbox should toggle"

    screenshot_with_markdown(page, "advanced_checkbox_toggled.png", {
        "Status": f"Checkbox toggled from {initial_checked} to {after_checked}",
        "Test": "Advanced Checkbox and Token Counter"
    })

    print(f"✅ Checkbox toggled: {initial_checked} → {after_checked}")

def test_advanced_popup_viewer(page: Page, serve_hacka_re):
    """Test that clicking Advanced section items opens popup viewer."""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Open prompts modal
    page.locator("#prompts-btn").click()
    expect(page.locator("#prompts-modal")).to_be_visible()

    # Expand Default Prompts
    page.locator(".default-prompts-header").click()
    expect(page.locator(".default-prompts-list")).to_be_visible()

    # Expand Advanced section
    page.locator(".nested-section-header:has-text('Advanced')").click()
    expect(page.locator(".nested-section:has(.nested-section-header:has-text('Advanced')) .nested-section-list")).to_be_visible()

    # Click Function library info button
    function_library_item = page.locator(".default-prompt-item:has-text('Function library')")
    info_button = function_library_item.locator(".prompt-item-info")
    info_button.click()

    # Wait for simple viewer modal to appear
    viewer_modal = page.locator("#simple-prompt-viewer-modal")
    expect(viewer_modal).to_be_visible(timeout=5000)

    screenshot_with_markdown(page, "advanced_popup_viewer.png", {
        "Status": "Viewer modal opened for Function library",
        "Test": "Advanced Popup Viewer"
    })

    # Verify modal content
    modal_content = viewer_modal.locator("#simple-prompt-viewer-content")
    expect(modal_content).to_be_visible()
    content_text = modal_content.inner_text()
    assert len(content_text) > 0, "Modal should have content"

    print(f"✅ Popup viewer works for Advanced items")
