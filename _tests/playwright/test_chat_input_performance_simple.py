"""
Simple performance test for chat input to identify bottlenecks
"""

import pytest
import time
import json
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_chat_input_simple_performance(page: Page, serve_hacka_re):
    """
    Simplified test to identify what's making the chat input slow
    """
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("\n🔍 Testing Chat Input Performance")
    print("="*60)
    
    # First, let's see what event handlers are attached
    handlers_info = page.evaluate("""() => {
        const messageInput = document.getElementById('message-input');
        if (!messageInput) return null;
        
        // Try to get event listeners (Chrome DevTools Protocol)
        const handlers = [];
        
        // Check for common event types
        const eventTypes = ['input', 'keyup', 'keydown', 'change', 'paste', 'focus', 'blur'];
        
        // We can't directly get listeners, but we can test which events trigger
        eventTypes.forEach(type => {
            // Create a test listener
            let triggered = false;
            const testHandler = () => { triggered = true; };
            messageInput.addEventListener(type, testHandler);
            
            // Dispatch event
            const event = new Event(type);
            messageInput.dispatchEvent(event);
            
            if (triggered) {
                handlers.push(type);
            }
            
            messageInput.removeEventListener(type, testHandler);
        });
        
        return {
            element: messageInput.tagName,
            id: messageInput.id,
            handlers: handlers
        };
    }""")
    
    print(f"Input element info: {handlers_info}")
    
    # Inject performance monitoring
    page.evaluate("""() => {
        window.performanceLog = [];
        window.originalSetTimeout = window.setTimeout;
        
        // Monitor setTimeout usage (often used for debouncing)
        window.setTimeout = function(callback, delay, ...args) {
            const stack = new Error().stack;
            window.performanceLog.push({
                type: 'setTimeout',
                delay: delay,
                stack: stack.split('\\n')[2] || 'unknown'
            });
            return window.originalSetTimeout(callback, delay, ...args);
        };
        
        // Monitor input events
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            const originalValue = Object.getOwnPropertyDescriptor(
                HTMLTextAreaElement.prototype, 'value'
            );
            
            Object.defineProperty(messageInput, 'value', {
                get: function() {
                    return originalValue.get.call(this);
                },
                set: function(val) {
                    const start = performance.now();
                    originalValue.set.call(this, val);
                    const elapsed = performance.now() - start;
                    
                    if (elapsed > 1) {
                        window.performanceLog.push({
                            type: 'setValue',
                            elapsed: elapsed,
                            length: val.length
                        });
                    }
                    
                    // Dispatch input event
                    this.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        }
    }""")
    
    # Get the message input
    message_input = page.locator("#message-input")
    
    # Test 1: Type using fill (fastest method)
    print("\n📝 Test 1: Using fill() method")
    test_text = "a" * 1000
    
    start = time.perf_counter()
    message_input.fill(test_text)
    fill_time = (time.perf_counter() - start) * 1000
    
    print(f"  Time to fill 1000 chars: {fill_time:.2f}ms")
    
    # Check what happened
    perf_log = page.evaluate("() => window.performanceLog")
    print(f"  Performance events logged: {len(perf_log)}")
    
    # Look for setTimeout calls (debouncing)
    timeout_calls = [p for p in perf_log if p['type'] == 'setTimeout']
    if timeout_calls:
        print(f"  setTimeout calls: {len(timeout_calls)}")
        for call in timeout_calls[:3]:  # First 3
            print(f"    - Delay: {call['delay']}ms")
    
    # Clear for next test
    message_input.fill("")
    page.evaluate("() => { window.performanceLog = []; }")
    
    # Test 2: Type character by character
    print("\n📝 Test 2: Typing character by character")
    test_text = "b" * 100  # Shorter for char-by-char
    
    start = time.perf_counter()
    for char in test_text:
        message_input.type(char)
    type_time = (time.perf_counter() - start) * 1000
    
    print(f"  Time to type 100 chars: {type_time:.2f}ms")
    print(f"  Average per char: {type_time/100:.2f}ms")
    
    perf_log = page.evaluate("() => window.performanceLog")
    print(f"  Performance events logged: {len(perf_log)}")
    
    # Test 3: Check what happens on input event
    print("\n📝 Test 3: Analyzing input event handlers")
    
    # Clear and prepare
    message_input.fill("")
    
    # Inject handler analysis
    handler_analysis = page.evaluate("""() => {
        const messageInput = document.getElementById('message-input');
        const results = [];
        
        // Create a proxy for addEventListener to intercept handlers
        const originalAdd = messageInput.addEventListener;
        const handlers = [];
        
        messageInput.addEventListener = function(type, handler) {
            if (type === 'input') {
                // Wrap handler to measure performance
                const wrapped = function(event) {
                    const start = performance.now();
                    handler.call(this, event);
                    const elapsed = performance.now() - start;
                    
                    results.push({
                        type: 'input',
                        elapsed: elapsed,
                        handlerString: handler.toString().substring(0, 100)
                    });
                };
                handlers.push(wrapped);
                return originalAdd.call(this, type, wrapped);
            }
            return originalAdd.call(this, type, handler);
        };
        
        // Type some text to trigger handlers
        messageInput.value = 'Test text to trigger handlers';
        messageInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Wait a bit for async operations
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    handlersFound: handlers.length,
                    results: results
                });
            }, 1000);
        });
    }""")
    
    print(f"  Handlers found: {handler_analysis}")
    
    # Test 4: Check for expensive operations
    print("\n📝 Test 4: Checking for expensive operations")
    
    expensive_ops = page.evaluate("""() => {
        const checks = {};
        
        // Check if there's token counting
        checks.tokenCounting = typeof window.estimateTokenCount === 'function' ||
                              typeof window.updateContextUsage === 'function';
        
        // Check for debounce timeout
        checks.debounceTimeout = typeof window.debounceTimeout !== 'undefined';
        
        // Check for auto-resize
        const messageInput = document.getElementById('message-input');
        const style = window.getComputedStyle(messageInput);
        checks.autoResize = style.resize === 'none' && messageInput.style.height;
        
        // Check localStorage access
        const originalGetItem = localStorage.getItem;
        let localStorageCalls = 0;
        localStorage.getItem = function(key) {
            localStorageCalls++;
            return originalGetItem.call(this, key);
        };
        
        // Trigger input event to see if localStorage is accessed
        messageInput.value = 'test';
        messageInput.dispatchEvent(new Event('input'));
        
        checks.localStorageAccess = localStorageCalls;
        
        // Restore
        localStorage.getItem = originalGetItem;
        
        return checks;
    }""")
    
    print(f"  Expensive operations found:")
    for op, value in expensive_ops.items():
        print(f"    - {op}: {value}")
    
    # Test 5: Measure real-world typing scenario
    print("\n📝 Test 5: Real-world typing simulation")
    
    message_input.fill("")
    
    # Simulate typing a real message
    real_message = "This is a test message to simulate real typing with spaces and punctuation! Let's see how it performs when we type naturally."
    
    # Measure with monitoring
    page.evaluate("""() => {
        window.inputEventCount = 0;
        window.inputEventTotalTime = 0;
        
        const messageInput = document.getElementById('message-input');
        const handler = function(e) {
            const start = performance.now();
            // Let the event propagate
            setTimeout(() => {
                const elapsed = performance.now() - start;
                window.inputEventCount++;
                window.inputEventTotalTime += elapsed;
            }, 0);
        };
        
        messageInput.addEventListener('input', handler);
    }""")
    
    start = time.perf_counter()
    message_input.type(real_message, delay=10)  # 10ms between chars (fast typing)
    real_type_time = (time.perf_counter() - start) * 1000
    
    # Get stats
    stats = page.evaluate("""() => ({
        count: window.inputEventCount,
        totalTime: window.inputEventTotalTime,
        avgTime: window.inputEventTotalTime / window.inputEventCount
    })""")
    
    print(f"  Message length: {len(real_message)} chars")
    print(f"  Total typing time: {real_type_time:.2f}ms")
    print(f"  Input events fired: {stats['count']}")
    print(f"  Average handler time: {stats['avgTime']:.2f}ms")
    
    # Take screenshot of final state
    screenshot_with_markdown(page, "chat_input_performance_analysis", {
        "Fill 1000 chars": f"{fill_time:.2f}ms",
        "Type 100 chars": f"{type_time:.2f}ms", 
        "Real message": f"{real_type_time:.2f}ms",
        "Expensive ops": str(list(expensive_ops.keys()))
    })
    
    # Generate recommendations
    print("\n" + "="*60)
    print("💡 PERFORMANCE ANALYSIS SUMMARY")
    print("="*60)
    
    if fill_time > 100:
        print("⚠️  Fill operation is slow - likely due to event handlers")
    
    if type_time / 100 > 10:
        print("⚠️  Individual character typing is slow (>10ms per char)")
    
    if expensive_ops.get('tokenCounting'):
        print("⚠️  Token counting on every input - should be debounced more")
    
    if expensive_ops.get('localStorageAccess', 0) > 0:
        print("⚠️  localStorage accessed on input events - should be cached")
    
    if expensive_ops.get('autoResize'):
        print("ℹ️  Auto-resize is enabled - may cause reflows")
    
    print("\n✅ Test completed successfully!")


