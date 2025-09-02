"""
Test RAG Settings share modal status and checkbox behavior
"""
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_rag_share_checkbox_disabled_when_nothing_to_share(page: Page, serve_hacka_re):
    """Test that RAG Settings checkbox is disabled when there's nothing to share."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Ensure RAG is disabled (default state)
    page.evaluate("""() => {
        if (window.RAGStorageService) {
            window.RAGStorageService.setRAGEnabled(false);
            window.RAGStorageService.setEnabledEUDocuments([]);
        }
    }""")
    
    # Open share modal
    share_btn = page.locator("#share-btn")
    expect(share_btn).to_be_visible()
    share_btn.click()
    
    # Wait for modal to be visible
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    # Check RAG Settings checkbox is disabled
    rag_checkbox = page.locator("#share-rag-settings")
    expect(rag_checkbox).to_be_disabled()
    
    # Check for status indicator showing why it's disabled
    status_text = page.locator('label[for="share-rag-settings"] .share-item-status')
    expect(status_text).to_be_visible()
    expect(status_text).to_contain_text("No RAG settings to share")
    
    # Take screenshot for documentation
    screenshot_with_markdown(page, "rag_checkbox_disabled", {
        "Test": "RAG checkbox disabled when nothing to share",
        "RAG Enabled": "False",
        "EU Documents": "None",
        "Expected": "Checkbox disabled with status message"
    })
    
    # Close modal
    close_btn = page.locator("#close-share-modal")
    close_btn.click()


def test_rag_share_checkbox_enabled_with_rag_enabled(page: Page, serve_hacka_re):
    """Test that RAG Settings checkbox is enabled when RAG is enabled."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Enable RAG
    page.evaluate("""() => {
        if (window.RAGStorageService) {
            window.RAGStorageService.setRAGEnabled(true);
            window.RAGStorageService.setEnabledEUDocuments([]);
        }
    }""")
    
    # Open share modal
    share_btn = page.locator("#share-btn")
    share_btn.click()
    
    # Wait for modal
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    # Check RAG Settings checkbox is enabled
    rag_checkbox = page.locator("#share-rag-settings")
    expect(rag_checkbox).to_be_enabled()
    
    # Check status indicator shows what's available
    status_text = page.locator('label[for="share-rag-settings"] .share-item-status')
    expect(status_text).to_be_visible()
    expect(status_text).to_contain_text("RAG enabled available")
    
    # Check the checkbox
    rag_checkbox.check()
    
    # Status should update to "will be shared"
    expect(status_text).to_contain_text("RAG enabled will be shared")
    
    screenshot_with_markdown(page, "rag_checkbox_enabled", {
        "Test": "RAG checkbox enabled with RAG turned on",
        "RAG Enabled": "True",
        "Checkbox": "Checked",
        "Status": "Shows 'will be shared'"
    })
    
    # Close modal
    close_btn = page.locator("#close-share-modal")
    close_btn.click()


def test_rag_share_checkbox_with_eu_documents(page: Page, serve_hacka_re):
    """Test RAG Settings checkbox behavior with EU documents enabled."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Enable EU documents only (RAG disabled)
    page.evaluate("""() => {
        if (window.RAGStorageService) {
            window.RAGStorageService.setRAGEnabled(false);
            window.RAGStorageService.setEnabledEUDocuments(['cra', 'aia']);
        }
    }""")
    
    # Open share modal
    share_btn = page.locator("#share-btn")
    share_btn.click()
    
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    # Check RAG Settings checkbox is enabled (EU docs are shareable)
    rag_checkbox = page.locator("#share-rag-settings")
    expect(rag_checkbox).to_be_enabled()
    
    # Check status shows EU documents (alphabetically sorted)
    status_text = page.locator('label[for="share-rag-settings"] .share-item-status')
    expect(status_text).to_be_visible()
    expect(status_text).to_contain_text("AIA, CRA available")
    
    # Check the checkbox
    rag_checkbox.check()
    
    # Status should update (alphabetically sorted)
    expect(status_text).to_contain_text("AIA, CRA will be shared")
    
    screenshot_with_markdown(page, "rag_checkbox_eu_docs", {
        "Test": "RAG checkbox with EU documents",
        "RAG Enabled": "False",
        "EU Documents": "CRA, AIA",
        "Status": "Shows EU docs will be shared"
    })
    
    # Close modal
    close_btn = page.locator("#close-share-modal")
    close_btn.click()


def test_rag_share_checkbox_with_both_rag_and_eu_docs(page: Page, serve_hacka_re):
    """Test RAG Settings checkbox with both RAG enabled and EU documents."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Enable both RAG and EU documents
    page.evaluate("""() => {
        if (window.RAGStorageService) {
            window.RAGStorageService.setRAGEnabled(true);
            window.RAGStorageService.setEnabledEUDocuments(['cra', 'aia', 'dora']);
        }
    }""")
    
    # Open share modal
    share_btn = page.locator("#share-btn")
    share_btn.click()
    
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    # Check status shows both RAG and EU docs (alphabetically sorted)
    status_text = page.locator('label[for="share-rag-settings"] .share-item-status')
    expect(status_text).to_be_visible()
    expect(status_text).to_contain_text("RAG enabled, AIA, CRA, DORA available")
    
    # Check the checkbox
    rag_checkbox = page.locator("#share-rag-settings")
    rag_checkbox.check()
    
    # Status should update to show both will be shared
    expect(status_text).to_contain_text("will be shared")
    
    screenshot_with_markdown(page, "rag_checkbox_full", {
        "Test": "RAG checkbox with everything enabled",
        "RAG Enabled": "True",
        "EU Documents": "CRA, AIA, DORA",
        "Status": "Shows all settings will be shared"
    })
    
    # Close modal
    close_btn = page.locator("#close-share-modal")
    close_btn.click()


def test_rag_status_inline_indicator_updates(page: Page, serve_hacka_re):
    """Test that inline status indicator updates correctly with checkbox state."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Enable RAG to make checkbox available
    page.evaluate("""() => {
        if (window.RAGStorageService) {
            window.RAGStorageService.setRAGEnabled(true);
        }
    }""")
    
    # Open share modal
    share_btn = page.locator("#share-btn")
    share_btn.click()
    
    share_modal = page.locator("#share-modal")
    expect(share_modal).to_be_visible()
    
    # Check status shows "available" when unchecked (with parentheses)
    status_text = page.locator('label[for="share-rag-settings"] .share-item-status')
    expect(status_text).to_have_text("(RAG enabled available)")
    
    # Check the checkbox
    rag_checkbox = page.locator("#share-rag-settings")
    rag_checkbox.check()
    
    # Status should update to "will be shared"
    expect(status_text).to_have_text("(RAG enabled will be shared)")
    
    # Uncheck the checkbox
    rag_checkbox.uncheck()
    
    # Status should revert to "available"
    expect(status_text).to_have_text("(RAG enabled available)")
    
    screenshot_with_markdown(page, "rag_inline_status", {
        "Test": "Inline status indicator updates",
        "Checkbox": "Unchecked",
        "Expected": "Shows 'available' when unchecked"
    })
    
    # Close modal
    close_btn = page.locator("#close-share-modal")
    close_btn.click()