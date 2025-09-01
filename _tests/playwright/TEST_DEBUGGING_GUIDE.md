# Test Debugging Infrastructure Guide

## 📍 Current Directory Structure
When working in `_tests/playwright/`, all artifacts are stored in subdirectories:

```
_tests/playwright/                   # Current working directory
├── screenshots/                     # 📸 Test failure screenshots (582 files)
├── screenshots_data/                # 📝 Screenshot metadata in markdown (570 files)
├── console_logs/                    # 🖥️ Browser console output (JSON format)
├── test_output.log                  # Latest test run output
├── run_*.out                        # Test script outputs
└── *.log                           # Individual test logs
```

## 🎯 Key Scripts for Debugging

### 1. **show_test_artifacts.sh**
Shows where all test artifacts are located and provides statistics.
```bash
./show_test_artifacts.sh
```
**Output:**
- Location of all artifact directories
- Count of screenshots and metadata files  
- Latest files in each category
- Helper commands for viewing artifacts

### 2. **view_test_failure.sh**
View all artifacts for a specific test failure together.
```bash
./view_test_failure.sh [test_name]
# Example: ./view_test_failure.sh rag_search_ui_elements
```
**Features:**
- Finds matching screenshot, metadata, and console log
- Displays metadata content
- Shows console errors and warnings
- Opens screenshot automatically (on macOS)

### 3. **Test Runner Scripts**
All test runners now print artifact locations at startup:
- `./run_core_tests.sh` - Core functionality tests
- `./run_feature_tests.sh` - Advanced feature tests
- `./run_modal_tests.sh` - Modal-specific tests

## 🔍 Debugging Workflow

### When a test fails:

1. **Check the test output:**
   ```bash
   grep -n FAILED test_output.log
   ```

2. **View the failure details:**
   ```bash
   ./view_test_failure.sh <failing_test_name>
   ```

3. **Check console logs for JavaScript errors:**
   - Console logs are in `console_logs/` directory
   - JSON format with timestamps and error types
   - Look for `"type": "error"` entries

4. **Review screenshots:**
   - Screenshots in `screenshots/` directory
   - Shows exact UI state at failure
   - Check for blocking modals or missing elements

5. **Read metadata:**
   - Metadata in `screenshots_data/` directory
   - Contains test context and debug info
   - Shows localStorage keys, active modals, URL

## 📊 Test Output Files

### Recent Test Results (as of Sep 1, 2025):
- `test_output.log` - Latest test run (3:01 PM)
- `modal_test_*.log` - Modal test results
- `run_core_tests.out` - Core test output (11:52 AM)

### Key Information in Logs:
- Test pass/fail status
- Error messages and stack traces
- Console output from tests
- Timing information

## 🛠️ Enhanced Test Debugging Utils

### Using TestDebugger class:
```python
from test_debug_utils import TestDebugger

debugger = TestDebugger("test_name")
debugger.setup_console_capture(page)
debugger.capture_state("checkpoint_name", {"key": "value"})
debugger.print_summary()
```

### Quick Screenshot Function:
```python
from test_debug_utils import enhanced_screenshot

enhanced_screenshot(page, "screenshot_name", {
    "Test Stage": "Description",
    "Expected": "What should happen"
})
```

## 💡 Important Tips

1. **Always run from `_tests/playwright/` directory**
   - Scripts assume they're run from this directory
   - Artifacts are saved relative to current directory

2. **Console logs are critical**
   - JavaScript errors often cause test failures
   - Check for API errors, missing elements, undefined variables

3. **Screenshots tell the story**
   - Shows exact UI state when test failed
   - Look for unexpected modals, missing buttons, wrong text

4. **Metadata provides context**
   - Contains debug info passed from test
   - Shows browser state, active modals, localStorage

5. **Use the helper scripts**
   - Don't manually search for files
   - Scripts automatically find related artifacts
   - Scripts format output for readability

## 📝 Common Issues and Solutions

### Welcome Modal Blocking Tests
- Check screenshots for welcome modal overlay
- Ensure `dismiss_welcome_modal()` is called after navigation

### API Key Not Persisting
- Check console logs for storage errors
- Review localStorage keys in metadata
- Verify namespace handling

### Function Tests Failing
- Console logs show parsing errors
- Check for JavaScript syntax issues
- Review function validation logic

### RAG Tests Failing
- Often related to API key configuration
- Check embedding generation errors in console
- Review search functionality logs

## 🚀 Quick Commands Reference

```bash
# Show all artifact locations
./show_test_artifacts.sh

# View specific failure
./view_test_failure.sh test_name

# Search for failures
grep -n FAILED test_output.log

# View latest screenshot
open screenshots/$(ls -t screenshots/*.png | head -1)

# Check console errors
cat console_logs/$(ls -t console_logs/*.json | head -1) | jq '.messages[] | select(.type=="error")'

# Run tests with artifact tracking
./run_core_tests.sh
./run_feature_tests.sh
```

## 📈 Current Test Status
- Total Screenshots: 582
- Total Metadata Files: 570  
- Console Logs Directory: Created and ready
- Latest Test Run: Sep 1, 2025 at 3:01 PM

Remember: **Always check console logs and screenshots when debugging test failures!**