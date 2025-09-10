"""
Performance test for chat input field
Tests for performance bottlenecks when typing large amounts of text
"""

import pytest
import time
import json
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

def test_chat_input_performance_bottleneck(page: Page, serve_hacka_re):
    """
    Test chat input performance by progressively typing more text
    and measuring performance metrics at each stage
    """
    
    # Navigate to the application
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Inject performance monitoring code
    page.evaluate("""
        // Create performance logger for testing
        window.chatInputPerfLogger = new PerformanceLogger('ChatInput');
        window.performanceMetrics = [];
        
        // Override addEventListener to track all event handlers
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        window.eventHandlers = {};
        
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (this.id === 'message-input') {
                if (!window.eventHandlers[type]) {
                    window.eventHandlers[type] = [];
                }
                
                // Wrap the listener to track performance
                const wrappedListener = function(...args) {
                    const startTime = performance.now();
                    const result = listener.apply(this, args);
                    const elapsed = performance.now() - startTime;
                    
                    if (elapsed > 1) { // Only log if > 1ms
                        window.performanceMetrics.push({
                            event: type,
                            elapsed: elapsed,
                            textLength: this.value ? this.value.length : 0,
                            timestamp: Date.now()
                        });
                        
                        // Log to console for debugging
                        window.chatInputPerfLogger.log(
                            `Event: ${type}, Length: ${this.value ? this.value.length : 0}`,
                            `Elapsed: ${elapsed.toFixed(2)}ms`
                        );
                    }
                    
                    return result;
                };
                
                window.eventHandlers[type].push({
                    original: listener,
                    wrapped: wrappedListener
                });
                
                return originalAddEventListener.call(this, type, wrappedListener, options);
            }
            
            return originalAddEventListener.call(this, type, listener, options);
        };
        
        // Track render performance
        window.trackRenderPerformance = function() {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'measure' || entry.entryType === 'paint') {
                        window.performanceMetrics.push({
                            type: 'render',
                            name: entry.name,
                            duration: entry.duration,
                            timestamp: entry.startTime
                        });
                    }
                }
            });
            
            observer.observe({ entryTypes: ['measure', 'paint'] });
        };
        
        window.trackRenderPerformance();
    """)
    
    # Get the message input element
    message_input = page.locator("#message-input")
    message_input.click()
    
    # Test data - smaller text chunks to avoid slowdown
    test_scenarios = [
        {
            "name": "Small text (10 chars)",
            "text": "a" * 10,
            "expected_max_time": 50  # ms
        },
        {
            "name": "Medium text (50 chars)",
            "text": "b" * 50,
            "expected_max_time": 100  # ms
        },
        {
            "name": "Large text (100 chars)",
            "text": "c" * 100,
            "expected_max_time": 200  # ms
        }
    ]
    
    performance_results = []
    
    for scenario in test_scenarios:
        print(f"\n{'='*60}")
        print(f"Testing: {scenario['name']}")
        print(f"{'='*60}")
        
        # Clear input and metrics
        message_input.fill("")
        page.evaluate("window.performanceMetrics = []; window.chatInputPerfLogger.reset();")
        
        # Measure typing performance
        start_time = time.perf_counter()
        
        # Type the text character by character (simulate real typing)
        # For performance testing, we'll type in chunks
        chunk_size = min(100, len(scenario['text']) // 10)
        for i in range(0, len(scenario['text']), chunk_size):
            chunk = scenario['text'][i:i+chunk_size]
            message_input.press_sequentially(chunk, delay=0)  # No delay for performance testing
            
            # Get intermediate metrics every 1000 chars
            if i > 0 and i % 1000 == 0:
                metrics = page.evaluate("window.performanceMetrics")
                print(f"  After {i} chars - {len(metrics)} events captured")
                
        typing_time = (time.perf_counter() - start_time) * 1000  # Convert to ms
        
        # Wait for all handlers to complete
        page.wait_for_timeout(500)
        
        # Collect performance metrics
        metrics = page.evaluate("""() => {
            const metrics = window.performanceMetrics;
            const handlers = window.eventHandlers;
            
            // Group metrics by event type
            const grouped = {};
            metrics.forEach(m => {
                if (m.event) {
                    if (!grouped[m.event]) {
                        grouped[m.event] = {
                            count: 0,
                            totalTime: 0,
                            maxTime: 0,
                            avgTime: 0,
                            samples: []
                        };
                    }
                    
                    grouped[m.event].count++;
                    grouped[m.event].totalTime += m.elapsed;
                    grouped[m.event].maxTime = Math.max(grouped[m.event].maxTime, m.elapsed);
                    grouped[m.event].samples.push(m.elapsed);
                }
            });
            
            // Calculate averages
            Object.keys(grouped).forEach(event => {
                grouped[event].avgTime = grouped[event].totalTime / grouped[event].count;
                // Keep only last 10 samples for brevity
                grouped[event].samples = grouped[event].samples.slice(-10);
            });
            
            return {
                totalEvents: metrics.length,
                eventHandlers: Object.keys(handlers).map(k => ({
                    event: k,
                    handlerCount: handlers[k].length
                })),
                groupedMetrics: grouped,
                rawMetrics: metrics.slice(-20)  // Last 20 events
            };
        }""")
        
        # Analyze for bottlenecks
        bottlenecks = []
        if metrics['groupedMetrics']:
            for event_type, stats in metrics['groupedMetrics'].items():
                if stats['maxTime'] > 10:  # Anything over 10ms is concerning
                    bottlenecks.append({
                        'event': event_type,
                        'maxTime': stats['maxTime'],
                        'avgTime': stats['avgTime'],
                        'count': stats['count']
                    })
        
        # Get textarea computed style for analysis
        textarea_style = page.evaluate("""() => {
            const textarea = document.getElementById('message-input');
            const style = window.getComputedStyle(textarea);
            return {
                height: style.height,
                scrollHeight: textarea.scrollHeight,
                clientHeight: textarea.clientHeight,
                overflow: style.overflow,
                resize: style.resize
            };
        }""")
        
        result = {
            'scenario': scenario['name'],
            'textLength': len(scenario['text']),
            'typingTime': typing_time,
            'expectedMaxTime': scenario['expected_max_time'],
            'passed': typing_time < scenario['expected_max_time'] * 2,  # Allow 2x buffer
            'totalEvents': metrics['totalEvents'],
            'eventHandlers': metrics['eventHandlers'],
            'bottlenecks': bottlenecks,
            'textareaStyle': textarea_style
        }
        
        performance_results.append(result)
        
        # Print results
        print(f"\n📊 Performance Results for {scenario['name']}:")
        print(f"  ⏱️  Typing time: {typing_time:.2f}ms (expected max: {scenario['expected_max_time']}ms)")
        print(f"  📈 Total events fired: {metrics['totalEvents']}")
        print(f"  ✅ Passed: {result['passed']}")
        
        if metrics['eventHandlers']:
            print(f"\n  📋 Event Handlers Registered:")
            for handler in metrics['eventHandlers']:
                print(f"    - {handler['event']}: {handler['handlerCount']} handler(s)")
        
        if bottlenecks:
            print(f"\n  ⚠️  Performance Bottlenecks Detected:")
            for bottleneck in bottlenecks:
                print(f"    - {bottleneck['event']}: max={bottleneck['maxTime']:.2f}ms, "
                      f"avg={bottleneck['avgTime']:.2f}ms, count={bottleneck['count']}")
        
        print(f"\n  📐 Textarea Style:")
        print(f"    - Height: {textarea_style['height']}")
        print(f"    - ScrollHeight: {textarea_style['scrollHeight']}px")
        print(f"    - Overflow: {textarea_style['overflow']}")
        
        # Take screenshot
        screenshot_with_markdown(page, f"performance_{len(scenario['text'])}_chars", {
            "Scenario": scenario['name'],
            "Text Length": str(len(scenario['text'])),
            "Typing Time": f"{typing_time:.2f}ms",
            "Events Fired": str(metrics['totalEvents']),
            "Bottlenecks": str(len(bottlenecks)),
            "Status": "PASS" if result['passed'] else "FAIL"
        })
    
    # Final analysis
    print(f"\n{'='*60}")
    print("FINAL PERFORMANCE ANALYSIS")
    print(f"{'='*60}\n")
    
    # Check for progressive degradation
    degradation_found = False
    for i in range(1, len(performance_results)):
        prev = performance_results[i-1]
        curr = performance_results[i]
        
        # Calculate performance degradation ratio
        size_increase = curr['textLength'] / prev['textLength']
        time_increase = curr['typingTime'] / prev['typingTime'] if prev['typingTime'] > 0 else 1
        
        if time_increase > size_increase * 1.5:  # Non-linear degradation
            degradation_found = True
            print(f"⚠️  Non-linear degradation detected between {prev['scenario']} and {curr['scenario']}")
            print(f"   Size increased {size_increase:.1f}x but time increased {time_increase:.1f}x")
    
    # Identify the main bottleneck
    all_bottlenecks = {}
    for result in performance_results:
        for bottleneck in result['bottlenecks']:
            event = bottleneck['event']
            if event not in all_bottlenecks:
                all_bottlenecks[event] = []
            all_bottlenecks[event].append(bottleneck)
    
    if all_bottlenecks:
        print(f"\n🔍 Main Performance Bottlenecks:")
        for event, occurrences in all_bottlenecks.items():
            max_time = max(o['maxTime'] for o in occurrences)
            avg_time = sum(o['avgTime'] for o in occurrences) / len(occurrences)
            print(f"  - {event}: max={max_time:.2f}ms, avg={avg_time:.2f}ms across {len(occurrences)} tests")
    
    # Save detailed report
    report = {
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'results': performance_results,
        'degradation_found': degradation_found,
        'main_bottlenecks': all_bottlenecks
    }
    
    with open('chat_input_performance_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📊 Detailed report saved to chat_input_performance_report.json")
    
    # Assert no severe degradation
    assert not degradation_found or len(all_bottlenecks) == 0, \
        f"Performance issues detected: {'Non-linear degradation' if degradation_found else ''} " \
        f"{f'with {len(all_bottlenecks)} bottleneck event types' if all_bottlenecks else ''}"


def test_identify_specific_bottleneck_handlers(page: Page, serve_hacka_re):
    """
    Detailed test to identify which specific event handlers are causing bottlenecks
    """
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Inject detailed profiling code
    page.evaluate("""
        // Hook into all event handlers on message-input
        const messageInput = document.getElementById('message-input');
        
        // Store original handlers
        window.originalHandlers = {};
        window.handlerProfiles = [];
        
        // Get all event listeners (using browser internals if available)
        const events = ['input', 'keyup', 'keydown', 'change', 'focus', 'blur', 'paste'];
        
        events.forEach(eventType => {
            // Create a proxy for each event type
            const originalHandlers = [];
            
            // Override addEventListener for profiling
            const originalAdd = messageInput.addEventListener;
            
            messageInput.addEventListener = function(type, handler, options) {
                if (type === eventType) {
                    // Wrap the handler with profiling
                    const profiledHandler = function(event) {
                        const start = performance.now();
                        const stackTrace = new Error().stack;
                        
                        // Call original handler
                        const result = handler.call(this, event);
                        
                        const elapsed = performance.now() - start;
                        
                        // Record profile data
                        window.handlerProfiles.push({
                            eventType: type,
                            elapsed: elapsed,
                            timestamp: Date.now(),
                            textLength: this.value.length,
                            handler: handler.toString().substring(0, 100),
                            stack: stackTrace.split('\\n')[2] || 'unknown'  // Get caller info
                        });
                        
                        return result;
                    };
                    
                    originalAdd.call(this, type, profiledHandler, options);
                } else {
                    originalAdd.call(this, type, handler, options);
                }
            };
        });
        
        // Also profile specific known bottleneck functions
        window.profileFunction = function(obj, methodName, description) {
            const original = obj[methodName];
            obj[methodName] = function(...args) {
                const start = performance.now();
                const result = original.apply(this, args);
                const elapsed = performance.now() - start;
                
                if (elapsed > 1) {
                    window.handlerProfiles.push({
                        type: 'function',
                        name: description || methodName,
                        elapsed: elapsed,
                        timestamp: Date.now()
                    });
                }
                
                return result;
            };
        };
        
        // Profile known potentially slow operations
        if (window.updateContextUsage) {
            window.profileFunction(window, 'updateContextUsage', 'Context Usage Update');
        }
        
        console.log('Performance profiling initialized');
    """)
    
    # Type a large amount of text to trigger performance issues
    message_input = page.locator("#message-input")
    message_input.click()
    
    print("\n🔍 Profiling Event Handlers...")
    
    # Type progressively to see when issues start
    test_text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " * 200  # ~11000 chars
    
    # Type in chunks and collect profiles
    chunk_size = 500
    for i in range(0, len(test_text), chunk_size):
        chunk = test_text[i:i+chunk_size]
        message_input.press_sequentially(chunk, delay=0)
        
        # Collect profiles every 2000 chars
        if i > 0 and i % 2000 == 0:
            profiles = page.evaluate("window.handlerProfiles")
            print(f"\nAfter {i} characters:")
            
            # Analyze slowest handlers
            if profiles:
                slowest = sorted([p for p in profiles if p['elapsed'] > 5], 
                               key=lambda x: x['elapsed'], reverse=True)[:5]
                
                for profile in slowest:
                    if 'eventType' in profile:
                        print(f"  ⚠️  {profile['eventType']} handler: {profile['elapsed']:.2f}ms")
                        print(f"      Handler preview: {profile['handler'][:50]}...")
                    else:
                        print(f"  ⚠️  {profile['name']}: {profile['elapsed']:.2f}ms")
    
    # Get final analysis
    final_profiles = page.evaluate("""() => {
        const profiles = window.handlerProfiles;
        
        // Group by event type
        const grouped = {};
        profiles.forEach(p => {
            const key = p.eventType || p.name || 'unknown';
            if (!grouped[key]) {
                grouped[key] = {
                    count: 0,
                    total: 0,
                    max: 0,
                    samples: []
                };
            }
            
            grouped[key].count++;
            grouped[key].total += p.elapsed;
            grouped[key].max = Math.max(grouped[key].max, p.elapsed);
            grouped[key].samples.push(p.elapsed);
        });
        
        // Calculate statistics
        Object.keys(grouped).forEach(key => {
            const g = grouped[key];
            g.avg = g.total / g.count;
            g.median = g.samples.sort((a, b) => a - b)[Math.floor(g.samples.length / 2)];
        });
        
        return grouped;
    }""")
    
    print(f"\n{'='*60}")
    print("BOTTLENECK HANDLER ANALYSIS")
    print(f"{'='*60}\n")
    
    bottleneck_handlers = []
    for handler_type, stats in final_profiles.items():
        if stats['max'] > 10:  # Over 10ms is problematic
            bottleneck_handlers.append({
                'type': handler_type,
                'max': stats['max'],
                'avg': stats['avg'],
                'median': stats['median'],
                'count': stats['count']
            })
            
            print(f"🔴 {handler_type}:")
            print(f"   Max: {stats['max']:.2f}ms")
            print(f"   Avg: {stats['avg']:.2f}ms")
            print(f"   Median: {stats['median']:.2f}ms")
            print(f"   Fired: {stats['count']} times")
    
    # Get specific recommendations
    print(f"\n💡 RECOMMENDATIONS:")
    
    if any('input' in h['type'] for h in bottleneck_handlers):
        print("  1. Input handler is slow - consider:")
        print("     - Increase debounce delay beyond current 300ms")
        print("     - Throttle expensive operations")
        print("     - Use requestAnimationFrame for UI updates")
    
    if any('context' in h['type'].lower() for h in bottleneck_handlers):
        print("  2. Context usage calculation is slow - consider:")
        print("     - Cache token counts")
        print("     - Calculate asynchronously")
        print("     - Update less frequently")
    
    # Save detailed handler report
    with open('handler_bottleneck_report.json', 'w') as f:
        json.dump({
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'bottlenecks': bottleneck_handlers,
            'raw_profiles': final_profiles
        }, f, indent=2)
    
    print(f"\n📊 Handler analysis saved to handler_bottleneck_report.json")
    
    # Take final screenshot
    screenshot_with_markdown(page, "handler_bottleneck_analysis", {
        "Total Text": f"{len(test_text)} chars",
        "Bottleneck Handlers": str(len(bottleneck_handlers)),
        "Worst Handler": bottleneck_handlers[0]['type'] if bottleneck_handlers else 'None',
        "Max Delay": f"{bottleneck_handlers[0]['max']:.2f}ms" if bottleneck_handlers else 'N/A'
    })
    
    assert len(bottleneck_handlers) == 0 or all(h['max'] < 50 for h in bottleneck_handlers), \
        f"Severe performance bottlenecks found in handlers: {[h['type'] for h in bottleneck_handlers if h['max'] > 50]}"