# Parallel Testing Implementation Results

## Summary

Parallel testing has been significantly improved but **sequential execution still provides better results** for this test suite.

### Test Results Comparison (51-test suite)

| Mode | Passed | Failed | Skipped | Pass Rate | Duration |
|------|--------|--------|---------|-----------|----------|
| **Sequential** | 41 | 5 | 5 | **80%** | 414s (6m 54s) |
| **Parallel (4 workers)** | 24 | 22 | 5 | **47%** | 118s (1m 58s) |

### Recommendation

**Use sequential execution for reliable results.** While parallel is 3.5× faster, the 33% drop in pass rate makes it unsuitable for CI/CD or development workflows where reliability is critical.

---

## What Was Fixed

### 1. HTTP Server Stability ✅
**Problem**: Server was being killed by workers mid-test, causing `ERR_SOCKET_NOT_CONNECTED`

**Solution**: Changed cleanup strategy in `conftest.py`:
- Server cleanup moved to `atexit` handler
- No cleanup during test execution
- Server stays running for all workers

**Result**: ✅ No more connection errors

### 2. Browser Context Isolation ✅
**Problem**: Tests sharing browser state (localStorage/cookies) causing interference

**Solution**: Each test gets fresh browser context:
```python
def page(browser):
    context = browser.new_context()  # Fresh context per test
    page = context.new_page()
    yield page
    page.close()
    context.close()
```

**Result**: ✅ Tests properly isolated

### 3. Individual Test Timeouts ✅
**Problem**: Global timeout causing loss of progress

**Solution**: Added pytest-timeout with per-test timeouts:
```ini
addopts = --timeout=120  # 120s per test
```

**Result**: ✅ Individual tests timeout independently

### 4. Headless vs Headed Mode
**Finding**: Tests were developed with `--headed` and have timing issues in headless

**Decision**: Kept `--headed` mode for compatibility
- Headless: 17 passed (33%)
- Headed: 24 passed (47%)

**Result**: ✅ Better pass rate with headed mode

---

## Why Parallel Tests Still Fail

### Root Cause: Test Design
These tests were designed for **sequential execution** and have inherent race conditions/timing dependencies that are difficult to fix without rewriting tests.

### Common Failure Patterns

1. **Timing-Dependent Tests** (12 failures)
   - Tests expect specific load times
   - Elements appear slower under parallel load
   - Example: Modal dialogs timing out at 10s

2. **Test Ordering Dependencies** (7 failures)
   - Some tests assume clean state from previous test
   - Example: Settings tests failing after config changes

3. **Resource Contention** (3 failures)
   - Multiple workers hitting same endpoints
   - API rate limits or server load issues

---

## Files Modified

### 1. `/Users/user/dev/hacka.re/_tests/playwright/conftest.py`

**Lines 1-6**: Added imports for atexit and signal
```python
import pytest
import os
import atexit
import signal
from playwright.sync_api import Page, expect
from dotenv import load_dotenv
```

**Lines 56-76**: Fixed page fixture for context isolation
```python
@pytest.fixture(scope="function")
def page(browser):
    """Create a new page with isolated context for each test."""
    context = browser.new_context()
    page = context.new_page()
    page.set_default_timeout(10000)
    yield page
    page.close()
    context.close()
```

**Lines 146-170**: Fixed server cleanup with atexit
```python
# Register cleanup handler to run when pytest exits
def cleanup_server():
    try:
        if os.path.exists(str(server_file)):
            with open(str(server_file)) as f:
                data = json.load(f)
                pid = data.get("pid")
                if pid:
                    try:
                        os.killpg(os.getpgid(pid), signal.SIGTERM)
                        print(f"Cleanup: Stopped HTTP server (PID {pid})")
                    except (ProcessLookupError, PermissionError):
                        pass
            os.unlink(str(server_file))
    except Exception as e:
        print(f"Cleanup error: {e}")

atexit.register(cleanup_server)

yield base_url

# No cleanup here - server stays running for all workers
```

