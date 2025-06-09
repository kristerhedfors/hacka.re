# Default Prompts Feature Documentation

This document provides detailed information about the Default Prompts feature in hacka.re and how to test it effectively.

## Overview

The Default Prompts feature provides pre-defined system prompts that users can select to enhance their interactions with the AI. These prompts are:

1. Not editable or deletable by users
2. Organized in a collapsible section within the Prompts Modal
3. Can be combined with user-created prompts to form a comprehensive system prompt
4. Some prompts are dynamically generated (e.g., Function Library)
5. Some prompts are organized in nested sections (e.g., Code section)

## Key Components

### Default Prompts Section Structure

- **Default Prompts Header**: Collapsible header that shows/hides the default prompts list
- **Default Prompts List**: Container for all default prompts (initially collapsed)
- **Nested Sections**: Some default prompts are organized in nested sections (e.g., Code section)
- **Prompt Items**: Individual default prompt items with checkboxes and info buttons

### Important DOM Elements

| Element Selector | Description | Notes |
|------------------|-------------|-------|
| `.default-prompts-section` | Container for the default prompts section | |
| `.default-prompts-header` | Header for default prompts section | Clickable to expand/collapse |
| `.default-prompts-list` | Container for default prompts | Initially collapsed |
| `.default-prompt-item` | Individual default prompt item | Multiple elements with this class |
| `.prompt-item-checkbox` | Checkbox to select/deselect a prompt | |
| `.prompt-item-name` | Display name of the prompt | Clickable to view content |
| `.prompt-item-info` | Info button for default prompts | Shows a popup with information |
| `.nested-section` | Container for nested prompts | Used for Code section |
| `.nested-section-header` | Header for nested sections | Clickable to expand/collapse |
| `.nested-section-list` | Container for nested prompts | Initially collapsed |

## Default Prompts Structure

The default prompts are organized in the following structure:

1. **About hacka.re Project**: Information about the hacka.re project architecture

2. **Interpretability Urgency**: Discusses AI interpretability research

3. **OWASP Top 10 for LLM Applications**: Security guidelines for LLM applications

4. **Code Section** (Nested section containing):
   - **Function Library**: Dynamically generated prompt containing all JavaScript functions
   - **Agent Orchestration**: Pattern for creating multi-agent systems
   - **Pure Python OpenAI API Proxy**: Dependency-free Python implementation of an OpenAI API proxy

5. **MCP SDK README**: Documentation for Model Context Protocol SDK implementation

### Special Prompts

#### Function Library Prompt

The Function Library prompt is special because:
- Its content is dynamically generated based on the current state of the Function Library
- It's re-evaluated each time it's selected or viewed
- It provides integration between the function calling system and system prompt

## Testing the Default Prompts Feature

### Test Setup

Before testing the Default Prompts feature, ensure:
1. The welcome modal is dismissed (if present)
2. The settings modal is dismissed (if present)
3. The prompts modal is opened

```python
# Standard setup for default prompts tests
page.goto(serve_hacka_re)
dismiss_welcome_modal(page)
dismiss_settings_modal(page)

# Open prompts modal
page.locator("#prompts-btn").click()
prompts_modal = page.locator("#prompts-modal")
expect(prompts_modal).to_be_visible()
```

### Expanding the Default Prompts Section

```python
# Expand the default prompts section
default_prompts_header = page.locator(".default-prompts-header")
default_prompts_header.click()

# Verify the default prompts list is visible
default_prompts_list = page.locator(".default-prompts-list")
expect(default_prompts_list).to_be_visible()

# Check that the expand icon changed to a down arrow
expand_icon = page.locator(".default-prompts-header i")
class_name = expand_icon.get_attribute("class")
assert "fa-chevron-down" in class_name
```

### Selecting a Default Prompt

```python
# Expand the default prompts section first
page.locator(".default-prompts-header").click()

# Select a default prompt by checking its checkbox
prompt_checkbox = page.locator(".default-prompt-item:has-text('OWASP Top 10') .prompt-item-checkbox")
prompt_checkbox.check()

# Verify the checkbox is checked
expect(prompt_checkbox).to_be_checked()

# Verify token usage is updated
token_usage_text = page.locator(".prompts-usage-text")
expect(token_usage_text).not_to_have_text("0%")
```

### Viewing Default Prompt Content

```python
# Expand the default prompts section first
page.locator(".default-prompts-header").click()

# Click on a default prompt name to view its content
prompt_name = page.locator(".default-prompt-item:has-text('About hacka.re Project') .prompt-item-name")
prompt_name.click()

# Verify the content is loaded into the editor fields
label_field = page.locator("#new-prompt-label")
content_field = page.locator("#new-prompt-content")

# Check that the fields contain the expected content
expect(label_field).to_have_value("About hacka.re Project")
expect(content_field).to_contain_text("hacka.re is a highly portable")

# Check that the fields are read-only
expect(label_field).to_have_attribute("readonly", "readonly")
expect(content_field).to_have_attribute("readonly", "readonly")
```

### Viewing Prompt Information

