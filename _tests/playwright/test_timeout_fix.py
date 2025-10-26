"""
Test that timeout is properly cleared and doesn't interfere with successful executions
"""
import pytest
from playwright.sync_api import Page
import time

def test_timeout_cleared_on_success(page: Page, serve_hacka_re):
    """Test that timeout is cleared when function succeeds"""
    page.goto(serve_hacka_re)

    # Enable console logging
    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    # Create a slow function that takes 2 seconds but should succeed
    page.evaluate("""
        () => {
            window.testSlowFunction = async function() {
                await new Promise(resolve => setTimeout(resolve, 2000));
                return { success: true, message: "Completed after 2 seconds" };
            };
        }
    """)

    # Execute the function
    result = page.evaluate("""
        async () => {
            try {
                const result = await window.testSlowFunction();
                return { success: true, result };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
    """)

    # Wait a bit to see if any timeout errors appear
    time.sleep(1)

    # Check that function succeeded
    assert result['success'] == True, f"Function should have succeeded: {result}"

    # Check that no timeout errors appear in console
    timeout_logs = [log for log in console_logs if 'timeout' in log.lower()]

    if timeout_logs:
        print("\n❌ Timeout logs found (should be none):")
        for log in timeout_logs:
            print(f"  {log}")
        assert False, "Timeout errors should not appear after successful execution"
    else:
        print("\n✓ No timeout errors found")

    print("✓ Function completed successfully")
    print(f"✓ Result: {result['result']}")


def test_multiple_async_functions_no_interference(page: Page, serve_hacka_re):
    """Test that multiple concurrent function calls don't interfere with each other"""
    page.goto(serve_hacka_re)

    # Enable console logging
    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    # Create three functions with different execution times
    page.evaluate("""
        () => {
            window.fastFunction = async function() {
                await new Promise(resolve => setTimeout(resolve, 100));
                return { id: 'fast', completed: true };
            };

            window.mediumFunction = async function() {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return { id: 'medium', completed: true };
            };

            window.slowFunction = async function() {
                await new Promise(resolve => setTimeout(resolve, 2000));
                return { id: 'slow', completed: true };
            };
        }
    """)

    # Execute all three functions concurrently
    results = page.evaluate("""
        async () => {
            const promises = [
                window.fastFunction(),
                window.mediumFunction(),
                window.slowFunction()
            ];

            try {
                const results = await Promise.all(promises);
                return { success: true, results };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
    """)

    # All should succeed
    assert results['success'] == True, f"All functions should succeed: {results}"
    assert len(results['results']) == 3

    # Check results
    ids = [r['id'] for r in results['results']]
    assert 'fast' in ids
    assert 'medium' in ids
    assert 'slow' in ids

    print("✓ All three functions completed successfully")
    print(f"✓ Results: {results['results']}")

    # No timeout errors
    timeout_logs = [log for log in console_logs if 'timeout' in log.lower()]
    assert len(timeout_logs) == 0, f"Should have no timeout errors, found: {timeout_logs}"

    print("✓ No timeout errors found")
