#!/usr/bin/env python3
"""
Test the new welcome modal logic with hackare_visited key
"""

import pytest
import time
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal

def test_welcome_modal_shows_when_hackare_visited_true(page: Page, serve_hacka_re):
    """Test that welcome modal appears when hackare_visited is true"""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Set hackare_visited to true to trigger welcome modal
    page.evaluate("localStorage.setItem('hackare_visited', 'true')")
    
    # Refresh the page to trigger the welcome modal check
    page.reload()
    
    # Wait for page to load
    page.wait_for_load_state("networkidle")
    
    # Check if welcome modal is visible
    welcome_modal = page.locator("#welcome-modal")
    expect(welcome_modal).to_be_visible(timeout=2000)
    
    # Check modal content
    expect(welcome_modal.locator("h2")).to_contain_text("Welcome to hacka.re!")
    
    # Close the modal
    close_button = welcome_modal.locator("#close-welcome-modal")
    close_button.click()
    
    # Modal should be gone
    expect(welcome_modal).not_to_be_visible()
    
    print("✅ Welcome modal correctly shown when hackare_visited=true")

def test_welcome_modal_hidden_when_hackare_visited_false(page: Page, serve_hacka_re):
    """Test that welcome modal is hidden when hackare_visited is false"""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Set hackare_visited to false to prevent welcome modal
    page.evaluate("localStorage.setItem('hackare_visited', 'false')")
    
    # Refresh the page to trigger the welcome modal check
    page.reload()
    
    # Wait for page to load
    page.wait_for_load_state("networkidle")
    
    # Check if welcome modal is NOT visible
    welcome_modal = page.locator("#welcome-modal")
    expect(welcome_modal).not_to_be_visible()
    
    print("✅ Welcome modal correctly hidden when hackare_visited=false")

def test_welcome_modal_hidden_when_hackare_visited_missing(page: Page, serve_hacka_re):
    """Test that welcome modal is hidden when hackare_visited key is missing"""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Clear localStorage to ensure hackare_visited is missing
    page.evaluate("localStorage.clear()")
    
    # Refresh the page to trigger the welcome modal check
    page.reload()
    
    # Wait for page to load
    page.wait_for_load_state("networkidle")
    
    # Check if welcome modal is NOT visible
    welcome_modal = page.locator("#welcome-modal")
    expect(welcome_modal).not_to_be_visible()
    
    print("✅ Welcome modal correctly hidden when hackare_visited key is missing")