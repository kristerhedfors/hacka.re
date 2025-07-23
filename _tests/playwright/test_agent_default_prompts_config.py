"""
Test Agent Default Prompts Configuration Save/Load
Tests that agents properly save and restore default prompts configuration including:
- System default prompts (hacka.re, OWASP, etc.)
- Default prompt selection states
- Default prompt enabling/disabling
- Default prompt metadata preservation
"""
from playwright.sync_api import Page
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_agent_default_prompts_config_save_load(page: Page, serve_hacka_re, api_key):
    """Test agent save/load for default prompts configuration aspects"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== AGENT DEFAULT PROMPTS CONFIG SAVE/LOAD TEST ===")
    
    # Step 1: Set up basic API first
    print("\nStep 1: Setting up basic API configuration...")
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    page.locator('#api-key-update').fill(api_key)
    page.locator('#base-url-select').select_option('groq')
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Step 2: Configure default prompts selection
    print("Step 2: Configuring default prompts selection...")
    page.locator('#prompts-btn').click()
    page.wait_for_timeout(1000)
    
    # Get all default prompts available
    default_prompt_items = page.locator('.default-prompt-item')
    default_prompt_count = default_prompt_items.count()
    print(f"Found {default_prompt_count} default prompts")
    
    # Select specific default prompts
    selected_defaults = []
    
    # Try to select hacka.re default prompt
    hacka_re_prompt = page.locator('.default-prompt-item:has-text("hacka.re")')
    if hacka_re_prompt.count() > 0:
        hacka_re_checkbox = hacka_re_prompt.locator('.prompt-item-checkbox')
        if not hacka_re_checkbox.is_checked():
            hacka_re_checkbox.check()
            page.wait_for_timeout(500)
            selected_defaults.append('hacka.re')
    
    # Try to select OWASP prompt
    owasp_prompt = page.locator('.default-prompt-item:has-text("OWASP")')
    if owasp_prompt.count() > 0:
        owasp_checkbox = owasp_prompt.locator('.prompt-item-checkbox')
        if not owasp_checkbox.is_checked():
            owasp_checkbox.check()
            page.wait_for_timeout(500)
            selected_defaults.append('OWASP')
    
    # Leave other default prompts unselected for testing
    print(f"Selected default prompts: {selected_defaults}")
    
    page.locator('#close-prompts-modal').click()
    page.wait_for_timeout(500)
    
    # Step 3: Capture original default prompts configuration
    print("Step 3: Capturing original default prompts configuration...")
    original_default_config = page.evaluate("""() => {
        const allPrompts = window.PromptsService ? window.PromptsService.getPrompts() : {};
        const selectedIds = window.PromptsService ? window.PromptsService.getSelectedPromptIds() : [];
        
        // Filter for default prompts only
        const defaultPrompts = {};
        for (const [id, prompt] of Object.entries(allPrompts)) {
            if (prompt.isDefault) {
                defaultPrompts[id] = prompt;
            }
        }
        
        // Count selected default prompts
        const selectedDefaults = selectedIds.filter(id => {
            return allPrompts[id] && allPrompts[id].isDefault;
        });
        
        return {
            defaultLibrary: defaultPrompts,
            selectedDefaultIds: selectedDefaults,
            totalSelected: selectedIds.length,
            defaultPromptNames: Object.values(defaultPrompts).map(p => p.label || 'Unknown')
        };
    }""")
    
    print(f"Original default config: Default library count={len(original_default_config['defaultLibrary'])}, Selected defaults={len(original_default_config['selectedDefaultIds'])}, Total selected={original_default_config['totalSelected']}")
    print(f"Default prompt names: {original_default_config['defaultPromptNames']}")
    print(f"Selected default IDs: {original_default_config['selectedDefaultIds']}")
    
    # Step 4: Save as agent
    print("Step 4: Saving default prompts configuration as agent...")
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    
    page.locator('#quick-agent-name').fill('default-prompts-config-test-agent')
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(2000)
    
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Step 5: Clear all prompts (including default selections)
    print("Step 5: Clearing all prompts...")
    page.locator('#prompts-btn').click()
    page.wait_for_timeout(1000)
    
    # Uncheck all default prompts
    all_default_items = page.locator('.default-prompt-item')
    for i in range(all_default_items.count()):
        default_item = all_default_items.nth(i)
        checkbox = default_item.locator('.prompt-item-checkbox')
        if checkbox.is_checked():
            checkbox.uncheck()
            page.wait_for_timeout(200)
    
    page.locator('#close-prompts-modal').click()
    page.wait_for_timeout(500)
    
    # Step 6: Verify default prompts configuration was cleared
    print("Step 6: Verifying default prompts configuration was cleared...")
    cleared_default_config = page.evaluate("""() => {
        const allPrompts = window.PromptsService ? window.PromptsService.getPrompts() : {};
        const selectedIds = window.PromptsService ? window.PromptsService.getSelectedPromptIds() : [];
        
        const selectedDefaults = selectedIds.filter(id => {
            return allPrompts[id] && allPrompts[id].isDefault;
        });
        
        return {
            selectedDefaultIds: selectedDefaults,
            totalSelected: selectedIds.length
        };
    }""")
    
    print(f"Cleared default config: Selected defaults={len(cleared_default_config['selectedDefaultIds'])}, Total selected={cleared_default_config['totalSelected']}")
    
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
    
    # Step 8: Verify default prompts configuration was restored
    print("Step 8: Verifying default prompts configuration restored...")
    restored_default_config = page.evaluate("""() => {
        const allPrompts = window.PromptsService ? window.PromptsService.getPrompts() : {};
        const selectedIds = window.PromptsService ? window.PromptsService.getSelectedPromptIds() : [];
        
        // Filter for default prompts only
        const defaultPrompts = {};
        for (const [id, prompt] of Object.entries(allPrompts)) {
            if (prompt.isDefault) {
                defaultPrompts[id] = prompt;
            }
        }
        
        // Count selected default prompts
        const selectedDefaults = selectedIds.filter(id => {
            return allPrompts[id] && allPrompts[id].isDefault;
        });
        
        return {
            defaultLibrary: defaultPrompts,
            selectedDefaultIds: selectedDefaults,
            totalSelected: selectedIds.length,
            defaultPromptNames: Object.values(defaultPrompts).map(p => p.label || 'Unknown')
        };
    }""")
    
    print(f"Restored default config: Default library count={len(restored_default_config['defaultLibrary'])}, Selected defaults={len(restored_default_config['selectedDefaultIds'])}, Total selected={restored_default_config['totalSelected']}")
    print(f"Restored default prompt names: {restored_default_config['defaultPromptNames']}")
    print(f"Restored selected default IDs: {restored_default_config['selectedDefaultIds']}")
    
    screenshot_with_markdown(page, "agent_default_prompts_config_test", {
        "Test Phase": "Default prompts configuration save/load complete",
        "Original Default Library": str(len(original_default_config['defaultLibrary'])),
        "Restored Default Library": str(len(restored_default_config['defaultLibrary'])),
        "Original Selected Defaults": str(len(original_default_config['selectedDefaultIds'])),
        "Restored Selected Defaults": str(len(restored_default_config['selectedDefaultIds'])),
        "Default Library Preserved": str(len(restored_default_config['defaultLibrary']) == len(original_default_config['defaultLibrary'])),
        "Default Selection Restored": str(len(restored_default_config['selectedDefaultIds']) == len(original_default_config['selectedDefaultIds'])),
        "Selected Defaults Match": str(set(restored_default_config['selectedDefaultIds']) == set(original_default_config['selectedDefaultIds']))
    })
    
    # Step 9: Validate all default prompts configuration was restored
    print("Step 9: Validating default prompts configuration restoration...")
    
    # Default prompt library should remain the same (these are built-in)
    assert len(restored_default_config['defaultLibrary']) == len(original_default_config['defaultLibrary']), \
        f"Default prompt library count changed: expected {len(original_default_config['defaultLibrary'])}, got {len(restored_default_config['defaultLibrary'])}"
    
    # Check that the same default prompts exist
    original_names = set(original_default_config['defaultPromptNames'])
    restored_names = set(restored_default_config['defaultPromptNames'])
    assert original_names == restored_names, \
        f"Default prompt names changed: expected {original_names}, got {restored_names}"
    
    # Selected default prompts should be restored
    assert len(restored_default_config['selectedDefaultIds']) == len(original_default_config['selectedDefaultIds']), \
        f"Selected default prompts count not restored: expected {len(original_default_config['selectedDefaultIds'])}, got {len(restored_default_config['selectedDefaultIds'])}"
    
    # Verify the same default prompts are selected
    assert set(restored_default_config['selectedDefaultIds']) == set(original_default_config['selectedDefaultIds']), \
        f"Selected default prompt IDs not restored correctly: expected {set(original_default_config['selectedDefaultIds'])}, got {set(restored_default_config['selectedDefaultIds'])}"
    
    print("\n🎉 Agent default prompts configuration save/load test completed successfully!")
    print("✅ All default prompts configuration aspects were saved and restored correctly")
    print(f"✅ Default library: {len(original_default_config['defaultLibrary'])} → {len(restored_default_config['defaultLibrary'])}")
    print(f"✅ Selected defaults: {len(original_default_config['selectedDefaultIds'])} → {len(restored_default_config['selectedDefaultIds'])}")
    print(f"✅ Default names: {original_default_config['defaultPromptNames']} → {restored_default_config['defaultPromptNames']}")

def test_agent_default_prompts_none_selected(page: Page, serve_hacka_re, api_key):
    """Test default prompts configuration with no defaults selected"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== AGENT DEFAULT PROMPTS NONE SELECTED TEST ===")
    
    # Set up API
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    page.locator('#api-key-update').fill(api_key)
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Ensure no default prompts are selected
    page.locator('#prompts-btn').click()
    page.wait_for_timeout(1000)
    
    # Uncheck all default prompts
    all_default_items = page.locator('.default-prompt-item')
    for i in range(all_default_items.count()):
        default_item = all_default_items.nth(i)
        checkbox = default_item.locator('.prompt-item-checkbox')
        if checkbox.is_checked():
            checkbox.uncheck()
            page.wait_for_timeout(200)
    
    page.locator('#close-prompts-modal').click()
    page.wait_for_timeout(500)
    
    # Save agent with no defaults selected
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    page.locator('#quick-agent-name').fill('no-defaults-agent')
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(2000)
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Select some defaults
    page.locator('#prompts-btn').click()
    page.wait_for_timeout(1000)
    first_default = page.locator('.default-prompt-item').first
    if first_default.count() > 0:
        checkbox = first_default.locator('.prompt-item-checkbox')
        if not checkbox.is_checked():
            checkbox.check()
            page.wait_for_timeout(500)
    page.locator('#close-prompts-modal').click()
    page.wait_for_timeout(500)
    
    # Load agent and verify no defaults are selected
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(3000)
    if page.locator('#agent-config-modal').is_visible():
        page.locator('#close-agent-config-modal').click()
        page.wait_for_timeout(500)
    
    # Verify no defaults are selected
    no_defaults_config = page.evaluate("""() => {
        const allPrompts = window.PromptsService ? window.PromptsService.getPrompts() : {};
        const selectedIds = window.PromptsService ? window.PromptsService.getSelectedPromptIds() : [];
        
        const selectedDefaults = selectedIds.filter(id => {
            return allPrompts[id] && allPrompts[id].isDefault;
        });
        
        return {
            selectedDefaultIds: selectedDefaults,
            totalSelected: selectedIds.length
        };
    }""")
    
    assert len(no_defaults_config['selectedDefaultIds']) == 0, \
        f"No defaults should be selected but found: {no_defaults_config['selectedDefaultIds']}"
    
    print("✅ No default prompts selected state handled correctly")
    print("\n🎉 Agent default prompts none selected test completed successfully!")

