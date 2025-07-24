"""
Test Agent Prompts Configuration Save/Load
Tests that agents properly save and restore prompts configuration including:
- Custom prompt library (user-created prompts)
- Selected prompts state
- Prompt content and metadata
- Prompt ordering and organization
"""
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_agent_prompts_config_save_load(page: Page, serve_hacka_re, api_key):
    """Test agent save/load for prompts configuration aspects"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== AGENT PROMPTS CONFIG SAVE/LOAD TEST ===")
    
    # Step 1: Set up basic API first
    print("\nStep 1: Setting up basic API configuration...")
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    page.locator('#api-key-update').fill(api_key)
    page.locator('#base-url-select').select_option('groq')
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Step 2: Add custom prompts to library
    print("Step 2: Adding custom prompts to library...")
    page.locator('#prompts-btn').click()
    page.wait_for_timeout(1000)
    
    # Add first custom prompt
    page.locator('#new-prompt-label').fill('Code Review Assistant')
    page.locator('#new-prompt-content').fill('You are an expert code reviewer. Please analyze the provided code for best practices, potential bugs, security issues, and performance improvements. Provide specific, actionable feedback.')
    page.locator('.new-prompt-save').click()
    page.wait_for_timeout(500)
    
    # Add second custom prompt
    page.locator('#new-prompt-label').fill('Documentation Writer')
    page.locator('#new-prompt-content').fill('You are a technical documentation specialist. Help create clear, comprehensive documentation for code, APIs, and software projects. Focus on clarity and usefulness for developers.')
    page.locator('.new-prompt-save').click()
    page.wait_for_timeout(500)
    
    # Add third custom prompt
    page.locator('#new-prompt-label').fill('Bug Investigator')
    page.locator('#new-prompt-content').fill('You are a debugging expert. Help identify the root cause of bugs and suggest effective solutions. Ask clarifying questions and provide step-by-step debugging approaches.')
    page.locator('.new-prompt-save').click()
    page.wait_for_timeout(500)
    
    # Step 3: Select specific prompts (enable some, leave others disabled)
    print("Step 3: Selecting specific prompts...")
    
    # Select Code Review Assistant
    code_review_item = page.locator('.prompt-item:has-text("Code Review Assistant")')
    if code_review_item.count() > 0:
        code_review_checkbox = code_review_item.locator('.prompt-item-checkbox')
        if not code_review_checkbox.is_checked():
            code_review_checkbox.check()
            page.wait_for_timeout(500)
    
    # Select Bug Investigator but leave Documentation Writer unselected
    bug_investigator_item = page.locator('.prompt-item:has-text("Bug Investigator")')
    if bug_investigator_item.count() > 0:
        bug_investigator_checkbox = bug_investigator_item.locator('.prompt-item-checkbox')
        if not bug_investigator_checkbox.is_checked():
            bug_investigator_checkbox.check()
            page.wait_for_timeout(500)
    
    page.locator('#close-prompts-modal').click()
    page.wait_for_timeout(500)
    
    # Step 4: Capture original prompts configuration
    print("Step 4: Capturing original prompts configuration...")
    original_prompts_config = page.evaluate("""() => {
        return {
            library: window.PromptsService ? window.PromptsService.getPrompts() : {},
            selectedIds: window.PromptsService ? window.PromptsService.getSelectedPromptIds() : []
        };
    }""")
    
    print(f"Original prompts config: Library count={len(original_prompts_config['library'])}, Selected count={len(original_prompts_config['selectedIds'])}")
    
    # Get prompt details for verification
    prompt_names = []
    for prompt_id, prompt_data in original_prompts_config['library'].items():
        prompt_names.append(prompt_data.get('label', 'Unknown'))
    
    print(f"Prompts in library: {prompt_names}")
    print(f"Selected prompt IDs: {original_prompts_config['selectedIds']}")
    
    # Step 5: Save as agent
    print("Step 5: Saving prompts configuration as agent...")
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    page.locator('#quick-agent-name').fill('prompts-config-test-agent')
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(2000)
    
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Step 6: Clear prompts configuration
    print("Step 6: Clearing prompts configuration...")
    page.locator('#prompts-btn').click()
    page.wait_for_timeout(1000)
    
    # Clear all custom prompts
    clear_btn = page.locator('button:has-text("Clear All")')
    if clear_btn.count():
        clear_btn.click()
        page.wait_for_timeout(500)
    
    page.locator('#close-prompts-modal').click()
    page.wait_for_timeout(500)
    
    # Step 7: Verify prompts configuration was cleared
    print("Step 7: Verifying prompts configuration was cleared...")
    cleared_prompts_config = page.evaluate("""() => {
        return {
            library: window.PromptsService ? window.PromptsService.getPrompts() : {},
            selectedIds: window.PromptsService ? window.PromptsService.getSelectedPromptIds() : []
        };
    }""")
    
    print(f"Cleared prompts config: Library count={len(cleared_prompts_config['library'])}, Selected count={len(cleared_prompts_config['selectedIds'])}")
    
    # Step 8: Load the saved agent
    print("Step 8: Loading saved agent...")
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(3000)  # Wait for agent to load
    
    if page.locator('#agent-config-modal').is_visible():
        page.locator('#close-agent-config-modal').click()
        page.wait_for_timeout(500)
    
    # Step 9: Verify prompts configuration was restored
    print("Step 9: Verifying prompts configuration restored...")
    restored_prompts_config = page.evaluate("""() => {
        return {
            library: window.PromptsService ? window.PromptsService.getPrompts() : {},
            selectedIds: window.PromptsService ? window.PromptsService.getSelectedPromptIds() : []
        };
    }""")
    
    print(f"Restored prompts config: Library count={len(restored_prompts_config['library'])}, Selected count={len(restored_prompts_config['selectedIds'])}")
    
    # Get restored prompt details
    restored_prompt_names = []
    for prompt_id, prompt_data in restored_prompts_config['library'].items():
        restored_prompt_names.append(prompt_data.get('label', 'Unknown'))
    
    print(f"Restored prompts in library: {restored_prompt_names}")
    print(f"Restored selected prompt IDs: {restored_prompts_config['selectedIds']}")
    
    screenshot_with_markdown(page, "agent_prompts_config_test", {
        "Test Phase": "Prompts configuration save/load complete",
        "Original Library Count": str(len(original_prompts_config['library'])),
        "Restored Library Count": str(len(restored_prompts_config['library'])),
        "Original Selected Count": str(len(original_prompts_config['selectedIds'])),
        "Restored Selected Count": str(len(restored_prompts_config['selectedIds'])),
        "Library Restored": str(len(restored_prompts_config['library']) == len(original_prompts_config['library'])),
        "Selection Restored": str(len(restored_prompts_config['selectedIds']) == len(original_prompts_config['selectedIds'])),
        "Original Prompts": str(prompt_names),
        "Restored Prompts": str(restored_prompt_names)
    })
    
    # Step 10: Validate all prompts configuration was restored
    print("Step 10: Validating prompts configuration restoration...")
    
    # Prompt library should be restored
    assert len(restored_prompts_config['library']) == len(original_prompts_config['library']), \
        f"Prompt library count not restored: expected {len(original_prompts_config['library'])}, got {len(restored_prompts_config['library'])}"
    
    # Check specific prompts exist with correct content
    expected_prompts = ['Code Review Assistant', 'Documentation Writer', 'Bug Investigator']
    for expected_prompt in expected_prompts:
        found_prompt = False
        for prompt_id, prompt_data in restored_prompts_config['library'].items():
            if prompt_data.get('label') == expected_prompt:
                found_prompt = True
                # Verify content is not empty
                assert len(prompt_data.get('content', '')) > 50, f"Prompt '{expected_prompt}' content too short or empty"
                break
        assert found_prompt, f"Expected prompt '{expected_prompt}' not found in restored library"
    
    # Selected prompts should be restored
    assert len(restored_prompts_config['selectedIds']) == len(original_prompts_config['selectedIds']), \
        f"Selected prompts count not restored: expected {len(original_prompts_config['selectedIds'])}, got {len(restored_prompts_config['selectedIds'])}"
    
    # Verify the same prompts are selected
    assert set(restored_prompts_config['selectedIds']) == set(original_prompts_config['selectedIds']), \
        f"Selected prompt IDs not restored correctly: expected {set(original_prompts_config['selectedIds'])}, got {set(restored_prompts_config['selectedIds'])}"
    
    print("\n🎉 Agent prompts configuration save/load test completed successfully!")
    print("✅ All prompts configuration aspects were saved and restored correctly")
    print(f"✅ Prompt library: {len(original_prompts_config['library'])} → {len(restored_prompts_config['library'])}")
    print(f"✅ Selected prompts: {len(original_prompts_config['selectedIds'])} → {len(restored_prompts_config['selectedIds'])}")
    print(f"✅ Prompt names: {prompt_names} → {restored_prompt_names}")

def test_agent_prompts_config_empty_state(page: Page, serve_hacka_re, api_key):
    """Test prompts configuration with empty state"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== AGENT PROMPTS CONFIG EMPTY STATE TEST ===")
    
    # Set up API
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    page.locator('#api-key-update').fill(api_key)
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Ensure prompts are empty
    page.locator('#prompts-btn').click()
    page.wait_for_timeout(1000)
    clear_btn = page.locator('button:has-text("Clear All")')
    if clear_btn.count():
        clear_btn.click()
        page.wait_for_timeout(500)
    page.locator('#close-prompts-modal').click()
    page.wait_for_timeout(500)
    
    # Save agent with empty prompts
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    page.locator('#quick-agent-name').fill('empty-prompts-agent')
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(2000)
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Add some prompts
    page.locator('#prompts-btn').click()
    page.wait_for_timeout(1000)
    page.locator('#new-prompt-label').fill('Temp Prompt')
    page.locator('#new-prompt-content').fill('Temporary prompt content')
    page.locator('.new-prompt-save').click()
    page.wait_for_timeout(500)
    page.locator('#close-prompts-modal').click()
    page.wait_for_timeout(500)
    
    # Load agent and verify empty state is restored
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(3000)
    if page.locator('#agent-config-modal').is_visible():
        page.locator('#close-agent-config-modal').click()
        page.wait_for_timeout(500)
    
    # Verify empty state was restored
    restored_prompts_config = page.evaluate("""() => {
        return {
            library: window.PromptsService ? window.PromptsService.getPrompts() : {},
            selectedIds: window.PromptsService ? window.PromptsService.getSelectedPromptIds() : []
        };
    }""")
    
    # Should be empty (or only contain default prompts, not our custom ones)
    custom_prompts = []
    for prompt_id, prompt_data in restored_prompts_config['library'].items():
        if prompt_data.get('label') == 'Temp Prompt':
            custom_prompts.append(prompt_data.get('label'))
    
    assert len(custom_prompts) == 0, f"Custom prompts should be cleared but found: {custom_prompts}"
    
    print("✅ Empty prompts configuration state handled correctly")
    print("\n🎉 Agent prompts configuration empty state test completed successfully!")

