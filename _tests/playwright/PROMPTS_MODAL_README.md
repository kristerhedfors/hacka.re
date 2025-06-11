# Prompts Modal Documentation

This document provides detailed information about the Prompts Modal in hacka.re and its elements for testing and development purposes.

## 🔄 Recent Refactoring

The Prompts Modal system has been refactored into a modular architecture:

### New Component Structure

**Core Management:**
- `prompts-manager.js` - Main prompts system orchestrator
- `prompts-list-manager.js` - Prompts list operations and rendering
- `prompts-token-manager.js` - Token usage calculation and display
- `prompts-event-handlers.js` - Event handling logic
- `prompts-modal-renderer.js` - Modal rendering and UI management

**Service Integration:**
- `prompts-service.js` - Core prompts business logic
- `default-prompts-service.js` - Default prompts management
- `system-prompt-coordinator.js` - System prompt coordination

## Overview

The Prompts Modal is a key component of the hacka.re interface that allows users to:

1. Select from user-created and default prompts in a hierarchical tree structure
2. Manage prompt selection with checkboxes for system prompt composition
3. Navigate through collapsible sections (Default Prompts and nested categories like "Code")
4. Monitor real-time token usage of selected prompts with visual progress bars
5. View dynamic prompt content (like Function Library) that updates based on current application state

## Key Components

### Modal Structure

- **Header**: "System Prompt Menu" title in settings header style
- **System Prompt Components Section**: Description and help text
- **Token Usage Display**: Real-time context usage bar and statistics
- **Prompts List Hierarchy**: 
  - **User Prompts**: Custom prompts created by users (displayed first)
  - **Default Prompts Section**: Collapsible section containing:
    - **Top-level Default Prompts**: Individual default prompts
    - **Nested Sections**: Collapsible categories (e.g., "Code" section) containing:
      - **Function Library**: Dynamic prompt reflecting current function library
      - **Agent Orchestration**: Prompts for AI agent coordination
- **Close Button**: Single close action button

### Important DOM Elements

| Element ID | Description | Notes |
|------------|-------------|-------|
| `#prompts-modal` | The main modal container | |
| `.modal-content` | Container for modal content | |
| `.settings-header` | Header section with title | |
| `.prompts-container` | Main container with single-column layout | |
| `#prompts-list` | Container for all available prompts | Populated dynamically |
| `#close-prompts-modal` | Button to close the modal | Secondary button style |
| `.form-help` | Help text explaining prompt selection | |
| **Token Usage Elements** | | |
| `.prompts-token-usage-container` | Container for token usage display | Dynamically created |
| `.prompts-token-usage-label` | Label for token usage statistics | |
| `.prompts-usage-tokens` | Display of current/total tokens | Format: "123/4096 tokens" |
| `.prompts-usage-text` | Percentage display | Format: "15%" |
| `.prompts-usage-bar` | Progress bar container | |
| `.prompts-usage-fill` | Progress bar fill element | Width updated based on usage |
| **Default Prompts Tree Structure** | | |
| `.default-prompts-section` | Container for entire default prompts section | |
| `.default-prompts-header` | Clickable header to expand/collapse | Contains chevron icon |
| `.default-prompts-list` | Container for default prompts content | Initially hidden |
| **Nested Sections** | | |
| `.nested-section` | Container for nested prompt categories | E.g., "Code" section |
| `.nested-section-header` | Clickable header for nested sections | Contains chevron icon |
| `.nested-section-list` | Container for nested section items | Initially hidden |
| **Prompt Items** | | |
| `.prompt-item` | Individual prompt item | Multiple elements, dynamically created |
| `.prompt-item-checkbox` | Checkbox to select/deselect a prompt | |
| `.prompt-item-name` | Clickable prompt name | Loads content when clicked |
| `.prompt-item-info` | Info button for prompt descriptions | |
| `.prompt-item-delete` | Delete button | Only for user prompts |
| `.default-prompt-item` | Specific styling for default prompts | |
| **Expand/Collapse Icons** | | |
| `.fa-chevron-right` | Collapsed state icon | Applied to section headers |
| `.fa-chevron-down` | Expanded state icon | Applied to section headers |

## Key Behaviors

### Tree Navigation

1. **Expanding/Collapsing Sections**:
   - Click the "Default Prompts" header to expand/collapse the entire default prompts section
   - Click nested section headers (e.g., "Code") to expand/collapse nested categories
   - Chevron icons change from right-pointing (collapsed) to down-pointing (expanded)
   - All sections start in collapsed state for clean initial presentation

2. **Hierarchical Organization**:
   - User prompts appear first, sorted alphabetically
   - Default prompts section contains both individual prompts and nested sections
   - Nested sections group related prompts (e.g., Code section contains Function Library and Agent Orchestration)
   - Proper visual indentation and styling distinguish hierarchy levels

