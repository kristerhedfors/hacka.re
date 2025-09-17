/**
 * Convert text to uppercase
 * @description Converts input text to uppercase letters
 * @param {string} text - The text to convert
 * @returns {Object} Object containing the converted text
 * @callable
 */
function toUpperCase(text) {
    if (typeof text !== 'string') {
        return {
            success: false,
            error: "Input must be a string"
        };
    }

    return {
        success: true,
        original: text,
        uppercase: text.toUpperCase(),
        length: text.length
    };
}