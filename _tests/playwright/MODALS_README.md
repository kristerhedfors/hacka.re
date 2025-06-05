# Hacka.re Modals Documentation

This document provides an overview of all modal components in the hacka.re application and links to detailed documentation for each modal.

## Overview

Hacka.re uses several modal components to provide a clean and organized user interface. Each modal serves a specific purpose and contains unique elements and interactions. This documentation is designed to help developers and testers understand the structure and behavior of each modal for effective testing and development.

## Modal Components

| Modal | Description | Documentation |
|-------|-------------|---------------|
| **Settings Modal** | Configures API providers, keys, models, and other application settings | [SETTINGS_MODAL_README.md](SETTINGS_MODAL_README.md) |
| **Prompts Modal** | Creates, manages, and selects prompts for the system prompt | [PROMPTS_MODAL_README.md](PROMPTS_MODAL_README.md) |
| **Share Modal** | Creates shareable links with encrypted settings and content | [SHARE_MODAL_README.md](SHARE_MODAL_README.md) |
| **Function Modal** | Creates and manages JavaScript functions for AI tool calling | [FUNCTION_MODAL_README.md](FUNCTION_MODAL_README.md) |
| **Welcome Modal** | Introduces new users to the application (dynamically created) | [WELCOME_MODAL_README.md](WELCOME_MODAL_README.md) |
| **API Key Modal** | Simple modal for quick API key entry (legacy/fallback) | [API_KEY_MODAL_README.md](API_KEY_MODAL_README.md) |

## Modal Interactions

The modals in hacka.re interact with each other in several ways:

1. **Welcome → Settings**: The Welcome Modal directs new users to the Settings Modal to configure the application.

2. **Settings → Prompts**: The Settings Modal provides access to the Prompts Modal for system prompt configuration.

3. **Function ↔ Prompts**: The Function Modal's functions are reflected in the Function Library prompt in the Prompts Modal.

4. **Share ↔ Settings**: The Share Modal uses settings from the Settings Modal and can generate links that configure settings when opened.

5. **Share ↔ Prompts**: The Share Modal can include prompt library content when the appropriate option is selected.

6. **Share ↔ Function**: The Share Modal can include function library content when the appropriate option is selected.

## Common Testing Patterns

When testing modals in hacka.re, follow these common patterns:

### Modal Opening and Closing

```python
# Open a modal
page.locator("#modal-button-id").click()
modal = page.locator("#modal-id")
expect(modal).to_be_visible()

# Close a modal
page.locator("#close-modal-button-id").click()
expect(modal).not_to_be_visible()
```

### Handling Confirmation Dialogs

```python
# Set up dialog handler before triggering action
page.on("dialog", lambda dialog: dialog.accept())
action_button.click()  # Action that triggers a dialog
```

### Waiting for Asynchronous Operations

```python
# Wait for an element to appear after an async operation
page.wait_for_selector("#element-id", state="visible")

# Wait for an element to disappear
page.wait_for_selector("#element-id", state="hidden")
```

### Testing Form Submissions

```python
# Fill a form
page.locator("#input-id").fill("value")
page.locator("#checkbox-id").check()
page.locator("#select-id").select_option("option")

# Submit the form
page.locator("#submit-button-id").click()

# Verify the result
expect(page.locator("#result-element")).to_be_visible()
```

## Modal Testing Sequence

When testing the full application flow, consider this sequence:

1. **Welcome Modal**: Test for first-time users
2. **Settings Modal**: Configure API key and model
3. **Prompts Modal**: Set up system prompts
4. **Function Modal**: Create functions for tool calling
5. **Chat Interaction**: Test the chat with the configured settings
6. **Share Modal**: Share the configuration

This sequence follows the natural flow of a user setting up and using the application.

## Implementation Details

All modals in hacka.re follow these implementation patterns:

1. **Component-Based Architecture**: Each modal is implemented as a separate component with its own manager class.

2. **Event-Driven Interactions**: Modals use event listeners for user interactions.

3. **LocalStorage Persistence**: Settings and state are saved to localStorage for persistence.

4. **Dynamic DOM Creation**: Some modals (like the Welcome Modal) are created dynamically.

5. **CSS Transitions**: Modals use CSS transitions for smooth opening and closing animations.

## Conclusion

The modal components in hacka.re provide a structured and organized way for users to interact with the application. By understanding the purpose, structure, and behavior of each modal, developers and testers can effectively work with and test the application.

For detailed information about each modal, refer to the individual README files linked in the table above.
