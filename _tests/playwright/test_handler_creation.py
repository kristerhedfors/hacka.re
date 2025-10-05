"""
Test if handlers are being created for OpenAI Library
"""

import pytest
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal


def test_handler_creation(page: Page, serve_hacka_re):
    """Test if event handlers are created"""
    page.goto(serve_hacka_re)

    # Inject monitoring before anything loads
    page.add_init_script("""
        window.bindPromptEventsCalls = [];
        window.checkboxHandlerCalls = [];
    """)

    # Patch the binding functions
    page.evaluate("""
        () => {
            // Store original
            const originalCreateHandler = window.PromptsEventHandlers.createCheckboxHandler;

            // Patch to log calls
            window.PromptsEventHandlers.createCheckboxHandler = function(promptId, isDefault, onSelectionChange) {
                console.log('createCheckboxHandler called for:', promptId);
                window.checkboxHandlerCalls.push({ promptId, isDefault });
                return originalCreateHandler.call(this, promptId, isDefault, onSelectionChange);
            };
        }
    """)

    dismiss_welcome_modal(page)

    page.locator("#prompts-btn").click()
    page.wait_for_selector("#prompts-modal", state="visible")
    page.wait_for_timeout(1000)

    # Check if handlers were created
    handler_calls = page.evaluate("() => window.checkboxHandlerCalls")

    print("\nCheckbox handler calls:")
    for call in handler_calls:
        print(f"  {call['promptId']}: isDefault={call['isDefault']}")

    openai_handler = next((c for c in handler_calls if 'openai-prompt-library' in c['promptId']), None)
    print(f"\nOpenAI Library handler: {openai_handler}")

    assert openai_handler is not None, "Handler for OpenAI Library was not created!"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
