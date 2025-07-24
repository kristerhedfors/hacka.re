"""
Test Agent Function Configuration Save/Load
Tests that agents properly save and restore function calling configuration including:
- Function library (JavaScript functions)
- Enabled function selection
- Tools enabled/disabled state
- Function validation states
- Function metadata and descriptions
"""
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_agent_function_config_save_load(page: Page, serve_hacka_re, api_key):
    """Test agent save/load for function calling configuration aspects"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== AGENT FUNCTION CONFIG SAVE/LOAD TEST ===")
    
    # Step 1: Set up basic API first
    print("\\nStep 1: Setting up basic API configuration...")
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    page.locator('#api-key-update').fill(api_key)
    page.locator('#base-url-select').select_option('groq')
    
    # Enable tool calling
    tool_calling_checkbox = page.locator('#tool-calling-checkbox')
    if tool_calling_checkbox.count() and not tool_calling_checkbox.is_checked():
        tool_calling_checkbox.check()
        page.wait_for_timeout(500)
    
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Step 2: Add functions to library
    print("Step 2: Adding functions to library...")
    page.locator('#function-btn').click()
    page.wait_for_timeout(1000)
    
    # Add first test function
    function_code_1 = '''/**
     * Calculate the area of a rectangle
     * @param {number} width - Width of rectangle
     * @param {number} height - Height of rectangle
     * @returns {number} The area
     */
    function calculateArea(width, height) {
        return width * height;
    }'''
    
    page.locator('#function-code').fill(function_code_1)
    page.wait_for_timeout(500)
    
    # Validate and submit first function
    page.locator('#function-validate-btn').click()
    page.wait_for_timeout(1000)
    page.locator('#function-editor-form button[type="submit"]').click()
    page.wait_for_timeout(1000)
    
    # Add second test function
    function_code_2 = '''/**
     * Convert temperature from Celsius to Fahrenheit
     * @param {number} celsius - Temperature in Celsius
     * @returns {number} Temperature in Fahrenheit
     */
    function celsiusToFahrenheit(celsius) {
        return (celsius * 9/5) + 32;
    }'''
    
    page.locator('#function-code').fill(function_code_2)
    page.wait_for_timeout(500)
    
    # Validate and submit second function
    page.locator('#function-validate-btn').click()
    page.wait_for_timeout(1000)
    page.locator('#function-editor-form button[type="submit"]').click()
    page.wait_for_timeout(1000)
    
    page.locator('#close-function-modal').click()
    page.wait_for_timeout(500)
    
    # Step 3: Capture original function configuration
    print("Step 3: Capturing original function configuration...")
    original_function_config = page.evaluate("""() => {
        return {
            library: window.FunctionToolsService ? window.FunctionToolsService.getJsFunctions() : {},
            enabled: window.FunctionToolsService ? window.FunctionToolsService.getEnabledFunctionNames() : [],
            toolsEnabled: window.FunctionToolsService ? window.FunctionToolsService.isFunctionToolsEnabled() : false
        };
    }""")
    
    print(f"Original function config: Library count={len(original_function_config['library'])}, Enabled count={len(original_function_config['enabled'])}, Tools enabled={original_function_config['toolsEnabled']}")
    print(f"Functions in library: {list(original_function_config['library'].keys())}")
    print(f"Enabled functions: {original_function_config['enabled']}")
    
    # Step 4: Save as agent
    print("Step 4: Saving function configuration as agent...")
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    page.locator('#quick-agent-name').fill('function-config-test-agent')
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(2000)
    
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Step 5: Clear function configuration
    print("Step 5: Clearing function configuration...")
    page.locator('#function-btn').click()
    page.wait_for_timeout(1000)
    
    # Clear all functions
    clear_btn = page.locator('button:has-text("Clear All")')
    if clear_btn.count():
        clear_btn.click()
        page.wait_for_timeout(500)
    
    page.locator('#close-function-modal').click()
    page.wait_for_timeout(500)
    
    # Step 6: Verify function configuration was cleared
    print("Step 6: Verifying function configuration was cleared...")
    cleared_function_config = page.evaluate("""() => {
        return {
            library: window.FunctionToolsService ? window.FunctionToolsService.getJsFunctions() : {},
            enabled: window.FunctionToolsService ? window.FunctionToolsService.getEnabledFunctionNames() : [],
            toolsEnabled: window.FunctionToolsService ? window.FunctionToolsService.isFunctionToolsEnabled() : false
        };
    }""")
    
    print(f"Cleared function config: Library count={len(cleared_function_config['library'])}, Enabled count={len(cleared_function_config['enabled'])}, Tools enabled={cleared_function_config['toolsEnabled']}")
    
    # Step 7: Load the saved agent
    print("Step 7: Loading saved agent...")
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(3000)  # Wait for agent to load
    
    if page.locator('#agent-config-modal').is_visible():
        page.locator('#close-agent-config-modal').click()
        page.wait_for_timeout(500)
    
    # Step 8: Verify function configuration was restored
    print("Step 8: Verifying function configuration restored...")
    restored_function_config = page.evaluate("""() => {
        return {
            library: window.FunctionToolsService ? window.FunctionToolsService.getJsFunctions() : {},
            enabled: window.FunctionToolsService ? window.FunctionToolsService.getEnabledFunctionNames() : [],
            toolsEnabled: window.FunctionToolsService ? window.FunctionToolsService.isFunctionToolsEnabled() : false
        };
    }""")
    
    print(f"Restored function config: Library count={len(restored_function_config['library'])}, Enabled count={len(restored_function_config['enabled'])}, Tools enabled={restored_function_config['toolsEnabled']}")
    print(f"Functions in library: {list(restored_function_config['library'].keys())}")
    print(f"Enabled functions: {restored_function_config['enabled']}")
    
    screenshot_with_markdown(page, "agent_function_config_test", {
        "Test Phase": "Function configuration save/load complete",
        "Original Library Count": str(len(original_function_config['library'])),
        "Restored Library Count": str(len(restored_function_config['library'])),
        "Original Enabled Count": str(len(original_function_config['enabled'])),
        "Restored Enabled Count": str(len(restored_function_config['enabled'])),
        "Original Tools": str(original_function_config['toolsEnabled']),
        "Restored Tools": str(restored_function_config['toolsEnabled']),
        "Library Restored": str(len(restored_function_config['library']) == len(original_function_config['library'])),
        "Enabled Restored": str(len(restored_function_config['enabled']) == len(original_function_config['enabled'])),
        "Tools Restored": str(restored_function_config['toolsEnabled'] == original_function_config['toolsEnabled'])
    })
    
    # Step 9: Validate all function configuration was restored
    print("Step 9: Validating function configuration restoration...")
    
    # Function library should be restored
    assert len(restored_function_config['library']) == len(original_function_config['library']), \
        f"Function library count not restored: expected {len(original_function_config['library'])}, got {len(restored_function_config['library'])}"
    
    # Check specific functions exist
    for func_name in original_function_config['library'].keys():
        assert func_name in restored_function_config['library'], f"Function {func_name} not restored in library"
        
        # Verify function code was restored
        original_code = original_function_config['library'][func_name].get('code', '')
        restored_code = restored_function_config['library'][func_name].get('code', '')
        assert 'calculateArea' in restored_code or 'celsiusToFahrenheit' in restored_code, \
            f"Function {func_name} code not restored correctly"
    
    # Enabled functions should be restored
    assert len(restored_function_config['enabled']) == len(original_function_config['enabled']), \
        f"Enabled functions count not restored: expected {len(original_function_config['enabled'])}, got {len(restored_function_config['enabled'])}"
    
    for func_name in original_function_config['enabled']:
        assert func_name in restored_function_config['enabled'], f"Function {func_name} not enabled after restore"
    
    # Tools enabled state should be restored
    assert restored_function_config['toolsEnabled'] == original_function_config['toolsEnabled'], \
        f"Tools enabled state not restored: expected {original_function_config['toolsEnabled']}, got {restored_function_config['toolsEnabled']}"
    
    print("\\n🎉 Agent function configuration save/load test completed successfully!")
    print("✅ All function configuration aspects were saved and restored correctly")
    print(f"✅ Function library: {len(original_function_config['library'])} → {len(restored_function_config['library'])}")
    print(f"✅ Enabled functions: {len(original_function_config['enabled'])} → {len(restored_function_config['enabled'])}")
    print(f"✅ Tools enabled: {original_function_config['toolsEnabled']} → {restored_function_config['toolsEnabled']}")

def test_agent_function_config_selective_enable(page: Page, serve_hacka_re, api_key):
    """Test function configuration with selective enabling/disabling"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== AGENT FUNCTION CONFIG SELECTIVE ENABLE TEST ===")
    
    # Set up API
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    page.locator('#api-key-update').fill(api_key)
    page.locator('#base-url-select').select_option('groq')
    
    tool_calling_checkbox = page.locator('#tool-calling-checkbox')
    if tool_calling_checkbox.count() and not tool_calling_checkbox.is_checked():
        tool_calling_checkbox.check()
    
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Add multiple functions
    page.locator('#function-btn').click()
    page.wait_for_timeout(1000)
    
    # Add bundle of functions
    function_bundle = '''/**
     * Math utility functions
     */
    function add(a, b) { return a + b; }
    function multiply(a, b) { return a * b; }
    function subtract(a, b) { return a - b; }'''
    
    page.locator('#function-code').fill(function_bundle)
    page.wait_for_timeout(500)
    page.locator('#function-validate-btn').click()
    page.wait_for_timeout(1000)
    page.locator('#function-editor-form button[type="submit"]').click()
    page.wait_for_timeout(1000)
    
    # Disable one function (by unchecking its checkbox)
    subtract_checkbox = page.locator('.function-item:has-text("subtract") input[type="checkbox"]')
    if subtract_checkbox.count() and subtract_checkbox.is_checked():
        subtract_checkbox.uncheck()
        page.wait_for_timeout(500)
    
    page.locator('#close-function-modal').click()
    page.wait_for_timeout(500)
    
    # Capture selective configuration
    selective_config = page.evaluate("""() => {
        return {
            library: window.FunctionToolsService ? window.FunctionToolsService.getJsFunctions() : {},
            enabled: window.FunctionToolsService ? window.FunctionToolsService.getEnabledFunctionNames() : []
        };
    }""")
    
    print(f"Selective config: Library={list(selective_config['library'].keys())}, Enabled={selective_config['enabled']}")
    
    # Save agent
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    page.locator('#quick-agent-name').fill('selective-function-agent')
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(2000)
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Clear and reload
    page.locator('#function-btn').click()
    page.wait_for_timeout(1000)
    clear_btn = page.locator('button:has-text("Clear All")')
    if clear_btn.count():
        clear_btn.click()
        page.wait_for_timeout(500)
    page.locator('#close-function-modal').click()
    page.wait_for_timeout(500)
    
    # Load agent
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(3000)
    if page.locator('#agent-config-modal').is_visible():
        page.locator('#close-agent-config-modal').click()
        page.wait_for_timeout(500)
    
    # Verify selective configuration restored
    restored_selective_config = page.evaluate("""() => {
        return {
            library: window.FunctionToolsService ? window.FunctionToolsService.getJsFunctions() : {},
            enabled: window.FunctionToolsService ? window.FunctionToolsService.getEnabledFunctionNames() : []
        };
    }""")
    
    print(f"Restored selective config: Library={list(restored_selective_config['library'].keys())}, Enabled={restored_selective_config['enabled']}")
    
    # Verify selective enabling was preserved
    assert len(restored_selective_config['library']) == len(selective_config['library']), \
        "Function library count mismatch in selective test"
    
    assert set(restored_selective_config['enabled']) == set(selective_config['enabled']), \
        f"Enabled functions mismatch: expected {set(selective_config['enabled'])}, got {set(restored_selective_config['enabled'])}"
    
    # Verify that 'subtract' is in library but not enabled (if our test setup worked)
    if 'subtract' in restored_selective_config['library']:
        if 'subtract' not in selective_config['enabled']:
            assert 'subtract' not in restored_selective_config['enabled'], \
                "Disabled function 'subtract' should not be enabled after restore"
    
    print("✅ Selective function enabling/disabling preserved correctly")
    print("\\n🎉 Agent function configuration selective enable test completed successfully!")

if __name__ == "__main__":
    test_agent_function_config_save_load()
    test_agent_function_config_selective_enable()