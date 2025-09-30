# Quick Start: Running Tests

## TL;DR

```bash
# Run core tests (no API keys needed for most)
cd /Users/user/dev/hacka.re
_tests/playwright/run_core_tests.sh

# Run with API keys configured
cp _tests/playwright/.env.example _tests/playwright/.env
# Edit .env and add your keys
_tests/playwright/run_tests.sh
```

---

## Setup (First Time Only)

### 1. Install Dependencies
```bash
cd /Users/user/dev/hacka.re/_tests/playwright
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/playwright install chromium
```

### 2. Configure API Keys (Optional)
```bash
cp .env.example .env
# Edit .env and add:
# OPENAI_API_KEY=sk-...
# SHODAN_API_KEY=...
# GROQ_API_KEY=...
# GITHUB_PAT=ghp_...
```

---

## Running Tests

### Option 1: Use Test Scripts (Recommended)
```bash
# Core functionality (fast, ~2 minutes)
_tests/playwright/run_core_tests.sh

# Feature tests (function calling, MCP, sharing)
_tests/playwright/run_feature_tests.sh

# Full test suite (~10 minutes)
_tests/playwright/run_tests.sh
```

### Option 2: Direct pytest Commands
```bash
# All tests with 6 parallel workers
_tests/playwright/.venv/bin/python -m pytest _tests/playwright/ -n 6

# Specific test file
_tests/playwright/.venv/bin/python -m pytest _tests/playwright/test_page.py -v

# Stop on first failure (useful for debugging)
_tests/playwright/.venv/bin/python -m pytest _tests/playwright/ -n 4 -x

# Show detailed output
_tests/playwright/.venv/bin/python -m pytest _tests/playwright/test_api.py -v -s
```

### Option 3: Filter by Markers
```bash
# Skip tests requiring API keys
pytest -m "not requires_shodan_api and not requires_github_token"

# Run only Shodan tests
pytest -m "requires_shodan_api"

# Run only fast tests (no integration)
pytest -m "not integration and not slow"
```

---

## Common Issues & Solutions

### Issue: Tests Fail with "API key not found"
**Solution**: Configure API keys in `_tests/playwright/.env` or skip those tests:
```bash
pytest -m "not requires_shodan_api"
```

### Issue: Tests Fail in Parallel But Pass Individually
**Solution**: Use `isolated_page` fixture in your test:
```python
def test_my_test(isolated_page):  # Instead of (page, serve_hacka_re)
    # Test automatically gets clean localStorage
    isolated_page.locator("#button").click()
```

### Issue: Server Already Running Error
**Solution**: Kill existing server:
```bash
./scripts/stop_server.sh
# Or manually:
pkill -f "python.*http.server.*8000"
```

### Issue: Shodan Modal Hangs
**Solution**: This is fixed! If you see it, ensure you're passing credentials:
```python
# In tests, use:
page.evaluate(f"""async () => {{
    await window.MCPServiceConnectors.connectService('shodan', {{ apiKey: '{shodan_api_key}' }});
}}""")
```

---

## Parallel Execution Details

### How It Works
- Tests run with `pytest-xdist` using 4-6 workers
- Each worker is a separate process with its own browser
- Shared HTTP server on port 8000 (coordinated with FileLock)
- Tests from same file run on same worker (`--dist=loadfile`)

### Performance
- **Sequential**: ~30-40 minutes for full suite
- **Parallel (6 workers)**: ~9-10 minutes
- **Speedup**: 4-5×

### Worker Configuration
```bash
# Auto-detect CPU cores
pytest -n auto

# Specific worker count
pytest -n 4

# Default in scripts: 4 for core, 6 for full suite
```

---

## Test Markers Reference

Mark tests to categorize them:

```python
import pytest

@pytest.mark.requires_shodan_api
def test_shodan_feature(page, serve_hacka_re, shodan_api_key):
    # Test code

@pytest.mark.requires_github_token
@pytest.mark.slow
def test_github_integration(page, serve_hacka_re):
    # Test code

@pytest.mark.shodan_premium
def test_premium_feature(page, serve_hacka_re, shodan_api_key):
    # Test code
```