```python
# Expand the default prompts section first
page.locator(".default-prompts-header").click()

# Click the info button on a default prompt
info_button = page.locator(".default-prompt-item:has-text('OWASP Top 10') .prompt-item-info")
info_button.click()

# Verify the info popup is displayed
popup = page.locator(".prompt-info-popup")
expect(popup).to_be_visible()

# Verify the popup contains the expected content
popup_title = popup.locator(".prompt-info-header h3")
expect(popup_title).to_have_text("OWASP Top 10 for LLM Applications")

# Close the popup
close_button = popup.locator(".prompt-info-close")
close_button.click()

# Verify the popup is closed
expect(popup).not_to_be_visible()
```

### Testing Nested Sections (Code Section)

```python
# Expand the default prompts section first
page.locator(".default-prompts-header").click()

# Find the Code section
code_section = page.locator(".nested-section-header:has-text('Code')")
expect(code_section).to_be_visible()

# Expand the Code section
code_section.click()

# Verify the nested section list is visible
nested_list = page.locator(".nested-section-list")
expect(nested_list).to_be_visible()

# Verify the Function Library prompt is in the nested section
function_library = page.locator(".default-prompt-item:has-text('Function library')")
expect(function_library).to_be_visible()

# Verify the Agent Orchestration prompt is in the nested section
agent_orchestration = page.locator(".default-prompt-item:has-text('Agent Orchestration')")
expect(agent_orchestration).to_be_visible()

# Verify the OpenAI API Proxy prompt is in the nested section
openai_api_proxy = page.locator(".default-prompt-item:has-text('Pure Python OpenAI API Proxy')")
expect(openai_api_proxy).to_be_visible()
```

### Testing Function Library Prompt

```python
# Expand the default prompts section first
page.locator(".default-prompts-header").click()

# Expand the Code section if it exists
code_section = page.locator(".nested-section-header:has-text('Code')")
if code_section.count() > 0:
    code_section.click()

# Click on the Function Library prompt name
function_library = page.locator(".default-prompt-item:has-text('Function library') .prompt-item-name")
function_library.click()

# Verify the content is loaded into the editor fields
label_field = page.locator("#new-prompt-label")
content_field = page.locator("#new-prompt-content")

# Check that the fields contain the expected content
expect(label_field).to_have_value("Function library")
# The content should contain function definitions if any exist
```

### Testing Function Library Info Popup

```python
# Expand the default prompts section first
page.locator(".default-prompts-header").click()

# Expand the Code section if it exists
code_section = page.locator(".nested-section-header:has-text('Code')")
if code_section.count() > 0:
    code_section.click()

# Click the info button on the Function Library prompt
info_button = page.locator(".default-prompt-item:has-text('Function library') .prompt-item-info")
info_button.click()

# Verify the info popup is displayed
popup = page.locator(".prompt-info-popup")
expect(popup).to_be_visible()

# Verify the popup contains the Function Library link
function_library_link = popup.locator(".function-library-link")
expect(function_library_link).to_be_visible()
expect(function_library_link).to_have_text("Function Library")

# Close the popup
close_button = popup.locator(".prompt-info-close")
close_button.click()

# Verify the popup is closed
expect(popup).not_to_be_visible()
```

### Testing OpenAI API Proxy Prompt

```python
# Expand the default prompts section first
page.locator(".default-prompts-header").click()

# Expand the Code section if it exists
code_section = page.locator(".nested-section-header:has-text('Code')")
if code_section.count() > 0:
    code_section.click()

# Click on the OpenAI API Proxy prompt name
api_proxy = page.locator(".default-prompt-item:has-text('Pure Python OpenAI API Proxy') .prompt-item-name")
api_proxy.click()

# Verify the content is loaded into the editor fields
label_field = page.locator("#new-prompt-label")
content_field = page.locator("#new-prompt-content")

# Check that the fields contain the expected content
expect(label_field).to_have_value("Pure Python OpenAI API Proxy")
expect(content_field).to_contain_text("A lightweight, dependency-free Python implementation")

# Check that the fields are read-only
expect(label_field).to_have_attribute("readonly", "readonly")
expect(content_field).to_have_attribute("readonly", "readonly")
```

### Testing OpenAI API Proxy Info Popup

```python
# Expand the default prompts section first
page.locator(".default-prompts-header").click()

# Expand the Code section if it exists
code_section = page.locator(".nested-section-header:has-text('Code')")
if code_section.count() > 0:
    code_section.click()

# Click the info button on the OpenAI API Proxy prompt
info_button = page.locator(".default-prompt-item:has-text('Pure Python OpenAI API Proxy') .prompt-item-info")
info_button.click()

# Verify the info popup is displayed
popup = page.locator(".prompt-info-popup")
expect(popup).to_be_visible()

# Verify the popup contains the expected title and description
popup_title = popup.locator(".prompt-info-header h3")
expect(popup_title).to_have_text("Pure Python OpenAI API Proxy")
popup_content = popup.locator(".prompt-info-content p").first
expect(popup_content).to_contain_text("A lightweight, dependency-free Python implementation")

# Close the popup
close_button = popup.locator(".prompt-info-close")
close_button.click()

# Verify the popup is closed
expect(popup).not_to_be_visible()
```