def test_measure_debounce_performance(page: Page, serve_hacka_re):
    """
    Specifically test the debounce mechanism and token counting
    """
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    print("\n🔍 Testing Debounce and Token Counting Performance")
    print("="*60)
    
    # Hook into the debounced function
    debounce_info = page.evaluate("""() => {
        const messageInput = document.getElementById('message-input');
        
        // Find updateContextUsage function
        let updateContextUsage = null;
        let debounceDelay = null;
        
        // Look for the debounce timeout
        if (typeof window.debounceTimeout !== 'undefined') {
            debounceDelay = 300; // Default from code
        }
        
        // Monitor the actual context update
        const results = {
            debounceDelay: debounceDelay,
            contextUpdates: [],
            timeouts: []
        };
        
        // Hook setTimeout to track debounce
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(fn, delay, ...args) {
            if (delay === 300 || delay === debounceDelay) {
                results.timeouts.push({
                    delay: delay,
                    timestamp: Date.now()
                });
            }
            
            // Wrap the function to measure execution time
            const wrapped = function() {
                const start = performance.now();
                const result = fn.apply(this, arguments);
                const elapsed = performance.now() - start;
                
                if (elapsed > 5) {
                    results.contextUpdates.push({
                        elapsed: elapsed,
                        timestamp: Date.now()
                    });
                }
                
                return result;
            };
            
            return originalSetTimeout.call(this, wrapped, delay, ...args);
        };
        
        return results;
    }""")
    
    print(f"Initial setup: {debounce_info}")
    
    # Type text quickly to trigger debounce
    message_input = page.locator("#message-input")
    
    print("\n📝 Typing text rapidly to test debounce...")
    
    # Type 50 characters quickly
    for i in range(50):
        message_input.type("a")
        if i % 10 == 0:
            page.wait_for_timeout(50)  # Small pause every 10 chars
    
    # Wait for debounce to complete
    page.wait_for_timeout(500)
    
    # Get results
    results = page.evaluate("() => window.results || {}")
    
    print(f"\n📊 Debounce Performance Results:")
    if 'timeouts' in results:
        print(f"  Timeout calls: {len(results.get('timeouts', []))}")
    if 'contextUpdates' in results:
        print(f"  Context updates: {len(results.get('contextUpdates', []))}")
        for update in results.get('contextUpdates', [])[:5]:
            print(f"    - Execution time: {update['elapsed']:.2f}ms")
    
    # Now test with paste (large text at once)
    print("\n📝 Testing paste operation...")
    
    large_text = "Lorem ipsum " * 500  # ~6000 chars
    
    message_input.fill("")
    page.evaluate("() => { if (window.results) { window.results.contextUpdates = []; window.results.timeouts = []; }}")
    
    start = time.perf_counter()
    message_input.fill(large_text)
    paste_time = (time.perf_counter() - start) * 1000
    
    # Wait for operations to complete
    page.wait_for_timeout(500)
    
    results_after_paste = page.evaluate("() => window.results || {}")
    
    print(f"\n📊 Paste Performance Results:")
    print(f"  Paste time: {paste_time:.2f}ms for {len(large_text)} chars")
    if 'contextUpdates' in results_after_paste:
        updates = results_after_paste.get('contextUpdates', [])
        if updates:
            print(f"  Context updates triggered: {len(updates)}")
            total_time = sum(u['elapsed'] for u in updates)
            print(f"  Total context update time: {total_time:.2f}ms")
    
    print("\n✅ Debounce test completed!")