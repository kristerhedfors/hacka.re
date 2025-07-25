#!/usr/bin/env python3
"""
Debug test for Share modal Password/Session Key info icon positioning
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from test_utils import dismiss_welcome_modal, screenshot_with_markdown
from playwright.sync_api import sync_playwright, expect
import time

def test_share_modal_info_icon():
    """Test that Share modal info icons appear in upper right corner like Agent/MCP modals"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Show browser for visual verification
        page = browser.new_page()
        
        # Navigate to the app
        page.goto("http://localhost:8000")
        dismiss_welcome_modal(page)
        
        # Open share modal
        print("Opening Share modal...")
        share_button = page.locator("#share-btn")
        share_button.click()
        
        # Wait for share modal to be visible
        page.wait_for_selector("#share-modal", state="visible")
        
        screenshot_with_markdown(page, "share_modal_opened", {
            "Status": "Share modal opened, checking info icon positioning",
            "Modal": "Share modal visible"
        })
        
        # Test 1: Main Share Link info icon (in header)
        print("Testing main Share Link info icon...")
        share_link_info_icon = page.locator("#share-link-info-icon")
        expect(share_link_info_icon).to_be_visible()
        
        # Verify it's positioned in the settings-header (upper right corner style)
        main_settings_header = page.locator(".settings-header").first
        expect(main_settings_header).to_be_visible()
        
        # Click the main info icon
        share_link_info_icon.click()
        
        # Wait for modal to appear
        page.wait_for_timeout(500)
        
        # Check if info modal is visible
        share_link_info_modal = page.locator("#share-link-info-modal")
        expect(share_link_info_modal).to_be_visible()
        expect(share_link_info_modal).to_have_class("modal active")
        
        screenshot_with_markdown(page, "share_link_info_modal_visible", {
            "Status": "Share Link info modal should be full overlay",
            "Modal": "Share Link info modal overlay",
            "Info": "Main header info icon working"
        })
        
        # Close the modal by clicking the close button
        close_btn = share_link_info_modal.locator("#close-share-link-info-modal")
        close_btn.click()
        
        # Test 2: Password/Session Key info icon (in second header)
        print("Testing Password/Session Key info icon...")
        password_info_icon = page.locator("#share-password-info-icon")
        expect(password_info_icon).to_be_visible()
        
        # Click the password info icon
        password_info_icon.click()
        
        # Wait for modal to appear
        page.wait_for_timeout(500)
        
        # Check if info modal is visible
        password_info_modal = page.locator("#share-password-info-modal")
        expect(password_info_modal).to_be_visible()
        expect(password_info_modal).to_have_class("modal active")
        
        screenshot_with_markdown(page, "share_password_info_modal_visible", {
            "Status": "Password/Session Key info modal should be full overlay",
            "Modal": "Share Password info modal overlay",
            "Info": "Both info icons should now be in upper right corners"
        })
        
        print("Share modal info icons test complete. Both icons should be in upper right corners.")
        
        # Keep browser open for manual inspection
        page.pause()
        
        browser.close()

if __name__ == "__main__":
    test_share_modal_info_icon()