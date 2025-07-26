#!/usr/bin/env python3
"""
Debug test for heart modal info icon click functionality
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from test_utils import dismiss_welcome_modal, screenshot_with_markdown
from playwright.sync_api import sync_playwright, expect
import time

def test_heart_modal_info_icon():
    """Test that heart modal info icon shows full modal overlay explaining menu navigation"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Show browser for visual verification
        page = browser.new_page()
        
        # Navigate to the app
        page.goto("http://localhost:8000")
        dismiss_welcome_modal(page)
        
        # Click the heart button to open the heart modal
        print("Opening heart modal...")
        heart_button = page.locator("#heart-btn")
        heart_button.click()
        
        # Wait for heart modal tooltip to be visible
        page.wait_for_selector(".heart-logo .tooltip.active", state="visible", timeout=5000)
        
        screenshot_with_markdown(page, "heart_modal_open", {
            "Status": "Heart modal opened",
            "Modal": "Tree menu should be visible with info icon in upper right"
        })
        
        # Find and click the info icon in the heart modal
        heart_info_icon = page.locator("#heart-modal-info-icon")
        expect(heart_info_icon).to_be_visible()
        
        print("Clicking heart modal info icon...")
        heart_info_icon.click()
        
        # Wait a moment for modal to appear
        page.wait_for_timeout(500)
        
        # Check if heart info modal is visible (should be full overlay like function modal)
        heart_info_modal = page.locator("#heart-info-modal")
        expect(heart_info_modal).to_be_visible()
        expect(heart_info_modal).to_have_class("modal active")
        
        screenshot_with_markdown(page, "heart_info_modal_visible", {
            "Status": "Heart info modal should be full overlay explaining menu navigation",
            "Modal": "Heart info modal overlay",
            "Content": "Should explain that menu items match header icons"
        })
        
        # Verify the modal contains the expected content
        modal_content = heart_info_modal.locator(".modal-content")
        expect(modal_content).to_contain_text("hacka.re")
        expect(modal_content).to_contain_text("serverless agency")
        expect(modal_content).to_contain_text("contents in this menu matches the icons in the header")
        
        # Close the modal by clicking the close button
        close_btn = heart_info_modal.locator("button:has-text('Close')")
        close_btn.click()
        
        # Verify modal is closed
        expect(heart_info_modal).not_to_have_class("active")
        
        print("Heart modal info icon test complete. Modal should show explanation about menu navigation.")
        
        # Keep browser open for manual inspection
        page.pause()
        
        browser.close()

if __name__ == "__main__":
    test_heart_modal_info_icon()