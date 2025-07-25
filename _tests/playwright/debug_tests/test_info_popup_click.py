#!/usr/bin/env python3
"""
Debug test for click-based info popups in Agent and MCP modals
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from test_utils import dismiss_welcome_modal, screenshot_with_markdown
from playwright.sync_api import sync_playwright, expect
import time

def test_info_popup_clicks():
    """Test that info icon clicks show proper popups instead of hover tooltips"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Show browser for visual verification
        page = browser.new_page()
        
        # Navigate to the app
        page.goto("http://localhost:8000")
        dismiss_welcome_modal(page)
        
        # Test Agent modal info icon click
        print("Testing Agent modal info icon click...")
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
        
        # Wait a moment for popup to appear
        page.wait_for_timeout(500)
        
        # Check if popup is visible
        agent_popup = page.locator(".settings-info-popup")
        expect(agent_popup).to_be_visible()
        
        screenshot_with_markdown(page, "agent_popup_visible", {
            "Status": "Agent info popup should be visible on screen",
            "Modal": "Agent modal with click popup"
        })
        
        # Close the popup by clicking the close button
        close_btn = agent_popup.locator(".settings-info-close")
        close_btn.click()
        
        # Test MCP modal info icon click
        print("Testing MCP modal info icon click...")
        mcp_tab = page.locator("button:has-text('MCP')")
        mcp_tab.click()
        
        # Wait for MCP modal to be visible  
        page.wait_for_selector("#mcp-modal", state="visible")
        
        # Find and click the info icon in the MCP modal
        mcp_info_icon = page.locator("#mcp-servers-info-icon")
        expect(mcp_info_icon).to_be_visible()
        
        # Click the info icon
        mcp_info_icon.click()
        
        # Wait a moment for popup to appear
        page.wait_for_timeout(500)
        
        # Check if popup is visible
        mcp_popup = page.locator(".settings-info-popup")
        expect(mcp_popup).to_be_visible()
        
        screenshot_with_markdown(page, "mcp_popup_visible", {
            "Status": "MCP info popup should be visible on screen",
            "Modal": "MCP modal with click popup"
        })
        
        print("Click popup test complete. Both popups should be functional.")
        
        # Keep browser open for manual inspection
        page.pause()
        
        browser.close()

if __name__ == "__main__":
    test_info_popup_clicks()