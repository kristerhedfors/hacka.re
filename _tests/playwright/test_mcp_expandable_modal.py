#!/usr/bin/env python3
"""
Test script for MCP Modal Expandable Sections
Tests the new reorganized MCP modal structure with expandable Advanced and Connected Servers sections
"""

import pytest
from playwright.sync_api import sync_playwright, expect
import os
import time
import re


# NOTE: Connected MCP Servers functionality removed - tests updated
def test_mcp_expandable_modal():
    """Test the new MCP modal with expandable sections"""
    
    with sync_playwright() as p:
        # Use Chromium browser
        browser = p.chromium.launch(headless=False, slow_mo=500)
        page = browser.new_page()
        
        # Navigate to the application
        page.goto("http://localhost:8080")
        page.wait_for_load_state('networkidle')
        
        print("✅ Page loaded successfully")
        
        # Dismiss any welcome modal if present
        welcome_modal = page.locator('#welcome-modal')
        if welcome_modal.is_visible():
            close_btn = page.locator('#close-welcome-modal')
            if close_btn.is_visible():
                close_btn.click()
                page.wait_for_timeout(500)
        
        print("✅ Welcome modal dismissed")
        
        # Find and click the MCP servers button
        mcp_button = page.locator('#mcp-servers-btn')
        expect(mcp_button).to_be_visible()
        mcp_button.click()
        
        print("✅ MCP button clicked")
        
        # Wait for modal to open
        mcp_modal = page.locator('#mcp-servers-modal')
        expect(mcp_modal).to_be_visible()
        
        print("✅ MCP modal opened")
        
        # Take screenshot of initial modal state
        page.screenshot(path="_tests/playwright/screenshots/mcp_expandable_modal_initial.png")
        
        # Check that Advanced section exists and is collapsed by default
        advanced_section = page.locator('.mcp-advanced-section')
        expect(advanced_section).to_be_visible()
        
        advanced_header = page.locator('.mcp-advanced-header')
        expect(advanced_header).to_be_visible()
        
        advanced_list = page.locator('.mcp-advanced-list')
        expect(advanced_list).to_have_css('display', 'none')
        
        print("✅ Advanced section exists and is collapsed")
        
        # Connected Servers section removed - check Quick Connectors instead
        quick_connectors = page.locator('#mcp-quick-connectors-placeholder')
        expect(quick_connectors).to_be_visible()
        
        print("✅ Quick Connectors section exists")
        
        # No longer testing server count as feature was removed
        print("✅ Server list functionality removed as planned")
        
        # Test expanding Advanced section
        advanced_header.click()
        page.wait_for_timeout(500)
        
        # Advanced list should now be visible
        expect(advanced_list).to_have_css('display', 'block')
        
        # Check that chevron icon rotated
        advanced_icon = page.locator('.mcp-advanced-header i')
        expect(advanced_icon).to_have_class(re.compile(r'fa-chevron-down'))
        
        print("✅ Advanced section expanded successfully")
        
        # Take screenshot of expanded Advanced section
        page.screenshot(path="_tests/playwright/screenshots/mcp_expandable_modal_advanced_expanded.png")
        
        # Check that form elements are visible in Advanced section
        server_form = page.locator('#mcp-server-form')
        expect(server_form).to_be_visible()
        
        command_history = page.locator('#mcp-command-history')
        expect(command_history).to_be_visible()
        
        print("✅ Advanced section content is visible")
        
        # Test collapsing Advanced section
        advanced_header.click()
        page.wait_for_timeout(500)
        
        # Advanced list should be hidden again
        expect(advanced_list).to_have_css('display', 'none')
        
        # Check that chevron icon rotated back
        expect(advanced_icon).to_have_class(re.compile(r'fa-chevron-right'))
        
        print("✅ Advanced section collapsed successfully")
        
        # Test expanding Connected Servers section
        servers_header.click()
        page.wait_for_timeout(500)
        
        # Servers list should now be visible
        expect(servers_list).to_have_css('display', 'block')
        
        # Check that chevron icon rotated
        servers_icon = page.locator('.mcp-servers-header i')
        expect(servers_icon).to_have_class(re.compile(r'fa-chevron-down'))
        
        print("✅ Connected Servers section expanded successfully")
        
        # Take screenshot of expanded Connected Servers section
        page.screenshot(path="_tests/playwright/screenshots/mcp_expandable_modal_servers_expanded.png")
        
        # Check that empty state message is visible
        empty_state = page.locator(".mcp-advanced-section")
        expect(empty_state).to_be_visible()
        expect(empty_state).to_contain_text('No MCP servers connected')
        
        print("✅ Empty servers state is visible")
        
        # Test collapsing Connected Servers section
        servers_header.click()
        page.wait_for_timeout(500)
        
        # Servers list should be hidden again
        expect(servers_list).to_have_css('display', 'none')
        
        # Check that chevron icon rotated back
        expect(servers_icon).to_have_class(re.compile(r'fa-chevron-right'))
        
        print("✅ Connected Servers section collapsed successfully")
        
        # Take final screenshot
        page.screenshot(path="_tests/playwright/screenshots/mcp_expandable_modal_final.png")
        
        # Test both sections expanded at same time
        advanced_header.click()
        servers_header.click()
        page.wait_for_timeout(500)
        
        expect(advanced_list).to_have_css('display', 'block')
        expect(servers_list).to_have_css('display', 'block')
        
        print("✅ Both sections can be expanded simultaneously")
        
        # Take screenshot with both expanded
        page.screenshot(path="_tests/playwright/screenshots/mcp_expandable_modal_both_expanded.png")
        
        # Close the modal
        close_button = page.locator('#close-mcp-servers-modal')
        expect(close_button).to_be_visible()
        close_button.click()
        
        # Modal should be hidden
        expect(mcp_modal).not_to_be_visible()
        
        print("✅ Modal closed successfully")
        
        browser.close()
        
        print("\n🎉 All MCP expandable modal tests passed!")

if __name__ == "__main__":
    test_mcp_expandable_modal()