### Prompt Selection

1. **Checkbox Interaction**:
   - Each prompt has a checkbox to include/exclude it from the system prompt
   - Checking a prompt immediately updates the token usage display
   - Selected prompts are combined to form the complete system prompt
   - Selection state persists across modal openings

2. **Dynamic Content Updates**:
   - Function Library prompt content rebuilds automatically when functions change
   - Token usage calculations update in real-time as prompts are selected/deselected
   - Context usage percentage updates based on current model's context window

### Token Usage Monitoring

1. **Real-time Tracking**:
   - Token usage bar displays percentage of context window used by selected prompts
   - Token count shows current/total format (e.g., "245/4096 tokens")
   - Visual progress bar fills proportionally to usage percentage
   - Updates immediately when prompts are selected/deselected

2. **Context Awareness**:
   - Token calculations consider the current model's context window size
   - Warns users when approaching context limits
   - Helps optimize prompt selection for maximum effectiveness

### Prompt Management

1. **Creating Prompts** (Legacy Feature):
   - Enter a label and content in the form
   - Click "Save Prompt" to create a new prompt
   - The prompt is added to the list and saved to localStorage

2. **Editing Prompts**:
   - Click on a prompt in the list to load it into the editor
   - Modify the label and/or content
   - Click "Save Prompt" to update the prompt

3. **Deleting Prompts**:
   - Click the delete icon on a prompt item
   - Confirm the deletion in the dialog
   - The prompt is removed from the list and localStorage

### Default Prompts

1. **Accessing Default Prompts**:
   - Click the "Default Prompts" header to expand the section
   - Default prompts are pre-defined and cannot be edited or deleted
   - Click on a default prompt name to view its content in read-only mode

2. **Default Prompt Types**:
   - Function Library: Contains all JavaScript functions stored in the Function Library
   - Interpretability Urgency: Discusses AI interpretability research
   - Agent Orchestration: Pattern for creating multi-agent systems
   - OWASP LLM Top 10: Security guidelines for LLM applications
   - MCP SDK README: Documentation for Model Context Protocol SDK

### Prompt Selection

1. **Selecting Prompts**:
   - Check the checkbox next to a prompt to select it
   - Multiple prompts can be selected simultaneously
   - Selected prompts are combined to create the system prompt
   - The order of prompts in the combined system prompt is:
     1. Default prompts (in their predefined order)
     2. User-created prompts (in alphabetical order)

2. **Token Usage**:
   - The token usage bar shows the percentage of the context window used by selected prompts
   - The percentage is calculated based on the current model's context window size
   - The token usage is updated in real-time when prompts are selected/deselected

## Interactions with Other Components

### Settings Modal

The Prompts Modal is opened from the Settings Modal via the "Configure System Prompt" button. When prompts are selected:
1. The combined content of selected prompts becomes the system prompt
2. The system prompt is saved to localStorage
3. The token usage of the system prompt affects the overall context usage displayed in the main UI

### Function Library

The Function Library prompt (in the Default Prompts section) dynamically reflects the current state of the Function Library. This allows:
1. Easy reference to all available functions
2. LLM-assisted function updates
3. Integration between the function calling system and system prompt

## Testing the Prompts Modal

### Test Setup

Before testing the Prompts Modal, ensure:
1. The welcome modal is dismissed (if present)
2. The settings modal is dismissed (if present)

```python
# Standard setup for prompts modal tests
page.goto(serve_hacka_re)
dismiss_welcome_modal(page)
dismiss_settings_modal(page)
```

### Opening the Modal

```python
# Open prompts modal
page.locator("#prompts-btn").click()
prompts_modal = page.locator("#prompts-modal")
expect(prompts_modal).to_be_visible()
```

### Testing Tree Structure Navigation

```python
# Verify default prompts section exists but is initially collapsed
default_prompts_section = page.locator(".default-prompts-section")
expect(default_prompts_section).to_be_visible()

default_prompts_list = page.locator(".default-prompts-list")
expect(default_prompts_list).not_to_be_visible()  # Initially collapsed

# Expand default prompts section
default_prompts_header = page.locator(".default-prompts-header")
default_prompts_header.click()

# Verify section expanded and icon changed
expect(default_prompts_list).to_be_visible()
expand_icon = page.locator(".default-prompts-header i")
class_name = expand_icon.get_attribute("class")
assert "fa-chevron-down" in class_name

# Test nested section navigation (Code section)
code_section = page.locator(".nested-section-header:has-text('Code')")
if code_section.count() > 0:
    code_section.click()
    nested_list = page.locator(".nested-section-list")
    expect(nested_list).to_be_visible()
```

### Testing Token Usage Display

