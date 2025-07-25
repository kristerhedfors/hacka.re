#!/usr/bin/env python3
"""
Debug test for click-based info modals in Agent and MCP modals (like Function Calling modal)
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from test_utils import dismiss_welcome_modal, screenshot_with_markdown
from playwright.sync_api import sync_playwright, expect
import time

def test_info_modal_clicks():
    """Test that info icon clicks show full modal overlays like Function Calling modal"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Show browser for visual verification
        page = browser.new_page()
        
        # Navigate to the app
        page.goto("http://localhost:8000")
        dismiss_welcome_modal(page)
        
        # Test Agent modal info icon click
        print("Testing Agent modal info icon modal...")
        settings_button = page.locator("#settings-button")
        settings_button.click()
        
        agent_tab = page.locator("button:has-text('Agents')")
        agent_tab.click()
        
        # Wait for agent modal to be visible
        page.wait_for_selector("#agent-modal", state="visible")
        
        # Find and click the info icon in the agent modal
        agent_info_icon = page.locator("#agent-modal-info-icon")
        expect(agent_info_icon).to_be_visible()
        
        screenshot_with_markdown(page, "before_agent_click", {
            "Status": "Before clicking agent info icon",
            "Modal": "Agent modal visible"
        })
        
        # Click the info icon
        agent_info_icon.click()
        
        # Wait a moment for modal to appear
        page.wait_for_timeout(500)
        
        # Check if agent info modal is visible (should be full overlay like function modal)
        agent_info_modal = page.locator("#agent-info-modal")
        expect(agent_info_modal).to_be_visible()
        expect(agent_info_modal).to_have_class("modal active")
        
        screenshot_with_markdown(page, "agent_modal_visible", {
            "Status": "Agent info modal should be full overlay like Function Calling modal",
            "Modal": "Agent info modal overlay"
        })
        
        # Close the modal by clicking the close button
        close_btn = agent_info_modal.locator("#close-agent-info-modal")
        close_btn.click()
        
        # Test MCP modal info icon click
        print("Testing MCP modal info icon modal...")
        mcp_tab = page.locator("button:has-text('MCP')")
        mcp_tab.click()
        
        # Wait for MCP modal to be visible  
        page.wait_for_selector("#mcp-modal", state="visible")
        
        # Find and click the info icon in the MCP modal
        mcp_info_icon = page.locator("#mcp-servers-info-icon")
        expect(mcp_info_icon).to_be_visible()
        
        # Click the info icon
        mcp_info_icon.click()
        
        # Wait a moment for modal to appear
        page.wait_for_timeout(500)
        
        # Check if MCP info modal is visible (should be full overlay like function modal)
        mcp_info_modal = page.locator("#mcp-info-modal")
        expect(mcp_info_modal).to_be_visible()
        expect(mcp_info_modal).to_have_class("modal active")
        
        screenshot_with_markdown(page, "mcp_modal_visible", {
            "Status": "MCP info modal should be full overlay like Function Calling modal",
            "Modal": "MCP info modal overlay"
        })
        
        print("Modal test complete. Both should show full modal overlays like Function Calling modal.")
        
        # Keep browser open for manual inspection
        page.pause()
        
        browser.close()

if __name__ == "__main__":
    test_info_modal_clicks()