"""Test MCP Introspection Service fixes"""
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, dismiss_settings_modal, screenshot_with_markdown
import time
import json

def test_introspection_functions_work(page: Page, serve_hacka_re):
    """Test that all introspection functions work correctly after fixes"""
    
    # Navigate and dismiss welcome modal
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Open function modal
    function_btn = page.locator("#function-btn")
    function_btn.click()
    
    # Wait for modal to be visible
    page.wait_for_selector("#function-modal", state="visible", timeout=5000)
    
    # Add introspection_read_file function
    function_code = page.locator("#function-code")
    function_code.fill("""
async function introspection_read_file(params) {
    return await window.MCPIntrospectionService.readFile(params);
}
""")
    
    # Wait for function name to auto-populate
    page.wait_for_timeout(500)
    
    # Validate function
    validate_btn = page.locator("#function-validate-btn")
    validate_btn.click()
    
    # Wait for validation result
    page.wait_for_selector("#function-validation-result:not(:empty)", state="visible", timeout=5000)
    
    # Add introspection_search_pattern function
    function_code.fill("""
async function introspection_search_pattern(params) {
    return await window.MCPIntrospectionService.searchPattern(params);
}
""")
    
    page.wait_for_timeout(500)
    validate_btn.click()
    page.wait_for_selector("#function-validation-result:not(:empty)", state="visible", timeout=5000)
    
    # Add introspection_find_definition function
    function_code.fill("""
async function introspection_find_definition(params) {
    return await window.MCPIntrospectionService.findDefinition(params);
}
""")
    
    page.wait_for_timeout(500)
    validate_btn.click()
    page.wait_for_selector("#function-validation-result:not(:empty)", state="visible", timeout=5000)
    
    # Close modal
    close_btn = page.locator("#close-function-modal")
    close_btn.click()
    page.wait_for_selector("#function-modal", state="hidden", timeout=5000)
    
    # Open browser console to see test results
    page.evaluate("""
        console.log('Testing introspection functions...');
    """)
    
    # Test read file
    result = page.evaluate("""
        async () => {
            try {
                const result = await window.MCPIntrospectionService.readFile({path: 'js/app.js'});
                console.log('Read file result:', result);
                return result;
            } catch (error) {
                console.error('Read file error:', error);
                return {success: false, error: error.message};
            }
        }
    """)
    
    assert result['success'], f"Read file failed: {result.get('error')}"
    assert 'content' in result, "Read file should return content"
    
    # Test search pattern
    result = page.evaluate("""
        async () => {
            try {
                const result = await window.MCPIntrospectionService.searchPattern({
                    pattern: 'ChatManager',
                    fileFilter: '*.js'
                });
                console.log('Search pattern result:', result);
                return result;
            } catch (error) {
                console.error('Search pattern error:', error);
                return {success: false, error: error.message};
            }
        }
    """)
    
    assert result['success'], f"Search pattern failed: {result.get('error')}"
    assert result['totalFound'] > 0, "Search should find ChatManager references"
    
    # Test find definition
    result = page.evaluate("""
        async () => {
            try {
                const result = await window.MCPIntrospectionService.findDefinition({
                    name: 'ChatManager',
                    type: 'any'
                });
                console.log('Find definition result:', result);
                return result;
            } catch (error) {
                console.error('Find definition error:', error);
                return {success: false, error: error.message};
            }
        }
    """)
    
    assert result['success'], f"Find definition failed: {result.get('error')}"
    assert result['totalFound'] > 0, "Find definition should find ChatManager"
    
    # Test get architecture overview
    result = page.evaluate("""
        async () => {
            try {
                const result = await window.MCPIntrospectionService.getArchitectureOverview();
                console.log('Get architecture overview result:', result);
                return result;
            } catch (error) {
                console.error('Get architecture overview error:', error);
                return {success: false, error: error.message};
            }
        }
    """)
    
    assert result['success'], f"Get architecture overview failed: {result.get('error')}"
    assert 'architecture' in result, "Get architecture overview should return architecture"
    
    screenshot_with_markdown(page, "introspection_tests_complete", {
        "Status": "All introspection functions tested successfully",
        "Functions": "readFile, searchPattern, findDefinition, getArchitectureOverview",
        "Result": "All functions work correctly"
    })