```python
# Verify token usage elements are present
token_usage_container = page.locator(".prompts-token-usage-container")
expect(token_usage_container).to_be_visible()

prompts_usage_bar = page.locator(".prompts-usage-bar")
expect(prompts_usage_bar).to_be_visible()

prompts_usage_fill = page.locator(".prompts-usage-fill")
expect(prompts_usage_fill).to_be_visible()

prompts_usage_text = page.locator(".prompts-usage-text")
expect(prompts_usage_text).to_be_visible()

# Get initial usage
initial_usage = prompts_usage_text.text_content()
print(f"Initial token usage: {initial_usage}")
```

### Testing Prompt Selection

```python
# Expand default prompts section first
page.locator(".default-prompts-header").click()
page.locator(".default-prompts-list").wait_for(state="visible")

# Find a prompt checkbox and test selection
prompt_checkbox = page.locator(".prompt-item-checkbox").first
initial_checked = prompt_checkbox.is_checked()

# Toggle the checkbox
prompt_checkbox.click() if not initial_checked else prompt_checkbox.uncheck()

# Verify token usage updated
updated_usage = prompts_usage_text.text_content() 
assert updated_usage != initial_usage, "Token usage should update when prompt selection changes"

# Verify usage bar width changed
usage_fill_width = prompts_usage_fill.get_attribute("style")
assert "width:" in usage_fill_width, "Usage bar should have width style set"
```

### Testing Default Prompts Access

```python
# Expand the default prompts section
page.locator(".default-prompts-header").click()

# Verify the default prompts list is visible
default_prompts_list = page.locator(".default-prompts-list")
expect(default_prompts_list).to_be_visible()

# Select a default prompt
default_prompt_checkbox = page.locator(".default-prompt-item:has-text('Function Library') .prompt-item-checkbox")
default_prompt_checkbox.check()

# Verify the checkbox is checked
expect(default_prompt_checkbox).to_be_checked()
```

### Deleting a Prompt

```python
# Handle the confirmation dialog
page.on("dialog", lambda dialog: dialog.accept())

# Delete the prompt
delete_button = page.locator(".prompt-item:has-text('Test Prompt') .prompt-item-delete")
delete_button.click()

# Verify the prompt was removed from the list
expect(page.locator(".prompt-item-name:has-text('Test Prompt')")).not_to_be_visible()
```

## Common Testing Pitfalls

### 1. Not Handling Confirmation Dialogs

When deleting a prompt, a confirmation dialog appears. Always set up a dialog handler before triggering the action:

```python
# Set up dialog handler before triggering action
page.on("dialog", lambda dialog: dialog.accept())
delete_button.click()  # Action that triggers a dialog
```

### 2. Not Accounting for Default Prompts Section State

The default prompts section is initially collapsed. Tests that need to interact with default prompts must:
1. Click the header to expand the section
2. Verify the section is expanded before interacting with its elements

```python
# Expand the default prompts section
page.locator(".default-prompts-header").click()

# Wait for the list to be visible before interacting with it
page.wait_for_selector(".default-prompts-list", state="visible")
```

### 3. Not Waiting for Token Usage Updates

Token usage calculations happen asynchronously. Wait for the token usage to update:

```python
# Wait for token usage to update after selecting a prompt
page.wait_for_function("""
    () => {
        const usageText = document.querySelector('.prompts-usage-text').textContent;
        return usageText !== '0%';
    }
""")
```

## Implementation Details

### Refactored Storage Architecture

**Service-Based Storage:**
- `prompts-service.js` - Main prompts service layer
- `core-storage-service.js` - Core storage operations
- `namespace-service.js` - Multi-tenant data isolation

**Storage Structure (Managed by Services):**
- `prompts`: Array of prompt objects, each with an id, name, and content
- `selected_prompt_ids`: Array of IDs of selected prompts  
- `selected_default_prompt_ids`: Array of IDs of selected default prompts
- `system_prompt`: The combined content of all selected prompts

**Component Responsibilities:**
- `prompts-list-manager.js` - Manages prompt list state and operations
- `prompts-token-manager.js` - Handles token usage calculations
- `system-prompt-coordinator.js` - Coordinates system prompt composition

### Default Prompts

Default prompts are defined in JavaScript modules:
- `js/default-prompts/function-library.js`: Dynamic prompt that includes all functions
- `js/default-prompts/interpretability-urgency.js`: Static prompt about AI interpretability
- `js/default-prompts/agent-orchestration.js`: Static prompt about agent orchestration

The Function Library prompt is special because its content is dynamically generated based on the current state of the Function Library.

### Token Usage Calculation

Token usage is calculated using:
1. The combined length of all selected prompts
2. An approximation of 4 characters per token
3. The context window size of the current model

This provides a rough estimate of how much of the context window is used by the system prompt.

## Conclusion

The Prompts Modal is a powerful feature that allows users to create, manage, and combine prompts to customize the system prompt for the AI. By following the guidelines in this document, you can write robust tests that accurately verify the functionality of this feature.
