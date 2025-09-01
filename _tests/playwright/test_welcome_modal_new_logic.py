#!/usr/bin/env python3
"""
Test the new welcome modal logic - shows only for first-time users
"""

import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal

def test_welcome_modal_shows_for_first_time_user(page: Page, serve_hacka_re):
    """Test that welcome modal appears for first-time users (no hackare_ variables)"""
    # Clear all localStorage before navigating to simulate first-time user
    page.goto(serve_hacka_re)
    page.evaluate("localStorage.clear()")
    
    # Navigate fresh to trigger welcome modal check
    page.goto(serve_hacka_re)
    
    # Wait for page to load
    page.wait_for_load_state("networkidle")
    
    # Check if welcome modal is visible - give it more time as it's created dynamically
    welcome_modal = page.locator("#welcome-modal")
    expect(welcome_modal).to_be_visible(timeout=5000)
    
    # Check modal content
    expect(welcome_modal.locator("h2")).to_contain_text("Welcome to hacka.re!")
    
    # Check that button says "Close" (actual implementation)
    close_button = welcome_modal.locator("button.primary-btn")
    expect(close_button).to_contain_text("Close")
    
    # Click Close button
    close_button.click()
    
    # Modal should be gone
    expect(welcome_modal).not_to_be_visible()
    
    # Settings modal should NOT automatically open
    settings_modal = page.locator("#settings-modal")
    expect(settings_modal).not_to_have_class("active")
    
    print("✅ Welcome modal correctly shown for first-time user, settings NOT auto-opened")

def test_welcome_modal_hidden_for_returning_user(page: Page, serve_hacka_re):
    """Test that welcome modal is hidden when user has hackare_ variables"""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Set a hackare_ variable to indicate returning user
    page.evaluate("localStorage.setItem('hackare_test_data', 'some_value')")
    
    # Refresh the page to trigger the welcome modal check
    page.reload()
    
    # Wait for page to load
    page.wait_for_load_state("networkidle")
    
    # Welcome modal should not be visible
    welcome_modal = page.locator("#welcome-modal")
    expect(welcome_modal).not_to_be_visible()
    
    # Settings modal should also not be visible
    settings_modal = page.locator("#settings-modal")
    expect(settings_modal).not_to_have_class("active")
    
    print("✅ Welcome modal correctly hidden for returning user")

def test_welcome_modal_disabled_with_url_param(page: Page, serve_hacka_re):
    """Test that welcome modal can be disabled via URL parameter"""
    # Navigate with welcome=false parameter first
    page.goto(f"{serve_hacka_re}#welcome=false")
    
    # Clear localStorage to simulate first-time user
    page.evaluate("localStorage.clear()")
    
    # Reload to trigger welcome modal check
    page.reload()
    
    # Wait for page to load
    page.wait_for_load_state("networkidle")
    
    # Welcome modal should not be visible even for first-time user
    welcome_modal = page.locator("#welcome-modal")
    expect(welcome_modal).not_to_be_visible()
    
    print("✅ Welcome modal correctly disabled with URL parameter")

def test_no_auto_settings_after_welcome(page: Page, serve_hacka_re):
    """Test that Settings modal doesn't automatically open after Welcome modal"""
    # Navigate to the application first
    page.goto(serve_hacka_re)
    
    # Clear localStorage to simulate first-time user
    page.evaluate("localStorage.clear()")
    
    # Reload to trigger welcome modal check
    page.reload()
    
    # Wait for welcome modal
    welcome_modal = page.locator("#welcome-modal")
    expect(welcome_modal).to_be_visible(timeout=2000)
    
    # Click the close button (alternative to Get Started)
    close_button = welcome_modal.locator("#close-welcome-modal")
    close_button.click()
    
    # Welcome modal should be gone
    expect(welcome_modal).not_to_be_visible()
    
    # Settings modal should NOT be visible
    settings_modal = page.locator("#settings-modal")
    expect(settings_modal).not_to_have_class("active")
    
    print("✅ Settings modal does not auto-open after closing Welcome modal")