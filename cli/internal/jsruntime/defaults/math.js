/**
 * Calculate the factorial of a number
 * @description Calculates n! (n factorial)
 * @param {number} n - The number to calculate factorial for
 * @returns {Object} Object containing the result or error
 * @callable
 */
function factorial(n) {
    try {
        if (typeof n !== 'number') {
            return { error: "Input must be a number", success: false };
        }

        if (n < 0) {
            return { error: "Cannot calculate factorial of negative number", success: false };
        }

        if (n > 170) {
            return { error: "Number too large (maximum is 170)", success: false };
        }

        if (n !== Math.floor(n)) {
            return { error: "Input must be an integer", success: false };
        }

        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }

        return {
            success: true,
            result: result,
            input: n
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Calculation failed"
        };
    }
}

/**
 * Check if a number is prime
 * @description Determines whether a number is prime
 * @param {number} n - The number to check
 * @returns {Object} Object containing the result or error
 * @callable
 */
function isPrime(n) {
    try {
        if (typeof n !== 'number') {
            return { error: "Input must be a number", success: false };
        }

        if (n !== Math.floor(n)) {
            return { error: "Input must be an integer", success: false };
        }

        if (n <= 1) {
            return {
                success: true,
                isPrime: false,
                number: n,
                reason: "Numbers less than or equal to 1 are not prime"
            };
        }

        if (n === 2) {
            return {
                success: true,
                isPrime: true,
                number: n
            };
        }

        if (n % 2 === 0) {
            return {
                success: true,
                isPrime: false,
                number: n,
                reason: "Even numbers (except 2) are not prime"
            };
        }

        const sqrt = Math.sqrt(n);
        for (let i = 3; i <= sqrt; i += 2) {
            if (n % i === 0) {
                return {
                    success: true,
                    isPrime: false,
                    number: n,
                    divisor: i
                };
            }
        }

        return {
            success: true,
            isPrime: true,
            number: n
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Check failed"
        };
    }
}

/**
 * Calculate the greatest common divisor
 * @description Calculates the GCD of two numbers using Euclidean algorithm
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {Object} Object containing the GCD or error
 * @callable
 */
function gcd(a, b) {
    try {
        if (typeof a !== 'number' || typeof b !== 'number') {
            return { error: "Both inputs must be numbers", success: false };
        }

        if (a !== Math.floor(a) || b !== Math.floor(b)) {
            return { error: "Both inputs must be integers", success: false };
        }

        a = Math.abs(a);
        b = Math.abs(b);

        while (b !== 0) {
            const temp = b;
            b = a % b;
            a = temp;
        }

        return {
            success: true,
            gcd: a,
            inputs: [Math.abs(arguments[0]), Math.abs(arguments[1])]
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Calculation failed"
        };
    }
}

/**
 * Calculate Fibonacci number
 * @description Calculates the nth Fibonacci number
 * @param {number} n - The position in the Fibonacci sequence
 * @returns {Object} Object containing the Fibonacci number or error
 * @callable
 */
function fibonacci(n) {
    try {
        if (typeof n !== 'number') {
            return { error: "Input must be a number", success: false };
        }

        if (n !== Math.floor(n)) {
            return { error: "Input must be an integer", success: false };
        }

        if (n < 0) {
            return { error: "Input must be non-negative", success: false };
        }

        if (n > 1476) {
            return { error: "Number too large (maximum is 1476)", success: false };
        }

        if (n <= 1) {
            return {
                success: true,
                result: n,
                position: n
            };
        }

        let a = 0, b = 1;
        for (let i = 2; i <= n; i++) {
            const temp = a + b;
            a = b;
            b = temp;
        }

        return {
            success: true,
            result: b,
            position: n
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Calculation failed"
        };
    }
}