/**
 * Compression Utilities
 * Provides compression and key mapping for shared link payloads
 * Uses LZ-String algorithm for compression
 */

window.CompressionUtils = (function() {
    // LZ-String implementation (embedded to avoid external dependencies)
    // Based on LZ-String 1.4.4 by pieroxy - http://pieroxy.net/blog/pages/lz-string/index.html
    const LZString = (function() {
        // Private array of string to encode URI
        const keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
        const baseReverseDic = {};

        function getBaseValue(alphabet, character) {
            if (!baseReverseDic[alphabet]) {
                baseReverseDic[alphabet] = {};
                for (let i = 0; i < alphabet.length; i++) {
                    baseReverseDic[alphabet][alphabet.charAt(i)] = i;
                }
            }
            return baseReverseDic[alphabet][character];
        }

        const f = String.fromCharCode;

        function compress(uncompressed) {
            if (uncompressed == null) return "";
            let i, value,
                context_dictionary = {},
                context_dictionaryToCreate = {},
                context_c = "",
                context_wc = "",
                context_w = "",
                context_enlargeIn = 2,
                context_dictSize = 3,
                context_numBits = 2,
                context_data = [],
                context_data_val = 0,
                context_data_position = 0,
                ii;

            for (ii = 0; ii < uncompressed.length; ii += 1) {
                context_c = uncompressed.charAt(ii);
                if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
                    context_dictionary[context_c] = context_dictSize++;
                    context_dictionaryToCreate[context_c] = true;
                }

                context_wc = context_w + context_c;
                if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
                    context_w = context_wc;
                } else {
                    if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                        if (context_w.charCodeAt(0) < 256) {
                            for (i = 0; i < context_numBits; i++) {
                                context_data_val = (context_data_val << 1);
                                if (context_data_position == 15) {
                                    context_data_position = 0;
                                    context_data.push(f(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                            }
                            value = context_w.charCodeAt(0);
                            for (i = 0; i < 8; i++) {
                                context_data_val = (context_data_val << 1) | (value & 1);
                                if (context_data_position == 15) {
                                    context_data_position = 0;
                                    context_data.push(f(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = value >> 1;
                            }
                        } else {
                            value = 1;
                            for (i = 0; i < context_numBits; i++) {
                                context_data_val = (context_data_val << 1) | value;
                                if (context_data_position == 15) {
                                    context_data_position = 0;
                                    context_data.push(f(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = 0;
                            }
                            value = context_w.charCodeAt(0);
                            for (i = 0; i < 16; i++) {
                                context_data_val = (context_data_val << 1) | (value & 1);
                                if (context_data_position == 15) {
                                    context_data_position = 0;
                                    context_data.push(f(context_data_val));
                                    context_data_val = 0;
                                } else {
                                    context_data_position++;
                                }
                                value = value >> 1;
                            }
                        }
                        context_enlargeIn--;
                        if (context_enlargeIn == 0) {
                            context_enlargeIn = Math.pow(2, context_numBits);
                            context_numBits++;
                        }
                        delete context_dictionaryToCreate[context_w];
                    } else {
                        value = context_dictionary[context_w];
                        for (i = 0; i < context_numBits; i++) {
                            context_data_val = (context_data_val << 1) | (value & 1);
                            if (context_data_position == 15) {
                                context_data_position = 0;
                                context_data.push(f(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = value >> 1;
                        }
                    }
                    context_enlargeIn--;
                    if (context_enlargeIn == 0) {
                        context_enlargeIn = Math.pow(2, context_numBits);
                        context_numBits++;
                    }
                    context_dictionary[context_wc] = context_dictSize++;
                    context_w = String(context_c);
                }
            }

            if (context_w !== "") {
                if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                    if (context_w.charCodeAt(0) < 256) {
                        for (i = 0; i < context_numBits; i++) {
                            context_data_val = (context_data_val << 1);
                            if (context_data_position == 15) {
                                context_data_position = 0;
                                context_data.push(f(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                        }
                        value = context_w.charCodeAt(0);
                        for (i = 0; i < 8; i++) {
                            context_data_val = (context_data_val << 1) | (value & 1);
                            if (context_data_position == 15) {
                                context_data_position = 0;
                                context_data.push(f(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = value >> 1;
                        }
                    } else {
                        value = 1;
                        for (i = 0; i < context_numBits; i++) {
                            context_data_val = (context_data_val << 1) | value;
                            if (context_data_position == 15) {
                                context_data_position = 0;
                                context_data.push(f(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = 0;
                        }
                        value = context_w.charCodeAt(0);
                        for (i = 0; i < 16; i++) {
                            context_data_val = (context_data_val << 1) | (value & 1);
                            if (context_data_position == 15) {
                                context_data_position = 0;
                                context_data.push(f(context_data_val));
                                context_data_val = 0;
                            } else {
                                context_data_position++;
                            }
                            value = value >> 1;
                        }
                    }
                    context_enlargeIn--;
                    if (context_enlargeIn == 0) {
                        context_enlargeIn = Math.pow(2, context_numBits);
                        context_numBits++;
                    }
                    delete context_dictionaryToCreate[context_w];
                } else {
                    value = context_dictionary[context_w];
                    for (i = 0; i < context_numBits; i++) {
                        context_data_val = (context_data_val << 1) | (value & 1);
                        if (context_data_position == 15) {
                            context_data_position = 0;
                            context_data.push(f(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position++;
                        }
                        value = value >> 1;
                    }
                }
                context_enlargeIn--;
                if (context_enlargeIn == 0) {
                    context_enlargeIn = Math.pow(2, context_numBits);
                    context_numBits++;
                }
            }

            value = 2;
            for (i = 0; i < context_numBits; i++) {
                context_data_val = (context_data_val << 1) | (value & 1);
                if (context_data_position == 15) {
                    context_data_position = 0;
                    context_data.push(f(context_data_val));
                    context_data_val = 0;
                } else {
                    context_data_position++;
                }
                value = value >> 1;
            }

            while (true) {
                context_data_val = (context_data_val << 1);
                if (context_data_position == 15) {
                    context_data.push(f(context_data_val));
                    break;
                } else context_data_position++;
            }
            return context_data.join('');
        }

        function decompress(compressed) {
            if (compressed == null) return "";
            if (compressed == "") return null;
            let dictionary = [],
                next,
                enlargeIn = 4,
                dictSize = 4,
                numBits = 3,
                entry = "",
                result = [],
                i,
                w,
                bits, resb, maxpower, power,
                c,
                data = { val: compressed.charCodeAt(0), position: 32768, index: 1 };

            for (i = 0; i < 3; i += 1) {
                dictionary[i] = i;
            }

            bits = 0;
            maxpower = Math.pow(2, 2);
            power = 1;
            while (power != maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                    data.position = 32768;
                    data.val = data.index < compressed.length ? compressed.charCodeAt(data.index++) : 0;
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
            }

            switch (next = bits) {
                case 0:
                    bits = 0;
                    maxpower = Math.pow(2, 8);
                    power = 1;
                    while (power != maxpower) {
                        resb = data.val & data.position;
                        data.position >>= 1;
                        if (data.position == 0) {
                            data.position = 32768;
                            data.val = data.index < compressed.length ? compressed.charCodeAt(data.index++) : 0;
                        }
                        bits |= (resb > 0 ? 1 : 0) * power;
                        power <<= 1;
                    }
                    c = f(bits);
                    break;
                case 1:
                    bits = 0;
                    maxpower = Math.pow(2, 16);
                    power = 1;
                    while (power != maxpower) {
                        resb = data.val & data.position;
                        data.position >>= 1;
                        if (data.position == 0) {
                            data.position = 32768;
                            data.val = data.index < compressed.length ? compressed.charCodeAt(data.index++) : 0;
                        }
                        bits |= (resb > 0 ? 1 : 0) * power;
                        power <<= 1;
                    }
                    c = f(bits);
                    break;
                case 2:
                    return "";
            }
            dictionary[3] = c;
            w = c;
            result.push(c);
            while (true) {
                if (data.index > compressed.length) {
                    return "";
                }

                bits = 0;
                maxpower = Math.pow(2, numBits);
                power = 1;
                while (power != maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position == 0) {
                        data.position = 32768;
                        data.val = data.index < compressed.length ? compressed.charCodeAt(data.index++) : 0;
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }

                switch (c = bits) {
                    case 0:
                        bits = 0;
                        maxpower = Math.pow(2, 8);
                        power = 1;
                        while (power != maxpower) {
                            resb = data.val & data.position;
                            data.position >>= 1;
                            if (data.position == 0) {
                                data.position = 32768;
                                data.val = data.index < compressed.length ? compressed.charCodeAt(data.index++) : 0;
                            }
                            bits |= (resb > 0 ? 1 : 0) * power;
                            power <<= 1;
                        }

                        dictionary[dictSize++] = f(bits);
                        c = dictSize - 1;
                        enlargeIn--;
                        break;
                    case 1:
                        bits = 0;
                        maxpower = Math.pow(2, 16);
                        power = 1;
                        while (power != maxpower) {
                            resb = data.val & data.position;
                            data.position >>= 1;
                            if (data.position == 0) {
                                data.position = 32768;
                                data.val = data.index < compressed.length ? compressed.charCodeAt(data.index++) : 0;
                            }
                            bits |= (resb > 0 ? 1 : 0) * power;
                            power <<= 1;
                        }
                        dictionary[dictSize++] = f(bits);
                        c = dictSize - 1;
                        enlargeIn--;
                        break;
                    case 2:
                        return result.join('');
                }

                if (enlargeIn == 0) {
                    enlargeIn = Math.pow(2, numBits);
                    numBits++;
                }

                if (dictionary[c]) {
                    entry = dictionary[c];
                } else {
                    if (c === dictSize) {
                        entry = w + w.charAt(0);
                    } else {
                        return null;
                    }
                }
                result.push(entry);

                dictionary[dictSize++] = w + entry.charAt(0);
                enlargeIn--;

                w = entry;

                if (enlargeIn == 0) {
                    enlargeIn = Math.pow(2, numBits);
                    numBits++;
                }
            }
        }

        function compressToUriSafe(input) {
            if (input == null) return "";
            const res = compress(input);
            return _compressToBase64(res, keyStrUriSafe);
        }

        function decompressFromUriSafe(input) {
            if (input == null) return "";
            if (input == "") return null;
            input = input.replace(/ /g, "+");
            const res = _decompressFromBase64(input, keyStrUriSafe);
            return decompress(res);
        }

        function _compressToBase64(input, keyStr) {
            if (input == null) return "";
            let res = "";
            let i = 0;
            let chr1, chr2, chr3, enc1, enc2, enc3, enc4;
            let charCode;

            while (i < input.length * 2) {
                if (i % 2 == 0) {
                    charCode = input.charCodeAt(i / 2) >> 8;
                } else {
                    charCode = input.charCodeAt((i - 1) / 2) & 255;
                }
                i++;

                if (i % 3 == 0 || input.length * 2 == i) {
                    chr1 = i - 3 < 0 ? 0 : (i % 2 == 1 ? 
                        input.charCodeAt(Math.floor((i - 3) / 2)) >> 8 : 
                        input.charCodeAt(Math.floor((i - 3) / 2)) & 255);
                    chr2 = i - 2 < 0 ? 0 : (i % 2 == 0 ? 
                        input.charCodeAt(Math.floor((i - 2) / 2)) >> 8 : 
                        input.charCodeAt(Math.floor((i - 2) / 2)) & 255);
                    chr3 = charCode;

                    enc1 = chr1 >> 2;
                    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                    enc4 = chr3 & 63;

                    if (i - 2 >= input.length * 2) {
                        enc3 = enc4 = 64;
                    } else if (i - 1 >= input.length * 2) {
                        enc4 = 64;
                    }

                    res = res + keyStr.charAt(enc1) + keyStr.charAt(enc2) + 
                          keyStr.charAt(enc3) + keyStr.charAt(enc4);
                }
            }

            return res;
        }

        function _decompressFromBase64(input, keyStr) {
            let output = "";
            let ol = 0;
            let output_ = null;
            let chr1, chr2, chr3;
            let enc1, enc2, enc3, enc4;
            let i = 0;

            while (i < input.length) {
                enc1 = getBaseValue(keyStr, input.charAt(i++));
                enc2 = getBaseValue(keyStr, input.charAt(i++));
                enc3 = getBaseValue(keyStr, input.charAt(i++));
                enc4 = getBaseValue(keyStr, input.charAt(i++));

                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;

                if (ol % 2 == 0) {
                    output_ = chr1 << 8;
                    if (enc3 != 64) {
                        output += f(output_ | chr2);
                    }
                    if (enc4 != 64) {
                        output_ = chr3 << 8;
                    }
                } else {
                    output = output + f(output_ | chr1);
                    if (enc3 != 64) {
                        output_ = chr2 << 8;
                    }
                    if (enc4 != 64) {
                        output += f(output_ | chr3);
                    }
                }
                ol += 3;
            }

            return output;
        }

        return {
            compress: compress,
            decompress: decompress,
            compressToUriSafe: compressToUriSafe,
            decompressFromUriSafe: decompressFromUriSafe
        };
    })();

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
     * Compress a payload for sharing
     * @param {Object} payload - The payload to compress
     * @param {boolean} suppressDebug - Whether to suppress debug messages (for size calculation)
     * @returns {string} Compressed string (raw binary, NOT base64)
     */
    function compressPayload(payload, suppressDebug = false) {
        console.log('[COMPRESSION] compressPayload called with suppressDebug:', suppressDebug);
        
        // Debug: Show key mapping as Step 2
        const originalJson = JSON.stringify(payload);
        
        // Step 1: Map keys to compact form
        const mapped = mapKeys(payload);
        const mappedJson = JSON.stringify(mapped);
        
        // STEP 2: Debug logging for key mapping
        const step2Enabled = !suppressDebug && window.DebugService && window.DebugService.isCategoryEnabled && window.DebugService.isCategoryEnabled('shared-links');
        console.log('[COMPRESSION] Step 2 debug enabled?', step2Enabled, {
            suppressDebug,
            hasDebugService: !!window.DebugService,
            hasIsCategoryEnabled: !!(window.DebugService && window.DebugService.isCategoryEnabled),
            sharedLinksEnabled: window.DebugService && window.DebugService.isCategoryEnabled ? window.DebugService.isCategoryEnabled('shared-links') : 'N/A'
        });
        if (step2Enabled) {
            // Count mapped keys
            const keyMappingExamples = [];
            let totalKeysSaved = 0;
            
            // Check top-level keys
            Object.keys(payload).forEach(key => {
                if (KEY_MAP[key]) {
                    const saved = key.length - KEY_MAP[key].length;
                    totalKeysSaved += saved;
                    keyMappingExamples.push(`  "${key}" → "${KEY_MAP[key]}" (saved ${saved} chars)`);
                }
            });
            
            // Check nested keys in data object
            if (payload.data && typeof payload.data === 'object') {
                Object.keys(payload.data).forEach(key => {
                    if (KEY_MAP[key]) {
                        const saved = key.length - KEY_MAP[key].length;
                        totalKeysSaved += saved;
                        keyMappingExamples.push(`  "data.${key}" → "${KEY_MAP[key]}" (saved ${saved} chars)`);
                    }
                });
            }
            
            const keyMappingMessage = [
                '🔑 ═══════════════════════════════════════════════════════════════',
                '🔑 STEP 2: KEY MAPPING',
                '🔑 ═══════════════════════════════════════════════════════════════',
                `🔑 Original JSON: ${originalJson.length} chars`,
                `🔑 After key mapping: ${mappedJson.length} chars`,
                `🔑 Space saved: ${originalJson.length - mappedJson.length} chars (${(((originalJson.length - mappedJson.length)/originalJson.length)*100).toFixed(1)}%)`,
                '🔑 ───────────────────────────────────────────────────────────────',
                '🔑 Keys mapped:',
                ...keyMappingExamples,
                '🔑 ───────────────────────────────────────────────────────────────',
                `🔑 Total characters saved by key mapping: ${totalKeysSaved}`,
                '🔑 ═══════════════════════════════════════════════════════════════'
            ].join('\n');
            
            // Log to console
            console.log('[DEBUG] Key Mapping:', {
                original: originalJson.length,
                mapped: mappedJson.length,
                saved: originalJson.length - mappedJson.length,
                ratio: ((mappedJson.length / originalJson.length) * 100).toFixed(1) + '%'
            });
            
            // Add to chat
            if (window.aiHackare && window.aiHackare.chatManager && window.aiHackare.chatManager.addSystemMessage) {
                window.aiHackare.chatManager.addSystemMessage(keyMappingMessage, 'debug-message debug-shared-links');
            }
        }
        
        // Step 2: Compress with LZ-String (raw binary, NOT base64)
        const compressed = LZString.compress(mappedJson);
        
        // Debug logging
        if (window.DebugService && window.DebugService.debugLog) {
            const originalSize = JSON.stringify(payload).length;
            const compressedSize = compressed.length;
            const reduction = Math.round((1 - compressedSize / originalSize) * 100);
            window.DebugService.debugLog('compression', 
                `🗜️ Compression: ${originalSize} → ${compressedSize} chars (${reduction}% reduction)`);
        }
        
        // STEP 3: Debug logging for LZ compression  
        // Always show for share links (not suppressed = share link generation)
        if (!suppressDebug && window.DebugService && window.DebugService.isCategoryEnabled && window.DebugService.isCategoryEnabled('shared-links')) {
            const compressionDetails = [
                '🗜️ ═══════════════════════════════════════════════════════════════',
                '🗜️ STEP 3: LZ-STRING COMPRESSION',
                '🗜️ ═══════════════════════════════════════════════════════════════',
                `🗜️ Input (key-mapped JSON): ${mappedJson.length} chars`,
                `🗜️ Output (compressed): ${compressed.length} chars`,
                `🗜️ Compression ratio: ${((compressed.length / mappedJson.length) * 100).toFixed(1)}%`,
                `🗜️ Space saved: ${mappedJson.length - compressed.length} chars`,
                '🗜️ ───────────────────────────────────────────────────────────────',
                `🗜️ Compressed data preview (first 50 chars):`,
                `🗜️ ${compressed.substring(0, 50)}...`,
                '🗜️ ═══════════════════════════════════════════════════════════════'
            ].join('\n');
            
            // Log to console
            console.log('[DEBUG] Compression Details:', {
                original: originalJson.length,
                afterKeyMapping: mappedJson.length,
                afterLZ: compressed.length,
                keyMappingSaved: originalJson.length - mappedJson.length,
                lzSaved: mappedJson.length - compressed.length,
                totalSaved: originalJson.length - compressed.length
            });
            
            // Add to chat as a single system message if chat manager is available
            if (window.aiHackare && window.aiHackare.chatManager && window.aiHackare.chatManager.addSystemMessage) {
                window.aiHackare.chatManager.addSystemMessage(compressionDetails, 'debug-message debug-shared-links');
            }
        }
        
        return compressed;
    }

    /**
     * Decompress a payload from sharing
     * @param {string} compressed - The compressed string (raw binary, NOT base64)
     * @returns {Object} Decompressed payload
     */
    function decompressPayload(compressed) {
        try {
            // Step 1: Decompress with LZ-String (raw binary, NOT base64)
            const json = LZString.decompress(compressed);
            
            if (!json) {
                throw new Error('Decompression failed - invalid compressed data');
            }
            
            // Step 2: Parse JSON
            const mapped = JSON.parse(json);
            
            // Step 3: Unmap keys to verbose form
            const payload = unmapKeys(mapped);
            
            // Debug logging
            if (window.DebugService && window.DebugService.debugLog) {
                const compressedSize = compressed.length;
                const originalSize = JSON.stringify(payload).length;
                window.DebugService.debugLog('compression', 
                    `🗜️ Decompression: ${compressedSize} → ${originalSize} chars`);
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