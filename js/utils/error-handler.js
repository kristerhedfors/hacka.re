/**
 * Error Handler Utility
 * Provides enhanced error handling for API requests with detailed error messages
 */

window.ErrorHandler = (function() {
    /**
     * Creates a detailed error message from a fetch error
     * @param {Error} error - The original error object
     * @param {Response} response - The fetch response object (if available)
     * @param {string} endpoint - The API endpoint that was being accessed
     * @param {Object} requestDetails - Additional details about the request
     * @returns {Error} - A new error with a detailed message
     */
    async function createDetailedFetchError(error, response, endpoint, requestDetails = {}) {
        let detailedMessage = "API REQUEST FAILED\n\n";
        
        // Add HTTP status information if available
        if (response) {
            const statusCode = response.status;
            const statusText = response.statusText;
            
            detailedMessage += `HTTP Status: ${statusCode} ${statusText}\n`;
            
            // Add status code explanation
            const statusExplanation = getStatusCodeExplanation(statusCode);
            if (statusExplanation) {
                detailedMessage += `Explanation: ${statusExplanation}\n`;
            }
            
            // Try to parse the response body for more details
            try {
                const errorData = await response.clone().json();
                
                // Format the error data in a more readable way
                if (errorData.error) {
                    detailedMessage += "\nAPI Error Details:\n";
                    
                    if (errorData.error.message) {
                        detailedMessage += `- Message: ${errorData.error.message}\n`;
                    } else if (typeof errorData.error === 'string') {
                        detailedMessage += `- Message: ${errorData.error}\n`;
                    }
                    
                    // Add additional error details if available
                    if (errorData.error.type) {
                        detailedMessage += `- Type: ${errorData.error.type}\n`;
                    }
                    if (errorData.error.code) {
                        detailedMessage += `- Error Code: ${errorData.error.code}\n`;
                    }
                    if (errorData.error.param) {
                        detailedMessage += `- Parameter: ${errorData.error.param}\n`;
                    }
                    
                    // Check for rate limiting information
                    if (statusCode === 429) {
                        if (errorData.error.limit) {
                            detailedMessage += `- Rate Limit: ${errorData.error.limit}\n`;
                        }
                        if (errorData.error.reset_at || errorData.error.reset) {
                            detailedMessage += `- Rate Limit Reset: ${errorData.error.reset_at || errorData.error.reset}\n`;
                        }
                    }
                } else if (Object.keys(errorData).length > 0) {
                    // If there's no error object but there is other data, display it
                    detailedMessage += "\nAPI Response:\n";
                    detailedMessage += JSON.stringify(errorData, null, 2).split('\n').map(line => `  ${line}`).join('\n') + '\n';
                }
            } catch (e) {
                // If we can't parse the response as JSON, try to get the text
                try {
                    const errorText = await response.clone().text();
                    if (errorText && errorText.trim()) {
                        detailedMessage += "\nResponse Body:\n";
                        // Format the response text for better readability
                        if (errorText.length > 500) {
                            detailedMessage += `${errorText.substring(0, 500)}...\n(Response truncated, ${errorText.length} characters total)\n`;
                        } else {
                            detailedMessage += `${errorText}\n`;
                        }
                    }
                } catch (textError) {
                    // If we can't get the text either, just use the original error message
                    detailedMessage += `\nError: ${error.message}\n`;
                }
            }
        } else {
            // No response object, use the original error
            detailedMessage += `Error Type: ${error.name}\n`;
            detailedMessage += `Error Message: ${error.message}\n`;
            
            // Add more details for specific error types
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                detailedMessage += "\nThis is typically a network-related error that can occur when:\n";
                detailedMessage += "- The server is unreachable\n";
                detailedMessage += "- There's a DNS resolution problem\n";
                detailedMessage += "- A firewall or security software is blocking the request\n";
                detailedMessage += "- The server doesn't support CORS (Cross-Origin Resource Sharing)\n";
            } else if (error.name === 'AbortError') {
                detailedMessage += "\nThe request was aborted, which could be due to:\n";
                detailedMessage += "- A timeout was reached\n";
                detailedMessage += "- The request was manually cancelled\n";
                detailedMessage += "- The page was unloaded during the request\n";
            }
        }
        
        // Add request details
        detailedMessage += "\nRequest Details:\n";
        
        // Add endpoint information
        if (endpoint) {
            detailedMessage += `- Endpoint: ${endpoint}\n`;
        }
        
        // Add request details if provided
        if (requestDetails.method) {
            detailedMessage += `- Method: ${requestDetails.method}\n`;
        }
        
        if (requestDetails.url) {
            detailedMessage += `- URL: ${requestDetails.url}\n`;
        }
        
        // Add network information
        if (navigator.onLine === false) {
            detailedMessage += "- Network Status: You appear to be offline\n";
        } else {
            detailedMessage += "- Network Status: Online\n";
        }
        
        // Add browser information
        detailedMessage += `- Browser: ${navigator.userAgent}\n`;
        
        // Add timestamp
        detailedMessage += `- Timestamp: ${new Date().toISOString()}\n`;
        
        
        // Create a new error with the detailed message
        const detailedError = new Error(detailedMessage);
        
        // Copy properties from the original error
        Object.assign(detailedError, error);
        
        // Add additional properties for debugging
        detailedError.originalError = error;
        detailedError.response = response;
        detailedError.endpoint = endpoint;
        detailedError.requestDetails = requestDetails;
        detailedError.statusCode = response ? response.status : null;
        detailedError.statusText = response ? response.statusText : null;
        detailedError.timestamp = new Date().toISOString();
        
        return detailedError;
    }
    
    /**
     * Get a human-readable explanation for common HTTP status codes
     * @param {number} statusCode - The HTTP status code
     * @returns {string|null} - A human-readable explanation or null if not available
     */
    function getStatusCodeExplanation(statusCode) {
        const explanations = {
            400: "Bad Request - The server could not understand the request due to invalid syntax or missing parameters.",
            401: "Unauthorized - Authentication is required and has failed or has not been provided.",
            403: "Forbidden - The server understood the request but refuses to authorize it.",
            404: "Not Found - The requested resource could not be found on the server.",
            405: "Method Not Allowed - The request method is not supported for the requested resource.",
            408: "Request Timeout - The server timed out waiting for the request.",
            409: "Conflict - The request could not be completed due to a conflict with the current state of the resource.",
            410: "Gone - The requested resource is no longer available and will not be available again.",
            413: "Payload Too Large - The request is larger than the server is willing or able to process.",
            414: "URI Too Long - The URI provided was too long for the server to process.",
            415: "Unsupported Media Type - The media format of the requested data is not supported.",
            422: "Unprocessable Entity - The request was well-formed but was unable to be followed due to semantic errors.",
            429: "Too Many Requests - You have sent too many requests in a given amount of time (rate limiting).",
            500: "Internal Server Error - The server encountered an unexpected condition that prevented it from fulfilling the request.",
            501: "Not Implemented - The server does not support the functionality required to fulfill the request.",
            502: "Bad Gateway - The server received an invalid response from an upstream server.",
            503: "Service Unavailable - The server is currently unable to handle the request due to temporary overloading or maintenance.",
            504: "Gateway Timeout - The server did not receive a timely response from an upstream server it needed to access.",
            507: "Insufficient Storage - The server is unable to store the representation needed to complete the request."
        };
        
        return explanations[statusCode] || null;
    }
    
    /**
     * Wraps a fetch call with enhanced error handling
     * @param {string} url - The URL to fetch
     * @param {Object} options - Fetch options
     * @param {string} endpointName - A descriptive name for the endpoint
     * @returns {Promise<Response>} - The fetch response
     */
    async function fetchWithErrorHandling(url, options = {}, endpointName = 'Unknown Endpoint') {
        try {
            // Log the request for debugging
            console.log(`[API Request] ${options.method || 'GET'} ${url} (${endpointName})`);
            
            // Start timing the request
            const startTime = Date.now();
            
            // Make the fetch request
            const response = await fetch(url, options);
            
            // Calculate request duration
            const duration = Date.now() - startTime;
            console.log(`[API Response] ${response.status} ${response.statusText} (${duration}ms)`);
            
            if (!response.ok) {
                // Create a detailed error message
                const error = new Error(`HTTP error ${response.status}`);
                const detailedError = await createDetailedFetchError(
                    error,
                    response,
                    endpointName,
                    { 
                        method: options.method || 'GET',
                        url: url,
                        duration: duration
                    }
                );
                
                // Log the detailed error for debugging
                console.error('Detailed API Error:', detailedError);
                
                throw detailedError;
            }
            
            return response;
        } catch (error) {
            // If it's already a detailed error from our handler, just re-throw it
            if (error.detailedError) {
                throw error;
            }
            
            // Handle network errors (when no response is available)
            const detailedError = await createDetailedFetchError(
                error,
                error.response || null,
                endpointName,
                { 
                    method: options.method || 'GET',
                    url: url
                }
            );
            
            // Log the detailed error for debugging
            console.error('Detailed Network Error:', detailedError);
            
            throw detailedError;
        }
    }
    
    // Public API
    return {
        createDetailedFetchError,
        fetchWithErrorHandling
    };
})();
