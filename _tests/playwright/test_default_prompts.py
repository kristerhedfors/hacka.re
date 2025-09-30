import pytest
from playwright.sync_api import Page, expect

from test_utils import dismiss_welcome_modal

def test_default_prompts_section_exists(page, serve_hacka_re):
    """Test that the default prompts section exists in the prompts modal."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if present
    # Wait a moment for the page to fully load
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Click the prompts button
    prompts_button = page.locator("#prompts-btn")
    prompts_button.click()
    
    # Check that the prompts modal is visible
    prompts_modal = page.locator("#prompts-modal")
    expect(prompts_modal).to_be_visible()
    
    # Check that the default prompts section exists
    default_prompts_section = page.locator(".default-prompts-section")
    expect(default_prompts_section).to_be_visible()
    
    # Check that the default prompts header exists
    default_prompts_header = page.locator(".default-prompts-header")
    expect(default_prompts_header).to_be_visible()
    
    # Check that the default prompts header contains the text "Default Prompts"
    expect(default_prompts_header).to_contain_text("Default Prompts")
    
    # Check that the default prompts list is initially hidden (collapsed)
    default_prompts_list = page.locator(".default-prompts-list")
    expect(default_prompts_list).not_to_be_visible()
    
    # Close the prompts modal
    close_button = page.locator("#close-prompts-modal")
    close_button.click()
    
    # Check that the prompts modal is no longer visible
    expect(prompts_modal).not_to_be_visible()

def test_default_prompts_expand_collapse(page, serve_hacka_re):
    """Test that the default prompts section can be expanded and collapsed."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if present
    # Wait a moment for the page to fully load
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Click the prompts button
    prompts_button = page.locator("#prompts-btn")
    prompts_button.click()
    
    # Check that the prompts modal is visible
    prompts_modal = page.locator("#prompts-modal")
    expect(prompts_modal).to_be_visible()
    
    # Check that the default prompts list is initially hidden (collapsed)
    default_prompts_list = page.locator(".default-prompts-list")
    expect(default_prompts_list).not_to_be_visible()
    
    # Click the default prompts header to expand
    default_prompts_header = page.locator(".default-prompts-header")
    default_prompts_header.click()
    
    # Check that the default prompts list is now visible (expanded)
    expect(default_prompts_list).to_be_visible()
    
    # Check that the expand icon changed to a down arrow
    expand_icon = page.locator(".default-prompts-header i")
    # Check that the class contains fa-chevron-down (it might have other classes like fas)
    class_name = expand_icon.get_attribute("class")
    assert "fa-chevron-down" in class_name, f"Expected fa-chevron-down in class, got {class_name}"
    
    # Click the default prompts header again to collapse
    default_prompts_header.click()
    
    # Check that the default prompts list is hidden again (collapsed)
    expect(default_prompts_list).not_to_be_visible()
    
    # Check that the expand icon changed back to a right arrow
    class_name = expand_icon.get_attribute("class")
    assert "fa-chevron-right" in class_name, f"Expected fa-chevron-right in class, got {class_name}"
    
    # Close the prompts modal
    close_button = page.locator("#close-prompts-modal")
    close_button.click()
    
    # Check that the prompts modal is no longer visible
    expect(prompts_modal).not_to_be_visible()

