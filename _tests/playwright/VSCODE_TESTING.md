# VSCode Testing Guide

## Overview

The hacka.re Playwright test suite is fully integrated with VSCode's built-in Test Explorer. You can run tests individually or in groups using the VSCode UI, with full support for both sequential and parallel execution.

## Setup

### 1. Install VSCode Extensions

Required extensions:
- **Python** (ms-python.python)
- **Playwright Test for VSCode** (optional, for additional Playwright features)

### 2. Configure VSCode Settings

The test suite includes pre-configured settings in [`.vscode/settings.json`](.vscode/settings.json):

- Python interpreter: `.venv/bin/python`
- Test framework: pytest
- Default test arguments: `--headed --browser chromium`
- Auto-discovery on save: enabled

### 3. Verify Test Discovery

1. Open VSCode in the test directory: `code /Users/user/dev/hacka.re/_tests/playwright`
2. Open the **Testing** view (beaker icon in left sidebar)
3. Wait for test discovery to complete (should see all 295+ test files)

## Running Tests

### Using the Test Explorer

#### Run Individual Tests
1. Expand test files in Test Explorer
2. Click the ▶️ play button next to any test
3. Test will run in **sequential mode** (VSCode default)

#### Run Test Files
1. Click the ▶️ play button next to a test file
2. All tests in that file will run sequentially

#### Run All Tests
1. Click the ▶️ play button at the top of Test Explorer
2. **Warning**: This runs all 295+ tests sequentially (slow!)
3. Consider using command-line scripts for full suite runs

### Using the Command Palette

1. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Test: Run"
3. Select from available options:
   - **Test: Run All Tests**
   - **Test: Run Test at Cursor**
   - **Test: Run Tests in Current File**
   - **Test: Debug Test at Cursor**

### Using Keyboard Shortcuts

VSCode default shortcuts:
- **Run test at cursor**: No default (can configure)
- **Debug test at cursor**: No default (can configure)
- **Run all tests**: No default (can configure)

To add shortcuts, edit `keybindings.json`:
```json
[
  {
    "key": "cmd+shift+r",
    "command": "testing.runCurrentFile",
    "when": "editorTextFocus"
  },
  {
    "key": "cmd+shift+d",
    "command": "testing.debugAtCursor",
    "when": "editorTextFocus"
  }
]
```

## Running Tests with Parallel Execution

VSCode's Test Explorer doesn't support parallel execution by default. For parallel runs, use the integrated terminal:

### Open Integrated Terminal

1. Press `` Ctrl+` `` or select **Terminal → New Terminal**
2. Ensure you're in the test directory:
   ```bash
   cd _tests/playwright
   ```

### Run Tests in Parallel

```bash
# Core tests with 4 workers
./run_core_tests.sh --workers 4

# Feature tests with 6 workers
./run_feature_tests.sh --workers 6

# Specific test files with parallel execution
.venv/bin/python -m pytest -n 4 test_function*.py

# All tests with 8 workers
./run_tests.sh -n 8
```

## Debugging Tests

### Using VSCode Debugger

1. Set breakpoints in your test code (click left of line numbers)
2. In Test Explorer, right-click a test → **Debug Test**
3. Test will run with debugger attached
4. Execution pauses at breakpoints

### Debug Configuration

Create `.vscode/launch.json` for advanced debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Current Test File",
      "type": "python",
      "request": "launch",
      "module": "pytest",
      "args": [
        "${file}",
        "-v",
        "--headed",
        "--browser",
        "chromium"
      ],
      "console": "integratedTerminal",
      "justMyCode": false,
      "env": {
        "PYTHONPATH": "${workspaceFolder}"
      }
    },
    {
      "name": "Debug Single Test",
      "type": "python",
      "request": "launch",
      "module": "pytest",
      "args": [
        "${file}::${selectedText}",
        "-v",
        "-s",
        "--headed",
        "--browser",
        "chromium"
      ],
      "console": "integratedTerminal",
      "justMyCode": false
    }
  ]
}
```

### Common Debug Scenarios

#### Debug Specific Test
1. Place cursor on test function name
2. Press `F5` or use "Debug Test at Cursor"
3. Or: Right-click test in Explorer → **Debug Test**

#### Debug with Console Output
1. Edit `.vscode/settings.json`:
   ```json
   "python.testing.pytestArgs": [
     ".",
     "-v",
     "-s",  // Add -s for console output
     "--headed"
   ]
   ```
2. Run/debug tests as normal

#### Debug Test Failures
1. Failed tests show ❌ in Test Explorer
2. Click test to see error details
3. Click "Debug Test" to investigate

## Test Output and Artifacts

### Viewing Test Output

- **Test Explorer**: Click test to see output in bottom panel
- **Terminal**: Full output visible when running from terminal
- **Output Panel**: Select "Python Test Log" from dropdown

### Test Artifacts

Tests generate artifacts in these directories:
- `screenshots/` - Test screenshots
- `screenshots_data/` - Screenshot metadata (JSON)
- `console_logs/` - Browser console logs (JSON)

To view artifacts:
```bash
# List recent screenshots
ls -lt screenshots/ | head -20

# View screenshot metadata
cat screenshots_data/01_initial_load.json | jq

# View console logs
cat console_logs/test_*.json | jq
```

## Tips and Best Practices

### Test Discovery

