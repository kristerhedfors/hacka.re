"""
Test horizontal scrolling prevention across different screen sizes
"""
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_no_horizontal_scroll_desktop(page: Page, serve_hacka_re):
    """Test that there's no horizontal scrolling on desktop"""
    # Set desktop viewport
    page.set_viewport_size({"width": 1920, "height": 1080})
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Check body overflow
    overflow_x = page.evaluate("window.getComputedStyle(document.body).overflowX")
    assert overflow_x == "hidden", f"Body overflow-x should be hidden, got {overflow_x}"
    
    # Check html overflow
    html_overflow_x = page.evaluate("window.getComputedStyle(document.documentElement).overflowX")
    assert html_overflow_x == "hidden", f"HTML overflow-x should be hidden, got {html_overflow_x}"
    
    # Check scrollbar width
    scroll_width = page.evaluate("document.documentElement.scrollWidth")
    client_width = page.evaluate("document.documentElement.clientWidth")
    assert scroll_width <= client_width, f"Page is scrollable horizontally: scrollWidth={scroll_width}, clientWidth={client_width}"
    
    screenshot_with_markdown(page, "desktop_no_scroll", {
        "Test": "No horizontal scroll on desktop",
        "Viewport": "1920x1080",
        "ScrollWidth": str(scroll_width),
        "ClientWidth": str(client_width),
        "Pass": str(scroll_width <= client_width)
    })

def test_no_horizontal_scroll_tablet(page: Page, serve_hacka_re):
    """Test that there's no horizontal scrolling on tablet"""
    # Set tablet viewport
    page.set_viewport_size({"width": 768, "height": 1024})
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Check scrollbar width
    scroll_width = page.evaluate("document.documentElement.scrollWidth")
    client_width = page.evaluate("document.documentElement.clientWidth")
    assert scroll_width <= client_width, f"Page is scrollable horizontally on tablet: scrollWidth={scroll_width}, clientWidth={client_width}"
    
    screenshot_with_markdown(page, "tablet_no_scroll", {
        "Test": "No horizontal scroll on tablet",
        "Viewport": "768x1024",
        "ScrollWidth": str(scroll_width),
        "ClientWidth": str(client_width),
        "Pass": str(scroll_width <= client_width)
    })

def test_no_horizontal_scroll_mobile(page: Page, serve_hacka_re):
    """Test that there's no horizontal scrolling on mobile"""
    # Set mobile viewport
    page.set_viewport_size({"width": 375, "height": 812})
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Check scrollbar width
    scroll_width = page.evaluate("document.documentElement.scrollWidth")
    client_width = page.evaluate("document.documentElement.clientWidth")
    assert scroll_width <= client_width, f"Page is scrollable horizontally on mobile: scrollWidth={scroll_width}, clientWidth={client_width}"
    
    screenshot_with_markdown(page, "mobile_no_scroll", {
        "Test": "No horizontal scroll on mobile",
        "Viewport": "375x812",
        "ScrollWidth": str(scroll_width),
        "ClientWidth": str(client_width),
        "Pass": str(scroll_width <= client_width)
    })

def test_no_horizontal_scroll_small_mobile(page: Page, serve_hacka_re):
    """Test that there's no horizontal scrolling on very small mobile devices"""
    # Set small mobile viewport (iPhone SE size)
    page.set_viewport_size({"width": 320, "height": 568})
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Check scrollbar width
    scroll_width = page.evaluate("document.documentElement.scrollWidth")
    client_width = page.evaluate("document.documentElement.clientWidth")
    assert scroll_width <= client_width, f"Page is scrollable horizontally on small mobile: scrollWidth={scroll_width}, clientWidth={client_width}"
    
    screenshot_with_markdown(page, "small_mobile_no_scroll", {
        "Test": "No horizontal scroll on small mobile",
        "Viewport": "320x568",
        "ScrollWidth": str(scroll_width),
        "ClientWidth": str(client_width),
        "Pass": str(scroll_width <= client_width)
    })

def test_markdown_content_no_overflow(page: Page, serve_hacka_re, api_key):
    """Test that markdown content with wide elements doesn't cause horizontal scrolling"""
    page.set_viewport_size({"width": 375, "height": 812})
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Configure API
    page.locator("#api-key").fill(api_key)
    # Use centralized test model configuration
    from conftest import ACTIVE_TEST_CONFIG
    page.locator("#model-select").select_option(ACTIVE_TEST_CONFIG["model"])
    
    # Send a message that will generate wide content
    message_input = page.locator("#message-input")
    message_input.fill("Create a markdown table with 10 columns and also show a very long URL like https://example.com/very/long/path/that/might/cause/horizontal/scrolling/on/mobile/devices/especially/when/not/handled/properly")
    
    # Send message
    page.locator("#send-btn").click()
    
    # Wait for response
    page.wait_for_selector(".message.ai", timeout=10000)
    time.sleep(2)  # Wait for rendering
    
    # Check for horizontal overflow
    scroll_width = page.evaluate("document.documentElement.scrollWidth")
    client_width = page.evaluate("document.documentElement.clientWidth")
    
    # Check message content overflow
    message_overflow = page.evaluate("""
        () => {
            const messages = document.querySelectorAll('.message-content');
            for (let msg of messages) {
                if (msg.scrollWidth > msg.clientWidth) {
                    return true;
                }
            }
            return false;
        }
    """)
    
    assert scroll_width <= client_width, f"Wide content causes horizontal scroll: scrollWidth={scroll_width}, clientWidth={client_width}"
    assert not message_overflow, "Message content is overflowing horizontally"
    
    screenshot_with_markdown(page, "markdown_content_mobile", {
        "Test": "Markdown content on mobile",
        "Viewport": "375x812",
        "ScrollWidth": str(scroll_width),
        "ClientWidth": str(client_width),
        "MessageOverflow": str(message_overflow),
        "Pass": str(scroll_width <= client_width and not message_overflow)
    })

def test_modal_no_horizontal_scroll(page: Page, serve_hacka_re):
    """Test that modals don't cause horizontal scrolling on mobile"""
    page.set_viewport_size({"width": 375, "height": 812})
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open settings modal
    page.locator("#settings-btn").click()
    page.wait_for_selector("#settings-modal", state="visible")
    time.sleep(0.5)
    
    # Check for horizontal overflow with modal open
    scroll_width = page.evaluate("document.documentElement.scrollWidth")
    client_width = page.evaluate("document.documentElement.clientWidth")
    
    modal_overflow = page.evaluate("""
        () => {
            const modal = document.querySelector('.modal-content');
            return modal ? modal.scrollWidth > modal.clientWidth : false;
        }
    """)
    
    assert scroll_width <= client_width, f"Modal causes horizontal scroll: scrollWidth={scroll_width}, clientWidth={client_width}"
    assert not modal_overflow, "Modal content is overflowing horizontally"
    
    screenshot_with_markdown(page, "modal_mobile_no_scroll", {
        "Test": "Modal on mobile",
        "Viewport": "375x812",
        "ScrollWidth": str(scroll_width),
        "ClientWidth": str(client_width),
        "ModalOverflow": str(modal_overflow),
        "Pass": str(scroll_width <= client_width and not modal_overflow)
    })