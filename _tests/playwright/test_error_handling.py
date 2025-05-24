import pytest
from playwright.sync_api import expect, Page

def test_error_handler_utility_exists(page: Page):
    """Test that the error-handler.js file is properly loaded."""
    page.goto("http://localhost:8000/")
    
    # Check if the error-handler.js script is loaded
    script_loaded = page.evaluate("""() => {
        return typeof window.ErrorHandler !== 'undefined' && 
               typeof window.ErrorHandler.fetchWithErrorHandling === 'function';
    }""")
    
    assert script_loaded, "ErrorHandler utility is not loaded or not properly initialized"

def test_error_handler_test_page_loads(page: Page):
    """Test that the error handling test page loads correctly."""
    page.goto("http://localhost:8000/_tests/detailed-error-handling-test.html")
    
    # Check if the page title is correct
    expect(page).to_have_title("Detailed Error Handling Test")
    
    # Check if the main elements are present
    expect(page.locator("h1")).to_have_text("Detailed Error Handling Test")
    expect(page.locator("#standard-error-btn")).to_be_visible()
    expect(page.locator("#detailed-error-btn")).to_be_visible()

def test_standard_vs_detailed_error_comparison(page: Page):
    """Test the difference between standard and detailed error messages."""
    page.goto("http://localhost:8000/_tests/detailed-error-handling-test.html")
    
    # Click the standard error button
    page.click("#standard-error-btn")
    
    # Wait for the error container to be visible
    page.wait_for_selector("#standard-error-container", state="visible")
    
    # Get the standard error message
    standard_error_text = page.text_content("#standard-error-message")
    
    # Click the detailed error button
    page.click("#detailed-error-btn")
    
    # Wait for the error container to be visible
    page.wait_for_selector("#detailed-error-container", state="visible")
    
    # Get the detailed error message
    detailed_error_text = page.text_content("#detailed-error-message")
    
    # Verify that the standard error is simple and generic
    assert standard_error_text == "Failed to fetch", "Standard error message should be 'Failed to fetch'"
    
    # Verify that the detailed error is more informative
    assert len(detailed_error_text) > len(standard_error_text), "Detailed error should be longer than standard error"
    assert "API REQUEST FAILED" in detailed_error_text, "Detailed error should contain 'API REQUEST FAILED'"
    assert "HTTP Status:" in detailed_error_text or "Error Type:" in detailed_error_text, "Detailed error should contain status or error type information"
    assert "Request Details:" in detailed_error_text, "Detailed error should contain request details"

def test_error_handler_integration_with_api_service(page: Page):
    """Test that the API service is using the error handler."""
    page.goto("http://localhost:8000/")
    
    # Mock a failed API request and check if it uses the error handler
    is_using_error_handler = page.evaluate("""() => {
        // Create a spy on the ErrorHandler.fetchWithErrorHandling method
        if (!window.ErrorHandler) return false;
        
        const originalFetchWithErrorHandling = window.ErrorHandler.fetchWithErrorHandling;
        let wasErrorHandlerCalled = false;
        
        window.ErrorHandler.fetchWithErrorHandling = function(...args) {
            wasErrorHandlerCalled = true;
            return originalFetchWithErrorHandling.apply(this, args);
        };
        
        // Trigger a model reload which will make an API request
        // This assumes there's no valid API key set, which will cause an error
        if (window.ApiService && typeof window.ApiService.fetchAvailableModels === 'function') {
            try {
                window.ApiService.fetchAvailableModels('invalid_key').catch(() => {});
            } catch (e) {
                // Ignore errors
            }
        }
        
        // Restore the original function
        window.ErrorHandler.fetchWithErrorHandling = originalFetchWithErrorHandling;
        
        return wasErrorHandlerCalled;
    }""")
    
    assert is_using_error_handler, "API service should be using the ErrorHandler utility"

def test_error_handler_includes_technical_details(page: Page):
    """Test that the error handler includes all required technical details."""
    page.goto("http://localhost:8000/_tests/detailed-error-handling-test.html")
    
    # Test 401 Unauthorized error which should have more specific details
    page.click("#401-error-btn")
    page.wait_for_selector("#detailed-error-container", state="visible")
    detailed_error_text = page.text_content("#detailed-error-message")
    
    # Check for required technical information
    technical_details = [
        "HTTP Status: 401",
        "Unauthorized",
        "API Error Details:",
        "Request Details:",
        "Method:",
        "URL:",
        "Network Status:",
        "Browser:",
        "Timestamp:"
    ]
    
    for detail in technical_details:
        assert detail in detailed_error_text, f"Error message should contain '{detail}'"
    
    # Verify no human-oriented advice is included
    assert "SUPPORT:" not in detailed_error_text, "Error should not contain support information"
    assert "TROUBLESHOOTING STEPS:" not in detailed_error_text, "Error should not contain troubleshooting steps"
    assert "contact the API provider" not in detailed_error_text, "Error should not contain contact information"

def test_error_handler_properties(page: Page):
    """Test that the error handler adds useful properties to the error object."""
    page.goto("http://localhost:8000/_tests/detailed-error-handling-test.html")
    
    # Test error properties
    error_properties = page.evaluate("""async () => {
        try {
            await window.ErrorHandler.fetchWithErrorHandling(
                'https://api.example.com/nonexistent', 
                {}, 
                'Test API'
            );
            return null; // Should not reach here
        } catch (error) {
            return {
                hasStatusCode: error.statusCode !== undefined,
                hasStatusText: error.statusText !== undefined,
                hasEndpoint: error.endpoint !== undefined,
                hasTimestamp: error.timestamp !== undefined,
                hasOriginalError: error.originalError !== undefined,
                hasRequestDetails: error.requestDetails !== undefined
            };
        }
    }""")
    
    assert error_properties, "Error handler should return an error"
    assert error_properties["hasStatusCode"], "Error should have statusCode property"
    assert error_properties["hasStatusText"], "Error should have statusText property"
    assert error_properties["hasEndpoint"], "Error should have endpoint property"
    assert error_properties["hasTimestamp"], "Error should have timestamp property"
    assert error_properties["hasOriginalError"], "Error should have originalError property"
    assert error_properties["hasRequestDetails"], "Error should have requestDetails property"