def test_agent_default_prompts_all_selected(page: Page, serve_hacka_re, api_key):
    """Test default prompts configuration with all defaults selected"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("=== AGENT DEFAULT PROMPTS ALL SELECTED TEST ===")
    
    # Set up API
    page.locator('#settings-btn').click()
    page.wait_for_timeout(2000)
    page.locator('#api-key-update').fill(api_key)
    page.locator('#close-settings').click()
    page.wait_for_timeout(1000)
    
    # Select all default prompts
    page.locator('#prompts-btn').click()
    page.wait_for_timeout(1000)
    
    all_default_items = page.locator('.default-prompt-item')
    default_count = all_default_items.count()
    print(f"Selecting all {default_count} default prompts")
    
    for i in range(default_count):
        default_item = all_default_items.nth(i)
        checkbox = default_item.locator('.prompt-item-checkbox')
        if not checkbox.is_checked():
            checkbox.check()
            page.wait_for_timeout(200)
    
    page.locator('#close-prompts-modal').click()
    page.wait_for_timeout(500)
    
    # Capture all-selected configuration
    all_selected_config = page.evaluate("""() => {
        const allPrompts = window.PromptsService ? window.PromptsService.getPrompts() : {};
        const selectedIds = window.PromptsService ? window.PromptsService.getSelectedPromptIds() : [];
        
        const defaultPrompts = {};
        for (const [id, prompt] of Object.entries(allPrompts)) {
            if (prompt.isDefault) {
                defaultPrompts[id] = prompt;
            }
        }
        
        const selectedDefaults = selectedIds.filter(id => {
            return allPrompts[id] && allPrompts[id].isDefault;
        });
        
        return {
            defaultLibrary: defaultPrompts,
            selectedDefaultIds: selectedDefaults
        };
    }""")
    
    print(f"All selected config: {len(all_selected_config['defaultLibrary'])} defaults, {len(all_selected_config['selectedDefaultIds'])} selected")
    
    # Save, clear, and restore
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    page.locator('#quick-agent-name').fill('all-defaults-agent')
    page.on("dialog", lambda dialog: dialog.accept())
    page.locator('#quick-save-agent').click()
    page.wait_for_timeout(2000)
    page.locator('#close-agent-config-modal').click()
    page.wait_for_timeout(500)
    
    # Clear all selections
    page.locator('#prompts-btn').click()
    page.wait_for_timeout(1000)
    for i in range(all_default_items.count()):
        default_item = all_default_items.nth(i)
        checkbox = default_item.locator('.prompt-item-checkbox')
        if checkbox.is_checked():
            checkbox.uncheck()
            page.wait_for_timeout(200)
    page.locator('#close-prompts-modal').click()
    page.wait_for_timeout(500)
    
    # Load and verify all are selected again
    page.locator('#agent-config-btn').click()
    page.wait_for_timeout(500)
    load_btn = page.locator('button:has-text("Load")').first
    load_btn.click()
    page.wait_for_timeout(3000)
    if page.locator('#agent-config-modal').is_visible():
        page.locator('#close-agent-config-modal').click()
        page.wait_for_timeout(500)
    
    # Verify all defaults are selected again
    restored_all_config = page.evaluate("""() => {
        const allPrompts = window.PromptsService ? window.PromptsService.getPrompts() : {};
        const selectedIds = window.PromptsService ? window.PromptsService.getSelectedPromptIds() : [];
        
        const selectedDefaults = selectedIds.filter(id => {
            return allPrompts[id] && allPrompts[id].isDefault;
        });
        
        return {
            selectedDefaultIds: selectedDefaults
        };
    }""")
    
    print(f"Restored all config: {len(restored_all_config['selectedDefaultIds'])} selected")
    
    # Should match the original all-selected state
    assert len(restored_all_config['selectedDefaultIds']) == len(all_selected_config['selectedDefaultIds']), \
        f"All defaults selection not restored: expected {len(all_selected_config['selectedDefaultIds'])}, got {len(restored_all_config['selectedDefaultIds'])}"
    
    assert set(restored_all_config['selectedDefaultIds']) == set(all_selected_config['selectedDefaultIds']), \
        f"All defaults IDs not restored correctly"
    
    print("✅ All default prompts selected state preserved correctly")
    print("\n🎉 Agent default prompts all selected test completed successfully!")

if __name__ == "__main__":
    test_agent_default_prompts_config_save_load()
    test_agent_default_prompts_none_selected()
    test_agent_default_prompts_all_selected()