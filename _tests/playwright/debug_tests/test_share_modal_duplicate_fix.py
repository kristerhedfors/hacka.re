#!/usr/bin/env python3
"""
Debug test to verify only one modal appears when clicking Share Link info icons
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from test_utils import dismiss_welcome_modal, screenshot_with_markdown
from playwright.sync_api import sync_playwright, expect
import time

def test_share_modal_no_duplicates():
    """Test that only one modal appears when clicking share info icons"""
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
        
        # Test main Share Link info icon
        print("Testing Share Link info icon for duplicates...")
        share_link_info_icon = page.locator("#share-link-info-icon")
        expect(share_link_info_icon).to_be_visible()
        
        # Click the info icon
        share_link_info_icon.click()
        
        # Wait for modal to appear
        page.wait_for_timeout(500)
        
        # Count how many modals are active
        active_modals = page.locator(".modal.active")
        modal_count = active_modals.count()
        
        print(f"Number of active modals after clicking Share Link info: {modal_count}")
        
        # Should be exactly 2: the share modal itself and the info modal
        # (Share modal stays open in background)
        if modal_count != 2:
            print(f"ERROR: Expected 2 active modals (share + info), but found {modal_count}")
            
        screenshot_with_markdown(page, "share_link_modal_count", {
            "Status": "After clicking Share Link info icon",
            "Active Modals": str(modal_count),
            "Expected": "2 (share modal + info modal)",
            "Issue": "Should not have duplicate info modals"
        })
        
        # Check for the specific info modal
        share_link_info_modal = page.locator("#share-link-info-modal")
        expect(share_link_info_modal).to_be_visible()
        
        # Check for any duplicate share-info-modal-X modals (from old implementation)
        old_style_modals = page.locator("[id^='share-info-modal-']")
        old_modal_count = old_style_modals.count()
        
        print(f"Number of old-style modals found: {old_modal_count}")
        
        if old_modal_count > 0:
            print("WARNING: Found old-style modals that should have been skipped")
            
        print("Test complete. There should be no duplicate modals.")
        
        # Keep browser open for manual inspection
        page.pause()
        
        browser.close()

if __name__ == "__main__":
    test_share_modal_no_duplicates()