def test_agent_prompts_config_mixed_selection(page: Page, serve_hacka_re, api_key):
    """Test prompts configuration with mixed default and custom prompts"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== AGENT PROMPTS CONFIG MIXED SELECTION TEST ===")
    
    # Set up API
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    page.locator('#api-key-update').fill(api_key)
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Configure mixed prompts selection
    page.locator('#prompts-btn').click()
    page.wait_for_timeout(1000)
    
    # Add a custom prompt
    page.locator('#new-prompt-label').fill('Custom Mixed Test')
    page.locator('#new-prompt-content').fill('This is a custom prompt for mixed testing.')
    page.locator('.new-prompt-save').click()
    page.wait_for_timeout(500)
    
    # Select the custom prompt
    custom_prompt_item = page.locator('.prompt-item:has-text("Custom Mixed Test")')
    if custom_prompt_item.count() > 0:
        custom_checkbox = custom_prompt_item.locator('.prompt-item-checkbox')
        if not custom_checkbox.is_checked():
            custom_checkbox.check()
            page.wait_for_timeout(500)
    
    # Also select a default prompt if available
    default_prompt_item = page.locator('.default-prompt-item').first
    if default_prompt_item.count() > 0:
        default_checkbox = default_prompt_item.locator('.prompt-item-checkbox')
        if not default_checkbox.is_checked():
            default_checkbox.check()
            page.wait_for_timeout(500)
    
    page.locator('#close-prompts-modal').click()
    page.wait_for_timeout(500)
    
    # Capture mixed configuration
    mixed_config = page.evaluate("""() => {
        return {
            library: window.PromptsService ? window.PromptsService.getPrompts() : {},
            selectedIds: window.PromptsService ? window.PromptsService.getSelectedPromptIds() : []
        };
    }""")
    
    print(f"Mixed config: Library count={len(mixed_config['library'])}, Selected count={len(mixed_config['selectedIds'])}")
    
    # Save, clear, and restore
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    page.locator('#quick-agent-name').fill('mixed-prompts-agent')
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(2000)
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Clear all
    page.locator('#prompts-btn').click()
    page.wait_for_timeout(1000)
    clear_btn = page.locator('button:has-text("Clear All")')
    if clear_btn.count():
        clear_btn.click()
        page.wait_for_timeout(500)
    page.locator('#close-prompts-modal').click()
    page.wait_for_timeout(500)
    
    # Load and verify
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(3000)
    if page.locator('#agent-config-modal').is_visible():
        page.locator('#close-agent-config-modal').click()
        page.wait_for_timeout(500)
    
    # Verify mixed configuration restored
    restored_mixed_config = page.evaluate("""() => {
        return {
            library: window.PromptsService ? window.PromptsService.getPrompts() : {},
            selectedIds: window.PromptsService ? window.PromptsService.getSelectedPromptIds() : []
        };
    }""")
    
    print(f"Restored mixed config: Library count={len(restored_mixed_config['library'])}, Selected count={len(restored_mixed_config['selectedIds'])}")
    
    # Verify both custom and default prompts were preserved
    custom_prompt_found = False
    for prompt_id, prompt_data in restored_mixed_config['library'].items():
        if prompt_data.get('label') == 'Custom Mixed Test':
            custom_prompt_found = True
            break
    
    assert custom_prompt_found, "Custom prompt 'Custom Mixed Test' not found after restore"
    
    # Verify selection count matches
    assert len(restored_mixed_config['selectedIds']) == len(mixed_config['selectedIds']), \
        f"Mixed selection count mismatch: expected {len(mixed_config['selectedIds'])}, got {len(restored_mixed_config['selectedIds'])}"
    
    print("✅ Mixed custom and default prompts configuration preserved correctly")
    print("\n🎉 Agent prompts configuration mixed selection test completed successfully!")

if __name__ == "__main__":
    test_agent_prompts_config_save_load()
    test_agent_prompts_config_empty_state()
    test_agent_prompts_config_mixed_selection()