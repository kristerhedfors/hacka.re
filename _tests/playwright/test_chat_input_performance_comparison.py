"""
Test to compare performance before and after optimizations
"""

import pytest
import time
import json
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_performance_improvements(page: Page, serve_hacka_re):
    """
    Verify that performance improvements are working
    """
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("\n" + "="*60)
    print("PERFORMANCE IMPROVEMENTS VERIFICATION")
    print("="*60)
    
    # Inject monitoring
    monitoring = page.evaluate("""() => {
        const results = {
            resizeEvents: 0,
            contextUpdates: 0,
            voiceHandlerCalls: 0,
            rafCalls: 0,
            idleCallbacks: 0,
            maxTextareaHeight: 0
        };
        
        // Monitor resize events
        const messageInput = document.getElementById('message-input');
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    results.resizeEvents++;
                    const height = parseInt(messageInput.style.height) || 0;
                    results.maxTextareaHeight = Math.max(results.maxTextareaHeight, height);
                }
            });
        });
        observer.observe(messageInput, { attributes: true });
        
        // Monitor requestAnimationFrame usage
        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function(callback) {
            results.rafCalls++;
            return originalRAF.call(this, callback);
        };
        
        // Monitor requestIdleCallback usage
        if (window.requestIdleCallback) {
            const originalRIC = window.requestIdleCallback;
            window.requestIdleCallback = function(callback, options) {
                results.idleCallbacks++;
                return originalRIC.call(this, callback, options);
            };
        }
        
        // Monitor setTimeout for debouncing
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(fn, delay) {
            if (delay === 500) { // Our new debounce delay
                results.contextUpdates++;
            }
            return originalSetTimeout.apply(this, arguments);
        };
        
        window.performanceResults = results;
        return true;
    }""")
    
    message_input = page.locator("#message-input")
    
    # Test 1: Type text that should trigger max height
    print("\n📝 Test 1: Testing max height enforcement")
    long_text = "Line of text\n" * 20  # 20 lines should exceed max height
    
    message_input.fill(long_text)
    page.wait_for_timeout(1000)  # Wait for all updates
    
    # Check textarea height
    textarea_style = page.evaluate("""() => {
        const textarea = document.getElementById('message-input');
        return {
            height: parseInt(textarea.style.height) || 0,
            scrollHeight: textarea.scrollHeight,
            overflowY: textarea.style.overflowY || 'visible'
        };
    }""")
    
    print(f"  Textarea height: {textarea_style['height']}px (should be ≤150px)")
    print(f"  Scroll height: {textarea_style['scrollHeight']}px")
    print(f"  Overflow: {textarea_style['overflowY']}")
    
    assert textarea_style['height'] <= 150, f"Height {textarea_style['height']}px exceeds max 150px"
    if textarea_style['scrollHeight'] > 150:
        assert textarea_style['overflowY'] == 'auto', "Overflow should be 'auto' when content exceeds max height"
    
    # Test 2: Check debouncing
    print("\n📝 Test 2: Testing improved debouncing")
    message_input.fill("")
    page.evaluate("() => { window.performanceResults.contextUpdates = 0; }")
    
    # Type rapidly
    for i in range(10):
        message_input.type("a")
    
    page.wait_for_timeout(100)  # Wait briefly
    
    mid_check = page.evaluate("() => window.performanceResults.contextUpdates")
    print(f"  Context updates after rapid typing: {mid_check} (should be 1 due to debouncing)")
    
    page.wait_for_timeout(600)  # Wait for debounce to complete
    
    final_check = page.evaluate("() => window.performanceResults.contextUpdates")
    print(f"  Context updates after debounce: {final_check}")
    
    # Test 3: Check RAF usage
    print("\n📝 Test 3: Testing requestAnimationFrame usage")
    message_input.fill("")
    page.evaluate("() => { window.performanceResults.rafCalls = 0; }")
    
    # Type to trigger resize
    message_input.type("Test text to trigger resize")
    page.wait_for_timeout(100)
    
    raf_calls = page.evaluate("() => window.performanceResults.rafCalls")
    print(f"  RAF calls: {raf_calls} (should be >0 for batched updates)")
    
    # Get final performance metrics
    final_metrics = page.evaluate("() => window.performanceResults")
    
    print("\n📊 Final Performance Metrics:")
    print(f"  Total resize events: {final_metrics['resizeEvents']}")
    print(f"  Max textarea height reached: {final_metrics['maxTextareaHeight']}px")
    print(f"  RequestAnimationFrame calls: {final_metrics['rafCalls']}")
    print(f"  RequestIdleCallback calls: {final_metrics['idleCallbacks']}")
    print(f"  Context update debounces: {final_metrics['contextUpdates']}")
    
    # Take screenshot
    screenshot_with_markdown(page, "performance_improvements_verified", {
        "Max Height": f"{final_metrics['maxTextareaHeight']}px",
        "RAF Calls": str(final_metrics['rafCalls']),
        "Idle Callbacks": str(final_metrics['idleCallbacks']),
        "Debounced Updates": str(final_metrics['contextUpdates'])
    })
    
    print("\n✅ All performance improvements verified!")
    
    # Performance assertions
    assert final_metrics['maxTextareaHeight'] <= 150, "Max height not enforced"
    assert final_metrics['rafCalls'] > 0, "RequestAnimationFrame not being used"
    assert mid_check <= 2, "Debouncing not working effectively"


def test_large_text_performance(page: Page, serve_hacka_re):
    """
    Test performance with very large text input
    """
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("\n" + "="*60)
    print("LARGE TEXT PERFORMANCE TEST")
    print("="*60)
    
    message_input = page.locator("#message-input")
    
    # Generate a very large text (like pasting a document)
    large_text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " * 500  # ~30,000 chars
    
    print(f"\n📝 Testing with {len(large_text)} characters")
    
    # Measure fill performance
    start = time.perf_counter()
    message_input.fill(large_text)
    fill_time = (time.perf_counter() - start) * 1000
    
    print(f"  Fill time: {fill_time:.2f}ms")
    
    # Wait for all async operations
    page.wait_for_timeout(1000)
    
    # Check that height is still capped
    height = page.evaluate("() => parseInt(document.getElementById('message-input').style.height) || 0")
    print(f"  Final height: {height}px (should be ≤150px)")
    
    # Clear and test typing performance
    message_input.fill("")
    
    print("\n📝 Testing append performance")
    
    # Type additional text to existing content
    message_input.fill("Initial text. ")
    
    append_start = time.perf_counter()
    for i in range(50):
        message_input.press("End")  # Go to end
        message_input.type("More text. ")
    append_time = (time.perf_counter() - append_start) * 1000
    
    print(f"  Append 50 chunks time: {append_time:.2f}ms")
    print(f"  Average per append: {append_time/50:.2f}ms")
    
    assert height <= 150, f"Height {height}px exceeds maximum"
    assert fill_time < 500, f"Fill time {fill_time}ms is too slow"
    assert append_time/50 < 100, f"Append performance {append_time/50}ms per chunk is too slow"
    
    print("\n✅ Large text performance test passed!")