### Available Markers
- `requires_shodan_api` - Needs Shodan API key
- `requires_github_token` - Needs GitHub PAT
- `requires_openai_key` - Needs OpenAI API key
- `requires_groq_key` - Needs Groq API key
- `requires_berget_key` - Needs Berget API key
- `shodan_premium` - Needs Shodan premium account
- `feature_test` - Feature integration test
- `slow` - Takes >30 seconds
- `integration` - Integrates multiple components

---

## Writing New Tests

### Basic Test Template
```python
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal

def test_my_feature(page: Page, serve_hacka_re):
    """Test description"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Your test code
    button = page.locator("#my-button")
    expect(button).to_be_visible()
    button.click()
```

### Test with Isolation
```python
def test_parallel_safe(isolated_page):
    """Test that needs isolation for parallel execution"""
    # No need to call page.goto() - already done
    # No need to dismiss welcome - already done
    # Unique namespace automatically set

    isolated_page.locator("#element").click()
    # Test code
```

### Test with API Integration
```python
@pytest.mark.requires_shodan_api
def test_shodan_feature(page: Page, serve_hacka_re, shodan_api_key):
    """Test Shodan integration"""
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)

    # Use API key
    result = page.evaluate(f"""async () => {{
        return await window.MCPServiceConnectors.connectService(
            'shodan',
            {{ apiKey: '{shodan_api_key}' }}
        );
    }}""")

    assert result == True
```

---

## Debugging Tests

### 1. Run Single Test with Visible Browser
```bash
pytest _tests/playwright/test_file.py::test_name -v -s --headed
```

### 2. Add Breakpoint
```python
def test_debug(page: Page, serve_hacka_re):
    page.goto(serve_hacka_re)
    page.pause()  # Opens Playwright inspector
    # Continue test...
```

### 3. Capture Screenshots
```python
from test_utils import screenshot_with_markdown

def test_with_debug(page: Page, serve_hacka_re):
    page.goto(serve_hacka_re)
    # Take screenshot with context
    screenshot_with_markdown(page, "before_click", {
        "Status": "Ready",
        "Element": "#button"
    })
```

### 4. Check Console Logs
```python
def test_with_logs(page: Page, serve_hacka_re):
    console_messages = []
    page.on("console", lambda msg: console_messages.append(msg.text))

    page.goto(serve_hacka_re)
    # ... test code ...

    # Print captured logs
    for msg in console_messages:
        print(msg)
```

---

## CI/CD Integration

### Skip Integration Tests in CI
```yaml
# .github/workflows/tests.yml
- name: Run Tests
  run: |
    pytest -m "not requires_shodan_api and not requires_github_token" -n auto
```

### Run Tests with Secrets
```yaml
- name: Run Integration Tests
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    SHODAN_API_KEY: ${{ secrets.SHODAN_API_KEY }}
  run: |
    pytest -n auto
```

---

## Performance Tips

### Faster Test Runs
1. **Run specific test file** instead of full suite
2. **Use `-x`** to stop on first failure
3. **Skip slow tests**: `pytest -m "not slow"`
4. **Reduce workers** for development: `pytest -n 2`

### Optimize Tests
1. **Reuse browser contexts** when possible
2. **Use `isolated_page`** only when needed (adds overhead)
3. **Mark slow tests** with `@pytest.mark.slow`
4. **Mock external APIs** in unit tests

---

## Getting Help

### Useful Commands
```bash
# List all markers
pytest --markers

# List all tests
pytest --collect-only

# Show test durations
pytest --durations=10

# Generate HTML report
pytest --html=report.html
```

### Documentation
- Playwright: https://playwright.dev/python/
- pytest: https://docs.pytest.org/
- pytest-xdist: https://pytest-xdist.readthedocs.io/

### Test Utilities
See `_tests/playwright/test_utils.py` for helper functions:
- `dismiss_welcome_modal(page)`
- `dismiss_settings_modal(page)`
- `screenshot_with_markdown(page, name, metadata)`
- `check_system_messages(page)`

---

## Summary

**For Quick Testing**:
```bash
_tests/playwright/run_core_tests.sh
```

**For Full Testing**:
```bash
# Configure API keys first
cp _tests/playwright/.env.example _tests/playwright/.env
# Edit .env
_tests/playwright/run_tests.sh
```

**For Development**:
```bash
# Run single test with visible browser
pytest _tests/playwright/test_file.py::test_name --headed -v -s
```

That's it! Happy testing! 🧪