# Clear Namespace Settings Test

This test verifies the functionality of the "Delete GPT namespace and settings" feature in the hacka.re application.

## Feature Description

The "Delete GPT namespace and settings" feature allows users to clear all settings stored in localStorage for the current namespace without affecting other namespaces. This is useful when users want to reset their current GPT configuration without losing settings for other GPTs they've created.

## What This Test Verifies

1. The button text has been updated from "Clear all settings" to "Delete GPT namespace and settings"
2. Clicking the button clears only the settings for the current namespace
3. The confirmation message is displayed correctly after clearing settings
4. The settings are actually cleared (verified by checking the API key field is empty after clearing)
5. Namespace-related entries are removed from localStorage, including:
   - `hackare_[namespaceId]_namespace`
   - `hackare_[namespaceId]_master_key`
   - `hackare_[namespaceId]_tool_calling_enabled`

## Test Implementation Details

The test follows these steps:

1. Navigate to the application
2. Handle the welcome modal if present
3. Configure a test API key and provider
4. Save the settings
5. Open the settings modal again
6. Verify the button text has been updated
7. Click the button to clear settings
8. Check for the confirmation message
9. Open settings modal again to verify settings were cleared
10. Verify API key field is empty
11. Verify namespace-related entries are removed from localStorage
12. Close the settings modal
13. Take a final screenshot with test results

## Running the Test

You can run this test specifically with:

```bash
./run_tests.sh --test-file test_clear_namespace_settings.py
```

Or run it as part of the full test suite:

```bash
./run_tests.sh
```

## Implementation Notes

This test verifies that the `clearAllSettings` function in `settings-manager.js` correctly:

1. Only clears localStorage variables for the current namespace (using `StorageService.getNamespacedKey()`)
2. Displays the updated confirmation message "All settings for the current GPT namespace have been deleted"
3. Removes all namespace-related entries, including:
   - API key, model, system prompt, share options, base URL, and base URL provider
   - Chat history
   - Tool calling settings
   - Namespace and master key entries

The test specifically verifies that the following entries are removed:
- `hackare_[namespaceId]_namespace`
- `hackare_[namespaceId]_master_key`
- `hackare_[namespaceId]_tool_calling_enabled`

The test does not verify that settings in other namespaces are preserved, as that would require a more complex test setup with multiple namespaces. However, since the function uses `StorageService.getNamespacedKey()` to get the namespaced keys, it should only affect the current namespace.