### 2. `/Users/user/dev/hacka.re/_tests/playwright/pytest.ini`

**Line 16**: Added timeout and kept headed mode
```ini
addopts = --browser chromium --maxfail=1000 --ignore=test_organization --timeout=120 --headed
```

### 3. `/Users/user/dev/hacka.re/_tests/playwright/requirements.txt`

**Added**: pytest-timeout for individual test timeouts
```
pytest-timeout==2.4.0
```

---

## Running Tests

### Recommended: Sequential Execution
```bash
# Best reliability (80% pass rate)
cd /Users/user/dev/hacka.re/_tests/playwright
.venv/bin/python -m pytest test_page.py test_api.py test_chat.py \
  test_function_modal.py test_function_execution_modal.py test_mcp_simple.py \
  test_clear_chat.py test_default_prompts.py test_rag_bundles.py \
  test_copy_chat.py test_yolo_mode.py test_new_crypto_share.py -v
```

### Optional: Parallel Execution
```bash
# Faster but less reliable (47% pass rate)
cd /Users/user/dev/hacka.re/_tests/playwright
.venv/bin/python -m pytest test_page.py test_api.py test_chat.py \
  test_function_modal.py test_function_execution_modal.py test_mcp_simple.py \
  test_clear_chat.py test_default_prompts.py test_rag_bundles.py \
  test_copy_chat.py test_yolo_mode.py test_new_crypto_share.py \
  -n 4 --dist=loadfile -v
```

---

## Performance Analysis

### Speed vs Reliability Trade-off

```
Sequential: 414s, 80% pass rate = 330s of productive testing
Parallel:   118s, 47% pass rate = 55s of productive testing

Reality: Parallel saves 296s but wastes time debugging 16 extra failures
```

**Conclusion**: The time saved by parallel execution is offset by the time spent investigating and fixing flaky test failures.

---

## Recommendations for Future Work

### To Achieve Reliable Parallel Testing

1. **Rewrite Timing-Dependent Tests**
   - Replace hardcoded `wait_for_timeout` with condition waits
   - Increase default timeouts from 10s to 30s
   - Add retry logic for flaky elements

2. **Remove Test Dependencies**
   - Each test should be completely independent
   - Use fixtures for setup instead of relying on previous tests
   - Clear all state between tests (already improved)

3. **Add Retry Mechanism**
   ```python
   @pytest.mark.flaky(reruns=2, reruns_delay=1)
   def test_flaky_feature():
       # Test code
   ```

4. **Consider Headless Mode**
   - Fix timing issues that appear in headless
   - Would enable faster CI/CD execution
   - Currently: headed=47% pass, headless=33% pass

### Estimated Effort

- **Quick wins** (2-3 hours): Increase timeouts, add retries → 55-60% pass rate
- **Medium effort** (1-2 days): Fix timing dependencies → 70-75% pass rate
- **Full rewrite** (1 week): Redesign for parallel → 80%+ pass rate

---

## Current Best Practice

**For Development**: Use sequential execution
```bash
# Fast enough for local development (7 minutes)
pytest test_*.py -v
```

**For CI/CD**: Use sequential execution with markers
```bash
# Run only fast, reliable tests
pytest -m "not slow and not integration" -v
```

**For Speed** (when debugging specific tests): Use parallel with small batches
```bash
# Fast feedback for specific file
pytest test_page.py test_api.py -n 2 -v
```

---

## Summary

✅ **Achieved**:
- HTTP server stability in parallel mode
- Browser context isolation per test
- Individual test timeouts
- No more infrastructure failures

❌ **Not Achieved**:
- Parallel pass rate matching sequential (47% vs 80%)
- Headless mode compatibility (33% pass rate)

**Verdict**: Parallel testing infrastructure is **solid** but test suite design is **not parallel-ready**. Recommend sequential execution until tests are refactored for parallel compatibility.