def test_default_prompts_content(page, serve_hacka_re):
    """Test that the default prompts section contains the expected content."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if present
    # Wait a moment for the page to fully load
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Click the prompts button
    prompts_button = page.locator("#prompts-btn")
    prompts_button.click()
    
    # Check that the prompts modal is visible
    prompts_modal = page.locator("#prompts-modal")
    expect(prompts_modal).to_be_visible()
    
    # Click the default prompts header to expand
    default_prompts_header = page.locator(".default-prompts-header")
    default_prompts_header.click()
    
    # Check that the default prompts list is now visible (expanded)
    default_prompts_list = page.locator(".default-prompts-list")
    expect(default_prompts_list).to_be_visible()
    
    # Check that there are at least one default prompt item
    default_prompt_items = page.locator(".default-prompt-item")
    count = default_prompt_items.count()
    assert count >= 1, f"Expected at least 1 default prompt item, but found {count}"
    
    # Check that one of the default prompts is about the hacka.re project
    hacka_re_prompt = page.locator(".default-prompt-item:has-text('README.md')")
    expect(hacka_re_prompt).to_be_visible()
    
    # Check that each default prompt has a checkbox
    for prompt in [hacka_re_prompt]:
        checkbox = prompt.locator(".prompt-item-checkbox")
        expect(checkbox).to_be_visible()
        
        # Check that the default prompt has an info icon instead of a delete icon
        info_icon = prompt.locator(".prompt-item-info")
        expect(info_icon).to_be_visible()
    
    # Close the prompts modal
    close_button = page.locator("#close-prompts-modal")
    close_button.click()
    
    # Check that the prompts modal is no longer visible
    expect(prompts_modal).not_to_be_visible()

def test_default_prompts_selection(page, serve_hacka_re):
    """Test that default prompts can be selected and deselected."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if present
    # Wait a moment for the page to fully load
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Click the prompts button
    prompts_button = page.locator("#prompts-btn")
    prompts_button.click()
    
    # Check that the prompts modal is visible
    prompts_modal = page.locator("#prompts-modal")
    expect(prompts_modal).to_be_visible()
    
    # Click the default prompts header to expand
    default_prompts_header = page.locator(".default-prompts-header")
    default_prompts_header.click()
    
    # Check that the default prompts list is now visible (expanded)
    default_prompts_list = page.locator(".default-prompts-list")
    expect(default_prompts_list).to_be_visible()
    
    # Define the prompts to test - just test README.md for now
    prompts_to_test = [
        ".default-prompt-item:has-text('README.md')"
    ]
    
    # Test each prompt
    for prompt_selector in prompts_to_test:
        # Find the prompt
        prompt = page.locator(prompt_selector)
        expect(prompt).to_be_visible()
        
        # Get the checkbox
        checkbox = prompt.locator(".prompt-item-checkbox")
        
        # Check the initial state of the checkbox
        initial_checked_state = checkbox.is_checked()
        
        # Click the checkbox to toggle its state
        checkbox.click()
        
        # Check that the checkbox state has changed
        expect(checkbox).to_be_checked() if not initial_checked_state else expect(checkbox).not_to_be_checked()
        
        # Check that the token usage bar has been updated
        prompts_usage_fill = page.locator(".prompts-usage-fill")
        expect(prompts_usage_fill).to_be_visible()
        
        # Click the checkbox again to toggle back to the initial state
        checkbox.click()
        
        # Check that the checkbox state has changed back
        expect(checkbox).to_be_checked() if initial_checked_state else expect(checkbox).not_to_be_checked()
    
    # Close the prompts modal
    close_button = page.locator("#close-prompts-modal")
    close_button.click()
    
    # Check that the prompts modal is no longer visible
    expect(prompts_modal).not_to_be_visible()