## Common Testing Pitfalls

### 1. Not Expanding the Default Prompts Section First

The default prompts section is initially collapsed. Always expand it before interacting with default prompts:

```python
# WRONG: Trying to interact with default prompts without expanding the section
page.locator(".default-prompt-item:has-text('OWASP Top 10')").click()  # Will fail

# CORRECT: Expand the section first, then interact with default prompts
page.locator(".default-prompts-header").click()
page.locator(".default-prompt-item:has-text('OWASP Top 10')").click()
```

### 2. Not Handling Nested Sections

Some default prompts are in nested sections (e.g., Code section). These nested sections must also be expanded:

```python
# WRONG: Trying to interact with prompts in the Code section without expanding it
page.locator(".default-prompts-header").click()
page.locator(".default-prompt-item:has-text('Function library')").click()  # May fail
page.locator(".default-prompt-item:has-text('Pure Python OpenAI API Proxy')").click()  # May fail

# CORRECT: Expand both the default prompts section and the Code section
page.locator(".default-prompts-header").click()
page.locator(".nested-section-header:has-text('Code')").click()
page.locator(".default-prompt-item:has-text('Function library')").click()  # Now works
page.locator(".default-prompt-item:has-text('Pure Python OpenAI API Proxy')").click()  # Now works
```

### 3. Not Checking if Nested Sections Exist

The Code section might not exist in all versions or configurations. Always check if it exists before interacting with it:

```python
# Expand the default prompts section first
page.locator(".default-prompts-header").click()

# Check if the Code section exists before interacting with it
code_section = page.locator(".nested-section-header:has-text('Code')")
if code_section.count() > 0:
    code_section.click()
    # Now interact with prompts in the Code section
    function_library = page.locator(".default-prompt-item:has-text('Function library')")
    api_proxy = page.locator(".default-prompt-item:has-text('Pure Python OpenAI API Proxy')")
    
    if function_library.count() > 0:
        function_library.click()
    
    if api_proxy.count() > 0:
        api_proxy.click()
else:
    # Look for prompts directly in the default prompts list
    # In case the Code section doesn't exist or the structure has changed
    function_library = page.locator(".default-prompt-item:has-text('Function library')")
    api_proxy = page.locator(".default-prompt-item:has-text('Pure Python OpenAI API Proxy')")
    
    if function_library.count() > 0:
        function_library.click()
    
    if api_proxy.count() > 0:
        api_proxy.click()
```

### 4. Not Waiting for Token Usage Updates

Token usage calculations happen asynchronously. Wait for the token usage to update:

```python
# Select a default prompt
prompt_checkbox = page.locator(".default-prompt-item:has-text('OWASP Top 10') .prompt-item-checkbox")
prompt_checkbox.check()

# Wait for token usage to update
page.wait_for_function("""
    () => {
        const usageText = document.querySelector('.prompts-usage-text').textContent;
        return usageText !== '0%';
    }
""")
```

### 5. Not Handling Read-Only Fields

When viewing default prompt content, the editor fields are set to read-only. This is expected behavior:

```python
# Click on a default prompt name to view its content
prompt_name = page.locator(".default-prompt-item:has-text('About hacka.re Project') .prompt-item-name")
prompt_name.click()

# Verify the fields are read-only
label_field = page.locator("#new-prompt-label")
content_field = page.locator("#new-prompt-content")
expect(label_field).to_have_attribute("readonly", "readonly")
expect(content_field).to_have_attribute("readonly", "readonly")

# Don't try to edit these fields while they're read-only
```

## Implementation Details

### Default Prompts Storage

Default prompts are defined in JavaScript modules:
- `js/default-prompts/code-section.js`: Container for code-related prompts
- `js/default-prompts/function-library.js`: Dynamic prompt that includes all functions
- `js/default-prompts/agent-orchestration.js`: Static prompt about agent orchestration
- `js/default-prompts/openai-api-proxy.js`: Pure Python implementation of an OpenAI API proxy
- `js/default-prompts/hacka-re-project.js`: Information about the hacka.re project
- `js/default-prompts/interpretability-urgency.js`: Static prompt about AI interpretability
- `js/default-prompts/owasp-llm-top10.js`: OWASP Top 10 for LLM applications
- `js/default-prompts/mcp-sdk-readme.js`: Documentation for MCP SDK implementation

### Default Prompts Selection

Selected default prompts are stored in localStorage:
- `selected_default_prompts`: Array of IDs of selected default prompts

### Default Prompts Service

The `DefaultPromptsService` handles:
- Loading default prompts from individual files
- Managing default prompt selection
- Combining selected default prompts with user prompts
- Updating the system prompt based on selected prompts

### Prompts Manager

The `PromptsManager` handles:
- Displaying default prompts in the UI
- Handling user interactions with default prompts
- Updating token usage based on selected prompts
- Applying selected prompts as the system prompt

## Conclusion

The Default Prompts feature provides pre-defined system prompts that enhance the user's interaction with the AI. By following the guidelines in this document, you can write robust tests that accurately verify the functionality of this feature.
