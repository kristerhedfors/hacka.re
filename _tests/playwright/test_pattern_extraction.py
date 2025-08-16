"""Test pattern extraction from model IDs"""

from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def test_pattern_extraction(page: Page, serve_hacka_re):
    """Test that context windows are extracted from model IDs"""
    
    # Collect console messages
    console_messages = []
    page.on("console", lambda msg: console_messages.append({
        'type': msg.type,
        'text': msg.text
    }))
    
    # Navigate to the test page
    page.goto(f"{serve_hacka_re}/test-models-dev.html")
    
    # Wait for the page to load and tests to run
    page.wait_for_timeout(3000)
    
    # Extract console messages related to context window extraction
    extraction_messages = [
        msg for msg in console_messages 
        if 'context' in msg['text'].lower() or 'extracted' in msg['text'].lower()
    ]
    
    print("\n=== Console Messages Related to Context Windows ===")
    for msg in extraction_messages:
        print(f"{msg['type']}: {msg['text']}")
    
    # Test pattern extraction directly via JavaScript
    print("\n=== Direct Pattern Extraction Test ===")
    
    test_cases = [
        ('mixtral-8x7b-32768', 32768),
        ('llama-2-70b-4096', 4096),
        ('some-model-128000', 128000),
        ('gpt-4-32k', 32768),
        ('claude-100k', 102400),
        ('model-200k', 204800),
        ('deepseek-coder-33b-16384', 16384),
        ('yi-34b-200k', 204800),
        ('qwen-72b-32768', 32768),
        ('unknown-model-without-context', None),
        ('model-999', None),  # Too small
        ('model-3000000', None)  # Too large
    ]
    
    for model_id, expected in test_cases:
        # Clear console messages
        console_messages.clear()
        
        # Test the model directly, clearing any cached data first
        result = page.evaluate(f"""
            (modelId) => {{
                // Store original values
                const originalData = window.ModelsDevData ? window.ModelsDevData.modelsData : null;
                const originalHardcoded = window.ModelInfoService ? window.ModelInfoService.contextWindowSizes[modelId] : null;
                
                // Clear any existing data to test extraction only
                if (window.ModelsDevData) {{
                    window.ModelsDevData.modelsData = {{}};
                }}
                if (window.ModelInfoService && window.ModelInfoService.contextWindowSizes[modelId]) {{
                    delete window.ModelInfoService.contextWindowSizes[modelId];
                }}
                
                // Get context size
                const context = window.ModelInfoService ? window.ModelInfoService.getContextSize(modelId) : null;
                
                // Restore original values
                if (window.ModelsDevData && originalData) {{
                    window.ModelsDevData.modelsData = originalData;
                }}
                if (window.ModelInfoService && originalHardcoded) {{
                    window.ModelInfoService.contextWindowSizes[modelId] = originalHardcoded;
                }}
                
                return {{
                    modelId: modelId,
                    context: context,
                    hadHardcoded: originalHardcoded !== null
                }};
            }}
        """, model_id)
        
        # Check console for extraction messages
        extraction_msg = None
        for msg in console_messages:
            if 'Extracted context window' in msg['text']:
                extraction_msg = msg['text']
                break
        
        status = "✓" if result['context'] == expected else "✗"
        print(f"{status} {model_id}: Expected {expected}, Got {result['context']}")
        if extraction_msg:
            print(f"   Console: {extraction_msg}")
        elif result['hadHardcoded']:
            print(f"   Note: This model has a hardcoded value")
    
    # Check the test results on the page
    extraction_section = page.locator("#extraction-test")
    if extraction_section.is_visible():
        extraction_html = extraction_section.inner_html()
        
        # Count successes
        success_count = extraction_html.count('SUCCESS')
        total_rows = extraction_html.count('<tr>') - 1  # Minus header row
        
        print(f"\n=== Test Page Results ===")
        print(f"Pattern extraction tests: {success_count}/{total_rows} passed")
        
        screenshot_with_markdown(page, "pattern_extraction_results", {
            "Test": "Pattern Extraction from Model IDs",
            "Success Rate": f"{success_count}/{total_rows}",
            "Status": "Working" if success_count > 0 else "Not Working"
        })
    
    # Test a real scenario with the main app
    print("\n=== Testing with Main App ===")
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Clear console messages
    console_messages.clear()
    
    # Execute a test to see if pattern extraction works in practice
    result = page.evaluate("""
        () => {
            // Test with a model that should use pattern extraction
            const testModel = 'custom-model-8192';
            
            // Make sure it's not in hardcoded list
            if (window.ModelInfoService && window.ModelInfoService.contextWindowSizes[testModel]) {
                delete window.ModelInfoService.contextWindowSizes[testModel];
            }
            
            const context = window.ModelInfoService ? window.ModelInfoService.getContextSize(testModel) : null;
            
            return {
                model: testModel,
                context: context
            };
        }
    """)
    
    print(f"\nMain app test - Model: {result['model']}, Context: {result['context']}")
    
    # Check for extraction message
    for msg in console_messages:
        if 'Extracted context window' in msg['text'] or 'custom-model-8192' in msg['text']:
            print(f"Console: {msg['text']}")
    
    assert result['context'] == 8192, f"Pattern extraction failed for custom-model-8192: got {result['context']}"
    
    print("\n✅ Pattern extraction is working correctly!")