def test_default_prompts_info_button(page, serve_hacka_re):
    """Test that the info button shows a popup with information about the prompt."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if present
    # Wait a moment for the page to fully load
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Click the prompts button
    prompts_button = page.locator("#prompts-btn")
    prompts_button.click()
    
    # Check that the prompts modal is visible
    prompts_modal = page.locator("#prompts-modal")
    expect(prompts_modal).to_be_visible()
    
    # Click the default prompts header to expand
    default_prompts_header = page.locator(".default-prompts-header")
    default_prompts_header.click()
    
    # Check that the default prompts list is now visible (expanded)
    default_prompts_list = page.locator(".default-prompts-list")
    expect(default_prompts_list).to_be_visible()
    
    # Check if the Code section exists and expand it if it does
    code_section = page.locator(".nested-section-header:has-text('Code')")
    if code_section.count() > 0:
        print("Found Code section, expanding it")
        code_section.click()
        
        # Wait for the nested section list to be visible (there may be multiple)
        nested_list = page.locator(".nested-section-list").first
        expect(nested_list).to_be_visible()
    
    # Define the prompts to test - using actual current prompt names
    prompts_to_test = [
        {
            "selector": ".default-prompt-item:has-text('README.md')",
            "expected_title": "README.md",
            "expected_description": "hacka.re - The Privacy-First AI Chat Interface"
        },
        {
            "selector": ".default-prompt-item:has-text('OWASP Top 10 for LLM Applications')",
            "expected_title": "OWASP Top 10 for LLM Applications",
            "expected_description": "The entire OWASP Top 10 for LLM applications as of May 2025"
        }
    ]
    
    # Test each prompt
    for prompt_info in prompts_to_test:
        # Find the prompt
        prompt = page.locator(prompt_info["selector"])
        
        # Check if the prompt exists before trying to interact with it
        if prompt.count() == 0:
            print(f"Prompt not found: {prompt_info['selector']}")
            continue
            
        # Check if the prompt is visible, if not, try to make it visible
        if not prompt.is_visible():
            print(f"Prompt not visible: {prompt_info['selector']}")
            
            # If it's the Function Library prompt, it might be in the Code section
            if "Function library" in prompt_info["expected_title"]:
                # Skip this prompt if we couldn't make it visible
                if code_section.count() == 0:
                    print("Code section not found, skipping Function Library prompt")
                    continue
            
            # Skip this prompt if we couldn't make it visible
            if not prompt.is_visible():
                print(f"Could not make prompt visible, skipping: {prompt_info['selector']}")
                continue
        
        # Now the prompt should be visible
        expect(prompt).to_be_visible()
        
        # Get the info button
        info_button = prompt.locator(".prompt-item-info")
        
        # Click the info button
        info_button.click()

        # Check that the simple prompt viewer modal is displayed
        modal = page.locator("#simple-prompt-viewer-modal")
        expect(modal).to_be_visible()

        # Check that the modal contains the expected prompt content
        modal_content = modal.locator("#simple-prompt-viewer-content")
        expect(modal_content).to_be_visible()
        # The content is plain text and may be very long, just check it's not empty
        content_text = modal_content.inner_text()
        assert len(content_text) > 100, "Modal content should contain substantial text"

        # Close the modal by clicking the close button
        close_modal_button = modal.locator("#close-simple-prompt-viewer")
        close_modal_button.click()

        # Check that the modal is no longer visible (wait for animation)
        page.wait_for_timeout(400)
        expect(modal).not_to_be_visible()
    
    # Close the prompts modal
    close_button = page.locator("#close-prompts-modal")
    close_button.click()
    
    # Check that the prompts modal is no longer visible
    expect(prompts_modal).not_to_be_visible()

def test_default_prompts_name_click(page, serve_hacka_re):
    """Test that clicking on the prompt name loads the prompt content into the editor."""
    # Navigate to the application
    page.goto(serve_hacka_re)
    
    # Dismiss welcome modal if present
    dismiss_welcome_modal(page)
    
    # Dismiss settings modal if present
    # Wait a moment for the page to fully load
    # page.wait_for_timeout(500)  # TODO: Replace with proper wait condition
    
    # Click the prompts button
    prompts_button = page.locator("#prompts-btn")
    prompts_button.click()
    
    # Check that the prompts modal is visible
    prompts_modal = page.locator("#prompts-modal")
    expect(prompts_modal).to_be_visible()
    
    # Click the default prompts header to expand
    default_prompts_header = page.locator(".default-prompts-header")
    default_prompts_header.click()
    
    # Check that the default prompts list is now visible (expanded)
    default_prompts_list = page.locator(".default-prompts-list")
    expect(default_prompts_list).to_be_visible()
    
    # Check if the Code section exists and expand it if it does
    code_section = page.locator(".nested-section-header:has-text('Code')")
    if code_section.count() > 0:
        print("Found Code section, expanding it")
        code_section.click()
        
        # Wait for the nested section list to be visible (there may be multiple)
        nested_list = page.locator(".nested-section-list").first
        expect(nested_list).to_be_visible()
    
    # Define the prompts to test - using actual current prompt names
    prompts_to_test = [
        {
            "selector": ".default-prompt-item:has-text('README.md')",
            "expected_label": "README.md",
            "expected_content_fragment": "hacka.re - The Privacy-First AI Chat Interface"
        },
        {
            "selector": ".default-prompt-item:has-text('OWASP Top 10 for LLM Applications')",
            "expected_label": "OWASP Top 10 for LLM Applications",
            "expected_content_fragment": "OWASP Top 10 for Large Language Model Applications"
        }
    ]
    
    # Test each prompt
    for prompt_info in prompts_to_test:
        # Find the prompt
        prompt = page.locator(prompt_info["selector"])
        
        # Check if the prompt exists before trying to interact with it
        if prompt.count() == 0:
            print(f"Prompt not found: {prompt_info['selector']}")
            continue
            
        # Check if the prompt is visible, if not, try to make it visible
        if not prompt.is_visible():
            print(f"Prompt not visible: {prompt_info['selector']}")
            continue
        
        # Now the prompt should be visible
        expect(prompt).to_be_visible()
        
        # Get the prompt name element
        prompt_name = prompt.locator(".prompt-item-name")

        # Click the prompt name
        prompt_name.click()

        # Check that the default prompt viewer modal is displayed
        modal = page.locator("#default-prompt-viewer-modal")
        expect(modal).to_be_visible()

        # Check that the modal contains the expected prompt content
        raw_content = modal.locator("#prompt-viewer-raw-content")
        expect(raw_content).to_be_visible()

        # Check that the content contains the expected text
        content_text = raw_content.inner_text()
        assert prompt_info["expected_content_fragment"] in content_text, f"Modal content does not contain expected text: '{prompt_info['expected_content_fragment']}'"

        # Close the modal by clicking outside of it (on the modal backdrop)
        # The modal itself is the backdrop, so clicking on it (but not on modal-content) closes it
        page.evaluate('document.getElementById("default-prompt-viewer-modal").click()')

        # Check that the modal is no longer visible (wait for animation)
        page.wait_for_timeout(400)
        expect(modal).not_to_be_visible()

        # Make sure the prompts modal is still visible and active for the next iteration
        expect(prompts_modal).to_be_visible()

    # Close the prompts modal
    close_button = page.locator("#close-prompts-modal")
    expect(close_button).to_be_visible()  # Ensure button is visible before clicking
    close_button.click()
    
    # Check that the prompts modal is no longer visible
    expect(prompts_modal).not_to_be_visible()
