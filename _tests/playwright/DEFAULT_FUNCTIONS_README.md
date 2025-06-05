# Default Functions Test

This test verifies the default functions feature in the function calling manager.

## What is being tested

1. The default functions section exists in the function calling modal
2. The default functions section is expandable/collapsible
3. The getProgramPrivateKey function exists in the default functions section
4. Default functions are view-only and cannot be edited
5. Default functions cannot be deleted
6. Default functions have checkboxes for enabling/disabling

## How to run the test

```bash
cd _tests/playwright
python -m pytest test_default_functions.py -v
```

## Expected results

All tests should pass, confirming that:
- The default functions section is properly displayed
- The getProgramPrivateKey function is available
- Default functions are protected from editing and deletion
- Default functions can be enabled/disabled using checkboxes
