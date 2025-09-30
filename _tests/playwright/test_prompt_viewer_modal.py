"""
Test prompt viewer modal functionality for default prompts
"""
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal
from conftest import serve_hacka_re


def test_default_prompt_viewer_modal(page: Page, serve_hacka_re):
    """Test that clicking a default prompt name opens the viewer modal"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Open prompts modal
    page.locator("#prompts-btn").click()
    page.wait_for_selector("#prompts-modal.active", state="visible")

    # Expand default prompts section
    default_prompts_header = page.locator(".default-prompts-header")
    default_prompts_header.click()
    page.wait_for_timeout(300)  # Wait for animation

    # Find a default prompt item and click its name
    prompt_name = page.locator(".default-prompt-item .prompt-item-name").first
    expect(prompt_name).to_be_visible()
    prompt_name.click()

    # Verify viewer modal appears
    viewer_modal = page.locator("#default-prompt-viewer-modal")
    expect(viewer_modal).to_be_visible()
    # Verify modal has active class
    expect(viewer_modal).to_have_attribute("class", lambda c: "active" in c if isinstance(c, str) else False)

    # Verify modal has the expected elements
    expect(page.locator("#default-prompt-viewer-modal h2")).to_be_visible()
    expect(page.locator("#prompt-viewer-copy-btn")).to_be_visible()
    expect(page.locator("#prompt-viewer-populate-btn")).to_be_visible()

    # Verify tabs are present
    expect(page.locator(".tab-btn[data-tab='raw']")).to_be_visible()
    expect(page.locator(".tab-btn[data-tab='rendered']")).to_be_visible()

    # Verify raw content is shown by default
    raw_tab = page.locator("#prompt-viewer-raw-tab")
    expect(raw_tab).to_have_class("active")

    # Switch to rendered tab
    page.locator(".tab-btn[data-tab='rendered']").click()
    page.wait_for_timeout(100)
    rendered_tab = page.locator("#prompt-viewer-rendered-tab")
    expect(rendered_tab).to_have_class("active")

    # Close modal by clicking outside
    page.locator("#default-prompt-viewer-modal").click(position={"x": 10, "y": 10})
    page.wait_for_timeout(400)
    expect(viewer_modal).not_to_be_attached()


def test_prompt_viewer_copy_button(page: Page, serve_hacka_re):
    """Test copy to clipboard functionality"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Open prompts modal and default prompts
    page.locator("#prompts-btn").click()
    page.locator(".default-prompts-header").click()
    page.wait_for_timeout(300)

    # Click first default prompt name
    page.locator(".default-prompt-item .prompt-item-name").first.click()

    # Wait for modal
    expect(page.locator("#default-prompt-viewer-modal")).to_be_visible()

    # Click copy button
    copy_btn = page.locator("#prompt-viewer-copy-btn")
    copy_btn.click()

    # Verify button shows success state (checkmark)
    page.wait_for_timeout(100)
    expect(copy_btn.locator("i.fa-check")).to_be_visible()


def test_prompt_viewer_populate_chat(page: Page, serve_hacka_re):
    """Test populate chat input functionality"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Open prompts modal and default prompts
    page.locator("#prompts-btn").click()
    page.locator(".default-prompts-header").click()
    page.wait_for_timeout(300)

    # Click first default prompt name
    page.locator(".default-prompt-item .prompt-item-name").first.click()

    # Wait for modal
    expect(page.locator("#default-prompt-viewer-modal")).to_be_visible()

    # Click populate button
    page.locator("#prompt-viewer-populate-btn").click()

    # Verify modal closes
    page.wait_for_timeout(400)
    expect(page.locator("#default-prompt-viewer-modal")).not_to_be_attached()

    # Verify chat input is populated
    message_input = page.locator("#message-input")
    expect(message_input).not_to_be_empty()


def test_prompt_viewer_esc_key_closes(page: Page, serve_hacka_re):
    """Test that ESC key closes the viewer modal"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Open prompts modal and default prompts
    page.locator("#prompts-btn").click()
    page.locator(".default-prompts-header").click()
    page.wait_for_timeout(300)

    # Click first default prompt name
    page.locator(".default-prompt-item .prompt-item-name").first.click()

    # Wait for modal
    viewer_modal = page.locator("#default-prompt-viewer-modal")
    expect(viewer_modal).to_be_visible()

    # Press ESC key
    page.keyboard.press("Escape")

    # Verify modal closes
    page.wait_for_timeout(400)
    expect(viewer_modal).not_to_be_attached()


def test_info_button_still_works(page: Page, serve_hacka_re):
    """Test that info button still shows the info popup"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Open prompts modal and default prompts
    page.locator("#prompts-btn").click()
    page.locator(".default-prompts-header").click()
    page.wait_for_timeout(300)

    # Click info button on first default prompt
    info_btn = page.locator(".default-prompt-item .prompt-item-info").first
    expect(info_btn).to_be_visible()
    info_btn.click()

    # Verify info popup appears (not the viewer modal)
    expect(page.locator(".prompt-info-popup")).to_be_visible()
    expect(page.locator("#default-prompt-viewer-modal")).not_to_be_attached()