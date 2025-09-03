/**
 * Performance logger utility for tracking elapsed time between performance log messages
 * Shows milliseconds elapsed since the last performance log message
 */
(function(window) {
    'use strict';
    
    class PerformanceLogger {
        constructor(prefix = '') {
            this.prefix = prefix;
            this.lastLogTime = null;
        }
        
        /**
         * Log a performance message with elapsed time since last log
         * @param {string} message - The message to log
         * @param {any} data - Optional additional data to log
         */
        log(message, ...data) {
            const now = performance.now();
            let elapsedMs = 0;
            
            if (this.lastLogTime !== null) {
                elapsedMs = now - this.lastLogTime;
            }
            
            this.lastLogTime = now;
            
            // Format elapsed time to 0 decimal places (just milliseconds as integer)
            const elapsed = Math.round(elapsedMs);
            
            // Format: [elapsed_ms] PREFIX: message
            const formattedMessage = `[${elapsed}ms] ${this.prefix}${this.prefix ? ': ' : ''}${message}`;
            
            if (data.length > 0) {
                console.log(formattedMessage, ...data);
            } else {
                console.log(formattedMessage);
            }
        }
        
        /**
         * Reset the timer (next log will show 0ms elapsed)
         */
        reset() {
            this.lastLogTime = null;
        }
        
        /**
         * Create a child logger with an additional prefix
         * @param {string} childPrefix - Additional prefix for the child logger
         * @returns {PerformanceLogger} A new PerformanceLogger instance
         */
        child(childPrefix) {
            const combinedPrefix = this.prefix ? `${this.prefix}:${childPrefix}` : childPrefix;
            return new PerformanceLogger(combinedPrefix);
        }
    }
    
    // Global singleton for MCP performance logging
    const mcpPerfLogger = new PerformanceLogger('MCP');
    
    // Export to window
    window.PerformanceLogger = PerformanceLogger;
    window.mcpPerfLogger = mcpPerfLogger;
    
})(window);