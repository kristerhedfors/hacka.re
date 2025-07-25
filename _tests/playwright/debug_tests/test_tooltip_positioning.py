#!/usr/bin/env python3
"""
Debug test for tooltip positioning fix
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from test_utils import dismiss_welcome_modal, screenshot_with_markdown
from playwright.sync_api import sync_playwright, expect
import time

def test_tooltip_positioning():
    """Test that info icon tooltips appear centered on screen instead of off-screen"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Show browser for visual verification
        page = browser.new_page()
        
        # Navigate to the app
        page.goto("http://localhost:8000")
        dismiss_welcome_modal(page)
        
        # Test Agent modal info icon
        print("Testing Agent modal info icon...")
        settings_button = page.locator("#settings-button")
        settings_button.click()
        
        agent_tab = page.locator("button:has-text('Agents')")
        agent_tab.click()
        
        # Wait for agent modal to be visible
        page.wait_for_selector("#agent-modal", state="visible")
        
        # Find the info icon in the agent modal
        agent_info_icon = page.locator("#agent-modal .settings-header .info-icon")
        expect(agent_info_icon).to_be_visible()
        
        screenshot_with_markdown(page, "before_agent_tooltip", {
            "Status": "Before hovering agent info icon",
            "Modal": "Agent modal visible"
        })
        
        # Hover over the info icon to show tooltip
        agent_info_icon.hover()
        
        # Wait a moment for tooltip to appear
        page.wait_for_timeout(500)
        
        screenshot_with_markdown(page, "agent_tooltip_visible", {
            "Status": "Agent info tooltip should be centered on screen",
            "Modal": "Agent modal with tooltip"
        })
        
        # Test MCP modal info icon
        print("Testing MCP modal info icon...")
        mcp_tab = page.locator("button:has-text('MCP')")
        mcp_tab.click()
        
        # Wait for MCP modal to be visible  
        page.wait_for_selector("#mcp-modal", state="visible")
        
        # Find the info icon in the MCP modal
        mcp_info_icon = page.locator("#mcp-modal .settings-header .info-icon")
        expect(mcp_info_icon).to_be_visible()
        
        # Hover over the info icon to show tooltip
        mcp_info_icon.hover()
        
        # Wait a moment for tooltip to appear
        page.wait_for_timeout(500)
        
        screenshot_with_markdown(page, "mcp_tooltip_visible", {
            "Status": "MCP info tooltip should be centered on screen",
            "Modal": "MCP modal with tooltip"
        })
        
        print("Visual test complete. Check screenshots to verify tooltips are centered.")
        
        # Keep browser open for manual inspection
        page.pause()
        
        browser.close()

if __name__ == "__main__":
    test_tooltip_positioning()