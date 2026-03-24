/**
 * Math Utilities Default Functions
 * Provides mathematical utility functions as default functions
 */

window.MathUtilitiesFunctions = {
    id: 'math-utilities',
    name: 'Math Utilities',
    description: 'Common mathematical operations and utilities',
    groupId: 'math-utilities-group',
    functions: [
        {
            name: 'calculate_factorial',
            code: `/**
 * Calculate the factorial of a number
 * @description Calculates the factorial of a non-negative integer (n!)
 * @param {number} n - The number to calculate factorial for
 * @returns {Object} Object containing the factorial result or error
 * @callable
 */
function calculate_factorial(n) {
    try {
        // Validate input
        if (typeof n !== 'number') {
            return { error: "Input must be a number", success: false };
        }
        
        if (n < 0) {
            return { error: "Factorial is not defined for negative numbers", success: false };
        }
        
        if (!Number.isInteger(n)) {
            return { error: "Factorial is only defined for integers", success: false };
        }
        
        if (n > 170) {
            return { error: "Number too large, result would exceed JavaScript's number limits", success: false };
        }
        
        // Calculate factorial
        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        
        return {
            success: true,
            result: result,
            input: n,
            formula: n <= 5 ? \`\${n}! = \${Array.from({length: n}, (_, i) => i + 1).join(' × ')}\` : \`\${n}!\`
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Calculation failed"
        };
    }
}`
        },
        {
            name: 'calculate_fibonacci',
            code: `/**
 * Calculate Fibonacci sequence
 * @description Generates the Fibonacci sequence up to the nth number
 * @param {number} n - The number of Fibonacci numbers to generate
 * @returns {Object} Object containing the Fibonacci sequence or error
 * @callable
 */
function calculate_fibonacci(n) {
    try {
        // Validate input
        if (typeof n !== 'number') {
            return { error: "Input must be a number", success: false };
        }
        
        if (n < 1) {
            return { error: "Please provide a positive number", success: false };
        }
        
        if (!Number.isInteger(n)) {
            return { error: "Please provide an integer", success: false };
        }
        
        if (n > 100) {
            return { error: "Number too large, please use a value <= 100", success: false };
        }
        
        // Generate Fibonacci sequence
        const sequence = [0, 1];
        
        if (n === 1) {
            return {
                success: true,
                sequence: [0],
                count: 1,
                last: 0
            };
        }
        
        for (let i = 2; i < n; i++) {
            sequence.push(sequence[i - 1] + sequence[i - 2]);
        }
        
        const result = sequence.slice(0, n);
        
        return {
            success: true,
            sequence: result,
            count: n,
            last: result[result.length - 1],
            sum: result.reduce((a, b) => a + b, 0)
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Calculation failed"
        };
    }
}`
        },
        {
            name: 'check_prime',
            code: `/**
 * Check if a number is prime
 * @description Determines whether a given number is a prime number
 * @param {number} n - The number to check for primality
 * @returns {Object} Object containing the primality result and factors if not prime
 * @callable
 */
function check_prime(n) {
    try {
        // Validate input
        if (typeof n !== 'number') {
            return { error: "Input must be a number", success: false };
        }
        
        if (!Number.isInteger(n)) {
            return { error: "Please provide an integer", success: false };
        }
        
        if (n < 2) {
            return {
                success: true,
                isPrime: false,
                number: n,
                reason: "Numbers less than 2 are not prime by definition"
            };
        }
        
        // Check for primality
        const factors = [];
        const sqrtN = Math.sqrt(n);
        
        for (let i = 2; i <= sqrtN; i++) {
            if (n % i === 0) {
                factors.push(i);
                if (i !== n / i) {
                    factors.push(n / i);
                }
            }
        }
        
        const isPrime = factors.length === 0;
        
        return {
            success: true,
            isPrime: isPrime,
            number: n,
            factors: isPrime ? [] : factors.sort((a, b) => a - b),
            message: isPrime ? \`\${n} is a prime number\` : \`\${n} is not prime (divisible by \${factors.sort((a, b) => a - b).join(', ')})\`
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Check failed"
        };
    }
}`
        }
    ]
};