**Issue**: Tests not showing in Explorer
- **Solution**: Reload window (`Cmd+Shift+P` → "Developer: Reload Window")
- **Solution**: Check Python interpreter is set to `.venv/bin/python`
- **Solution**: Verify pytest is installed: `.venv/bin/pip list | grep pytest`

### Performance

**Issue**: Tests running slowly in VSCode
- **Cause**: VSCode runs tests sequentially by default
- **Solution**: Use terminal with parallel execution for large test runs
- **Solution**: Use Test Explorer for individual test debugging only

### Browser Windows

**Issue**: Browser windows pile up during test runs
- **Cause**: Test failures may not clean up browsers
- **Solution**: Run tests with `--headed` to see browser (default)
- **Solution**: Kill orphaned processes: `pkill -f chromium`

### API Keys

**Issue**: Tests fail with "API key required"
- **Cause**: Missing `.env` file in `_tests/playwright/`
- **Solution**: Copy `.env.example` to `.env` and add API keys
- **Solution**: Verify environment variables are loaded

## Comparison: VSCode vs Terminal

### VSCode Test Explorer (Sequential)

**Best for**:
✅ Running individual tests
✅ Debugging specific failures
✅ Interactive development
✅ Quick test verification

**Not ideal for**:
❌ Running full test suite (too slow)
❌ CI/CD workflows
❌ Performance benchmarking

### Terminal with Parallel Execution

**Best for**:
✅ Running full test suite (2-5× faster)
✅ CI/CD integration
✅ Performance testing
✅ Batch test execution

**Not ideal for**:
❌ Debugging individual tests
❌ Interactive test development

## Recommended Workflow

### Development Workflow

1. **Write test** in VSCode editor
2. **Run single test** using Test Explorer (verify it works)
3. **Run related tests** in terminal with parallel execution
4. **Debug failures** using VSCode debugger
5. **Run full suite** before committing (terminal, parallel)

### Example Session

```bash
# 1. Write test in VSCode
# test_new_feature.py

# 2. Run single test via Test Explorer (click play button)
# Verify basic functionality works

# 3. Run related tests in parallel
.venv/bin/python -m pytest -n 4 test_new_feature.py test_related.py -v

# 4. If failures, debug in VSCode using debugger

# 5. Before commit, run full related suite
./run_feature_tests.sh --workers 6
```

## Troubleshooting

### Tests Not Discovered

**Symptoms**: Test Explorer empty or showing fewer tests

**Solutions**:
1. Check Python interpreter: Bottom-left of VSCode should show `.venv/bin/python`
2. Reload window: `Cmd+Shift+P` → "Developer: Reload Window"
3. Check pytest installation: `.venv/bin/pip show pytest`
4. Verify test file patterns: Files must start with `test_*.py`
5. Check pytest.ini configuration in root

### Tests Fail in VSCode but Pass in Terminal

**Symptoms**: Tests pass via `pytest` but fail in VSCode

**Solutions**:
1. Check working directory: VSCode may use different cwd
2. Verify environment variables: `.env` file loaded correctly
3. Check Python path: Terminal may use different interpreter
4. Compare pytest args: VSCode settings vs command-line

### Server Port Conflicts

**Symptoms**: `Address already in use` errors

**Solutions**:
1. Kill orphaned servers: `pkill -f "http.server 8000"`
2. Check for running tests: VSCode and terminal may conflict
3. Use different terminal session
4. Restart VSCode

### Slow Test Discovery

**Symptoms**: Test discovery takes minutes

**Solutions**:
1. Add exclusions to `.vscode/settings.json`:
   ```json
   "python.testing.pytestArgs": [
     ".",
     "--ignore=node_modules",
     "--ignore=.venv"
   ]
   ```
2. Disable auto-discovery: `"python.testing.autoTestDiscoverOnSaveEnabled": false`
3. Reduce test count: Focus on specific directories

## Advanced Configuration

### Custom Test Arguments

Edit `.vscode/settings.json`:

```json
{
  "python.testing.pytestArgs": [
    ".",
    "-v",
    "--headed",           // Show browser
    "--browser", "chromium",
    "--maxfail=5",        // Stop after 5 failures
    "--tb=short",         // Short traceback format
    "-x"                  // Stop on first failure
  ]
}
```

### Browser Selection

Run tests with different browsers:

```json
// Firefox
"python.testing.pytestArgs": [".", "-v", "--browser", "firefox"]

// WebKit (Safari)
"python.testing.pytestArgs": [".", "-v", "--browser", "webkit"]

// Multiple browsers
"python.testing.pytestArgs": [".", "-v", "--browser", "chromium", "--browser", "firefox"]
```

### Environment Variables

Set environment variables in `.vscode/settings.json`:

```json
{
  "python.testing.pytestArgs": [".", "-v"],
  "python.envFile": "${workspaceFolder}/.env",
  "terminal.integrated.env.osx": {
    "OPENAI_API_KEY": "your-key-here",
    "TEST_PROVIDER": "openai"
  }
}
```

## Summary

✅ **VSCode Test Explorer works perfectly** for individual test runs
✅ **Session-scoped fixture** supports both VSCode and parallel modes
✅ **Debugging integration** fully functional
✅ **For full suite runs**, use terminal with parallel execution

**Recommended setup**:
- VSCode for development and debugging (sequential mode)
- Terminal for full test runs (parallel mode with 4-6 workers)
- Best of both worlds: fast development + fast CI/CD