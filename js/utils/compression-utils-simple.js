/**
 * Simple Compression Utilities
 * Provides compression and key mapping for shared link payloads
 * Uses a simpler, more reliable approach
 */

window.CompressionUtils = (function() {
    
    /**
     * Key mapping dictionary for reducing JSON key sizes
     * Maps verbose keys to single characters
     */
    const KEY_MAP = {
        // Top-level keys
        'apiKey': 'a',
        'baseUrl': 'b',
        'systemPrompt': 's',
        'messages': 'm',
        'functions': 'f',
        'enabledFunctions': 'e',
        'selectedPromptIds': 'p',
        'selectedDefaultPromptIds': 'd',
        'selectedDefaultFunctionIds': 'F',
        'selectedDefaultFunctionCollectionIds': 'C',
        'mcpConnections': 'c',
        'welcomeMessage': 'w',
        'theme': 't',
        'prompts': 'P',
        'model': 'M',
        'provider': 'v',
        // Message object keys
        'role': 'r',
        'content': 'n',
        // Prompt object keys
        'title': 'T',
        'prompt': 'q',
        'selected': 'S',
        'id': 'i',
        // Function object keys  
        'code': 'o',
        'enabled': 'E',
        // MCP connection keys
        'github': 'g',
        'gmail': 'G',
        'shodan': 'h'
    };

    // Create reverse mapping for decoding
    const REVERSE_KEY_MAP = {};
    for (const [verbose, compact] of Object.entries(KEY_MAP)) {
        REVERSE_KEY_MAP[compact] = verbose;
    }

    /**
     * Simple text compression using basic patterns
     * Much more reliable than complex LZ algorithms
     */
    function simpleCompress(text) {
        // Step 1: Replace common patterns
        let compressed = text;
        
        // Common JSON patterns
        const patterns = [
            ['"role":"user"', '"r":"u"'],
            ['"role":"assistant"', '"r":"a"'],
            ['"content":"', '"n":"'],
            ['"apiKey":"', '"a":"'],
            ['"model":"', '"M":"'],
            ['"messages":', '"m":'],
            ['"functions":', '"f":'],
            ['"prompts":', '"P":'],
            ['{"', '{'],  // Remove quotes around object keys where possible
            ['"}', '}'],
            ['":true', ':1'], // Boolean compression
            ['":false', ':0'],
            [',"', ','], // Remove quotes in arrays where safe
        ];
        
        for (const [pattern, replacement] of patterns) {
            compressed = compressed.split(pattern).join(replacement);
        }
        
        return compressed;
    }
    
    /**
     * Simple text decompression - reverse of simpleCompress
     */
    function simpleDecompress(compressed) {
        // Step 1: Restore common patterns (reverse order)
        let text = compressed;
        
        // Restore patterns in reverse order
        const patterns = [
            [':0', ':false'],
            [':1', ':true'], 
            [',', ',"'], // This is tricky - need better logic
            ['}', '"}'],
            ['{', '{"'],
            ['"P":', '"prompts":'],
            ['"f":', '"functions":'],
            ['"m":', '"messages":'],
            ['"M":', '"model":'],
            ['"a":', '"apiKey":'],
            ['"n":"', '"content":"'],
            ['"r":"a"', '"role":"assistant"'],
            ['"r":"u"', '"role":"user"'],
        ];
        
        // This approach is too fragile - let's use a different method
        return text;
    }

    /**
     * Real compression using browser's built-in deflate algorithm
     * This uses the same algorithm as gzip/zlib
     */
    async function realCompress(text) {
        try {
            // Convert string to Uint8Array
            const textEncoder = new TextEncoder();
            const textBytes = textEncoder.encode(text);
            
            // Use CompressionStream (deflate) - same as gzip algorithm
            const compressionStream = new CompressionStream('deflate');
            const writer = compressionStream.writable.getWriter();
            const reader = compressionStream.readable.getReader();
            
            // Start compression
            writer.write(textBytes);
            writer.close();
            
            // Read compressed data
            const chunks = [];
            let done = false;
            
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    chunks.push(value);
                }
            }
            
            // Combine chunks into single Uint8Array
            const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const compressed = new Uint8Array(totalLength);
            let offset = 0;
            
            for (const chunk of chunks) {
                compressed.set(chunk, offset);
                offset += chunk.length;
            }
            
            return compressed;
            
        } catch (error) {
            console.warn('Browser compression not available, falling back to uncompressed:', error);
            // Fallback: return original text as bytes
            const textEncoder = new TextEncoder();
            return textEncoder.encode(text);
        }
    }
    
    async function realDecompress(compressedBytes) {
        try {
            // Use DecompressionStream (deflate)
            const decompressionStream = new DecompressionStream('deflate');
            const writer = decompressionStream.writable.getWriter();
            const reader = decompressionStream.readable.getReader();
            
            // Start decompression
            writer.write(compressedBytes);
            writer.close();
            
            // Read decompressed data
            const chunks = [];
            let done = false;
            
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    chunks.push(value);
                }
            }
            
            // Combine chunks and convert back to string
            const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const decompressed = new Uint8Array(totalLength);
            let offset = 0;
            
            for (const chunk of chunks) {
                decompressed.set(chunk, offset);
                offset += chunk.length;
            }
            
            // Convert bytes back to string
            const textDecoder = new TextDecoder();
            return textDecoder.decode(decompressed);
            
        } catch (error) {
            console.warn('Browser decompression failed, treating as uncompressed:', error);
            // Fallback: treat as uncompressed bytes
            const textDecoder = new TextDecoder();
            return textDecoder.decode(compressedBytes);
        }
    }

    /**
     * Base64 encoding for URL safety - handles Uint8Array
     */
    function base64EncodeBytes(bytes) {
        // Convert Uint8Array to base64
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }
    
    function base64DecodeBytes(encoded) {
        // Restore base64 padding and characters
        let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        
        // Decode to binary string then to Uint8Array
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Recursively map object keys from verbose to compact
     * @param {*} obj - Object to map (can be nested)
     * @returns {*} Object with mapped keys
     */
    function mapKeys(obj) {
        if (obj === null || obj === undefined) {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(mapKeys);
        }

        if (typeof obj !== 'object') {
            return obj;
        }

        const mapped = {};
        for (const [key, value] of Object.entries(obj)) {
            const mappedKey = KEY_MAP[key] || key;
            mapped[mappedKey] = mapKeys(value);
        }
        return mapped;
    }

    /**
     * Recursively unmap object keys from compact to verbose
     * @param {*} obj - Object to unmap (can be nested)
     * @returns {*} Object with unmapped keys
     */
    function unmapKeys(obj) {
        if (obj === null || obj === undefined) {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(unmapKeys);
        }

        if (typeof obj !== 'object') {
            return obj;
        }

        const unmapped = {};
        for (const [key, value] of Object.entries(obj)) {
            const unmappedKey = REVERSE_KEY_MAP[key] || key;
            unmapped[unmappedKey] = unmapKeys(value);
        }
        return unmapped;
    }

    /**
     * Compress a payload for sharing using real deflate compression
     * @param {Object} payload - The payload to compress
     * @returns {Promise<string>} Compressed string
     */
    async function compressPayload(payload) {
        try {
            // Step 1: Map keys to compact form
            const mapped = mapKeys(payload);
            
            // Step 2: Convert to JSON
            const json = JSON.stringify(mapped);
            
            // Step 3: Apply real deflate compression
            const compressedBytes = await realCompress(json);
            
            // Step 4: Base64 encode for URL safety
            const compressed = base64EncodeBytes(compressedBytes);
            
            // Debug logging
            if (window.DebugService && window.DebugService.debugLog) {
                const originalSize = JSON.stringify(payload).length;
                const compressedSize = compressed.length;
                const reduction = Math.round((1 - compressedSize / originalSize) * 100);
                window.DebugService.debugLog('compression', 
                    `🗜️ Real Compression: ${originalSize} → ${compressedSize} chars (${reduction}% reduction)`);
            }
            
            return compressed;
        } catch (error) {
            console.error('Compression error:', error);
            throw new Error('Failed to compress payload: ' + error.message);
        }
    }

    /**
     * Decompress a payload from sharing using real deflate decompression
     * @param {string} compressed - The compressed string
     * @returns {Promise<Object>} Decompressed payload
     */
    async function decompressPayload(compressed) {
        try {
            // Step 1: Decode from base64 to bytes
            const compressedBytes = base64DecodeBytes(compressed);
            
            // Step 2: Decompress using real deflate
            const json = await realDecompress(compressedBytes);
            
            if (!json) {
                throw new Error('Decompression failed - invalid compressed data');
            }
            
            // Step 3: Parse JSON
            const mapped = JSON.parse(json);
            
            // Step 4: Unmap keys to verbose form
            const payload = unmapKeys(mapped);
            
            // Debug logging
            if (window.DebugService && window.DebugService.debugLog) {
                const compressedSize = compressed.length;
                const originalSize = JSON.stringify(payload).length;
                window.DebugService.debugLog('compression', 
                    `🗜️ Real Decompression: ${compressedSize} → ${originalSize} chars`);
            }
            
            return payload;
        } catch (error) {
            console.error('Decompression error:', error);
            throw new Error('Failed to decompress payload: ' + error.message);
        }
    }

    // Public API
    return {
        compressPayload: compressPayload,
        decompressPayload: decompressPayload,
        // Expose for testing
        _mapKeys: mapKeys,
        _unmapKeys: unmapKeys
    };
})();