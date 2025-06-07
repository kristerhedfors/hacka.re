import pytest
from playwright.sync_api import expect

def test_welcome_modal_first_visit(page):
    """Test that welcome modal appears on first visit and not on subsequent visits."""
    
    # Navigate to the test page first
    page.goto("http://localhost:8000/_tests/welcome-manager-test.html")
    
    # Clear localStorage to simulate first visit
    page.evaluate("localStorage.clear()")
    
    # Verify localStorage is empty
    storage_items = page.evaluate("Object.keys(localStorage)")
    assert len(storage_items) == 0, "localStorage should be empty on first visit"
    
    # Test the welcome modal
    page.click("#test-welcome")
    
    # Verify the modal was shown
    welcome_result = page.locator("#welcome-result")
    expect(welcome_result).to_contain_text("Welcome modal was shown")
    
    # Close any modal that might be open
    modal = page.locator(".modal.active")
    if modal.count() > 0:
        page.click("#close-welcome-modal")
    
    # Clear the result
    page.evaluate('document.getElementById("welcome-result").innerHTML = ""')
    
    # Test again - now the modal should not show because localStorage has hacka_re variables
    page.click("#test-welcome")
    
    # Verify the modal was not shown
    welcome_result = page.locator("#welcome-result")
    expect(welcome_result).to_contain_text("Welcome modal was NOT shown")

def test_has_visited_before_with_hacka_re_variable(page):
    """Test that hasVisitedBefore returns true when any hacka_re variable exists."""
    
    # Navigate to the test page first
    page.goto("http://localhost:8000/_tests/welcome-manager-test.html")
    
    # Clear localStorage
    page.evaluate("localStorage.clear()")
    
    # Test hasVisitedBefore - should be false with empty localStorage
    page.click("#test-has-visited")
    has_visited_result = page.locator("#has-visited-result")
    expect(has_visited_result).to_contain_text("hasVisitedBefore() returned FALSE")
    
    # Add a hacka_re variable
    page.click("#add-dummy-var")
    
    # Test hasVisitedBefore again - should be true now
    page.click("#test-has-visited")
    has_visited_result = page.locator("#has-visited-result")
    expect(has_visited_result).to_contain_text("hasVisitedBefore() returned TRUE")

def test_welcome_modal_with_existing_hacka_re_variable(page):
    """Test that welcome modal doesn't appear when any hacka_re variable exists."""
    
    # Navigate to the test page first
    page.goto("http://localhost:8000/_tests/welcome-manager-test.html")
    
    # Clear localStorage
    page.evaluate("localStorage.clear()")
    
    # Add a hacka_re variable
    page.evaluate("localStorage.setItem('hacka_re_test', 'dummy_value')")
    
    # Test the welcome modal
    page.click("#test-welcome")
    
    # Verify the modal was not shown
    welcome_result = page.locator("#welcome-result")
    expect(welcome_result).to_contain_text("Welcome modal was NOT shown")
