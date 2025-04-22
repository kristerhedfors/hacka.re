/**
 * Simple Test Framework for hacka.re
 * 
 * This is a minimal test framework for running unit tests in the browser.
 * It provides basic functionality for defining test suites and test cases,
 * and reporting the results.
 */

const TestFramework = (function() {
    // Store all test suites
    const testSuites = [];
    
    // Test statistics
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    
    /**
     * Define a test suite
     * @param {string} name - Name of the test suite
     * @param {Function} testFn - Function containing the test cases
     */
    function describe(name, testFn) {
        const suite = {
            name: name,
            tests: []
        };
        
        // Current suite for the test function to add tests to
        const currentSuite = suite;
        
        // Function to add a test case to the current suite
        function it(testName, testCaseFn) {
            currentSuite.tests.push({
                name: testName,
                fn: testCaseFn
            });
        }
        
        // Function to add a setup function to the current suite
        function beforeEach(setupFn) {
            currentSuite.beforeEach = setupFn;
        }
        
        // Function to add a teardown function to the current suite
        function afterEach(teardownFn) {
            currentSuite.afterEach = teardownFn;
        }
        
        // Call the test function with the it, beforeEach, and afterEach functions
        testFn(it, beforeEach, afterEach);
        
        // Add the suite to the list of suites
        testSuites.push(suite);
    }
    
    /**
     * Assert that a condition is true
     * @param {boolean} condition - The condition to check
     * @param {string} message - The message to display if the assertion fails
     */
    function assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }
    
    /**
     * Assert that two values are equal
     * @param {*} actual - The actual value
     * @param {*} expected - The expected value
     * @param {string} message - The message to display if the assertion fails
     */
    function assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected} but got ${actual}`);
        }
    }
    
    /**
     * Assert that two values are deeply equal (for objects and arrays)
     * @param {*} actual - The actual value
     * @param {*} expected - The expected value
     * @param {string} message - The message to display if the assertion fails
     */
    function assertDeepEqual(actual, expected, message) {
        // Special case for null
        if (actual === null && expected === null) {
            return;
        }
        
        // Special case for empty objects
        if (typeof actual === 'object' && typeof expected === 'object' &&
            !Array.isArray(actual) && !Array.isArray(expected) &&
            Object.keys(actual).length === 0 && Object.keys(expected).length === 0) {
            return;
        }
        
        // Special case for arrays
        if (Array.isArray(actual) && Array.isArray(expected)) {
            if (actual.length !== expected.length) {
                throw new Error(message || `Arrays have different lengths: ${actual.length} vs ${expected.length}`);
            }
            
            for (let i = 0; i < actual.length; i++) {
                try {
                    assertDeepEqual(actual[i], expected[i], `Array element at index ${i} does not match`);
                } catch (error) {
                    throw new Error(message || `Array element at index ${i} does not match: ${error.message}`);
                }
            }
            
            return;
        }
        
        // For other objects, use JSON.stringify
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        
        if (actualStr !== expectedStr) {
            console.error('Actual:', actual);
            console.error('Expected:', expected);
            console.error('Actual type:', typeof actual);
            console.error('Expected type:', typeof expected);
            if (Array.isArray(actual)) console.error('Actual is array');
            if (Array.isArray(expected)) console.error('Expected is array');
            
            throw new Error(message || `Expected ${expectedStr} but got ${actualStr}`);
        }
    }
    
    /**
     * Run all test suites and display the results
     */
    function runAllTests() {
        const resultsContainer = document.getElementById('test-results');
        const summaryContainer = document.getElementById('summary');
        
        // Reset statistics
        totalTests = 0;
        passedTests = 0;
        failedTests = 0;
        
        // Clear previous results
        resultsContainer.innerHTML = '';
        
        // Run each test suite
        testSuites.forEach(suite => {
            const suiteElement = document.createElement('div');
            suiteElement.className = 'test-suite';
            
            const suiteHeader = document.createElement('div');
            suiteHeader.className = 'test-suite-header';
            suiteHeader.textContent = suite.name;
            suiteElement.appendChild(suiteHeader);
            
            // Run each test in the suite
            suite.tests.forEach(test => {
                totalTests++;
                
                const testElement = document.createElement('div');
                testElement.className = 'test-case';
                
                try {
                    // Run setup if defined
                    if (suite.beforeEach) {
                        suite.beforeEach();
                    }
                    
                    // Run the test
                    test.fn(assert, assertEqual, assertDeepEqual);
                    
                    // Run teardown if defined
                    if (suite.afterEach) {
                        suite.afterEach();
                    }
                    
                    // Test passed
                    passedTests++;
                    testElement.innerHTML = `<span class="pass">✓</span> ${test.name}`;
                } catch (error) {
                    // Test failed
                    failedTests++;
                    testElement.innerHTML = `<span class="fail">✗</span> ${test.name}: ${error.message}`;
                }
                
                suiteElement.appendChild(testElement);
            });
            
            resultsContainer.appendChild(suiteElement);
        });
        
        // Display summary
        summaryContainer.innerHTML = `
            <strong>Summary:</strong> ${totalTests} tests, 
            <span class="pass">${passedTests} passed</span>, 
            <span class="fail">${failedTests} failed</span>
        `;
    }
    
    // Public API
    return {
        describe: describe,
        runAllTests: runAllTests,
        assert: assert,
        assertEqual: assertEqual,
        assertDeepEqual: assertDeepEqual
    };
})();

// Global test functions for convenience
const describe = TestFramework.describe;
const assert = TestFramework.assert;
const assertEqual = TestFramework.assertEqual;
const assertDeepEqual = TestFramework.assertDeepEqual;
