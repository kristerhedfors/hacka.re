package compression

import (
	"bytes"
	"compress/flate"
	"compress/zlib"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
)

// KeyMap defines the key mapping for compression
var KeyMap = map[string]string{
	// Top-level keys
	"apiKey":                                "a",
	"baseUrl":                               "b",
	"systemPrompt":                          "s",
	"messages":                              "m",
	"functions":                             "f",
	"enabledFunctions":                      "e",
	"selectedPromptIds":                     "p",
	"selectedDefaultPromptIds":              "d",
	"selectedDefaultFunctionIds":            "F",
	"selectedDefaultFunctionCollectionIds": "C",
	"mcpConnections":                        "c",
	"welcomeMessage":                        "w",
	"theme":                                 "t",
	"prompts":                               "P",
	"model":                                 "M",
	"provider":                              "v",
	// Message object keys
	"role":    "r",
	"content": "n",
	// Prompt object keys
	"title":    "T",
	"prompt":   "q",
	"selected": "S",
	"id":       "i",
	// Function object keys
	"code":    "o",
	"enabled": "E",
	// MCP connection keys
	"github": "g",
	"gmail":  "G",
	"shodan": "h",
}

// ReverseKeyMap is the reverse of KeyMap for decompression
var ReverseKeyMap map[string]string

func init() {
	ReverseKeyMap = make(map[string]string)
	for k, v := range KeyMap {
		ReverseKeyMap[v] = k
	}
}

// CompressPayload compresses a payload using key mapping and deflate
func CompressPayload(payload interface{}) (string, error) {
	// Step 1: Map keys to compact form
	mapped := mapKeys(payload)
	
	// Step 2: Convert to JSON
	mappedJSON, err := json.Marshal(mapped)
	if err != nil {
		return "", fmt.Errorf("failed to marshal mapped payload: %w", err)
	}
	
	// Step 3: Apply deflate compression
	var compressed bytes.Buffer
	writer, err := flate.NewWriter(&compressed, flate.DefaultCompression)
	if err != nil {
		return "", fmt.Errorf("failed to create deflate writer: %w", err)
	}
	
	_, err = writer.Write(mappedJSON)
	if err != nil {
		return "", fmt.Errorf("failed to write compressed data: %w", err)
	}
	
	err = writer.Close()
	if err != nil {
		return "", fmt.Errorf("failed to close deflate writer: %w", err)
	}
	
	// Step 4: Base64 encode for URL safety (without padding)
	return base64.RawURLEncoding.EncodeToString(compressed.Bytes()), nil
}

// DecompressPayload decompresses a payload using deflate and unmaps keys
func DecompressPayload(compressed string) (map[string]interface{}, error) {
	// Step 1: Decode from base64 (URL-safe without padding, matching JS)
	compressedBytes, err := base64.RawURLEncoding.DecodeString(compressed)
	if err != nil {
		// Fallback to standard base64 if needed
		compressedBytes, err = base64.StdEncoding.DecodeString(compressed)
		if err != nil {
			return nil, fmt.Errorf("failed to decode base64: %w", err)
		}
	}
	
	// Step 2: Decompress using zlib (which wraps deflate)
	// Check if it's zlib format (starts with 0x78)
	if len(compressedBytes) >= 2 && compressedBytes[0] == 0x78 {
		// Use zlib reader
		reader, err := zlib.NewReader(bytes.NewReader(compressedBytes))
		if err != nil {
			return nil, fmt.Errorf("failed to create zlib reader: %w", err)
		}
		defer reader.Close()
		
		decompressed, err := io.ReadAll(reader)
		if err != nil {
			return nil, fmt.Errorf("failed to decompress zlib data: %w", err)
		}
		return parseDecompressed(decompressed)
	} else {
		// Try raw deflate
		reader := flate.NewReader(bytes.NewReader(compressedBytes))
		defer reader.Close()
		
		decompressed, err := io.ReadAll(reader)
		if err != nil {
			return nil, fmt.Errorf("failed to decompress deflate data: %w", err)
		}
		return parseDecompressed(decompressed)
	}
}

// parseDecompressed handles the common parsing logic
func parseDecompressed(decompressed []byte) (map[string]interface{}, error) {
	// Parse JSON
	var mapped interface{}
	err := json.Unmarshal(decompressed, &mapped)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal decompressed data: %w", err)
	}
	
	// Unmap keys back to original form
	unmapped := unmapKeys(mapped)
	
	// Convert to map[string]interface{}
	result, ok := unmapped.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("unexpected data structure after unmapping")
	}
	
	return result, nil
}

// mapKeys recursively maps verbose keys to compact keys
func mapKeys(data interface{}) interface{} {
	switch v := data.(type) {
	case map[string]interface{}:
		mapped := make(map[string]interface{})
		for key, value := range v {
			// Map the key if it exists in KeyMap
			mappedKey := key
			if compact, exists := KeyMap[key]; exists {
				mappedKey = compact
			}
			// Recursively map the value
			mapped[mappedKey] = mapKeys(value)
		}
		return mapped
		
	case []interface{}:
		mapped := make([]interface{}, len(v))
		for i, item := range v {
			mapped[i] = mapKeys(item)
		}
		return mapped
		
	default:
		// Return primitive values as-is
		return v
	}
}

// unmapKeys recursively unmaps compact keys back to verbose keys
func unmapKeys(data interface{}) interface{} {
	switch v := data.(type) {
	case map[string]interface{}:
		unmapped := make(map[string]interface{})
		for key, value := range v {
			// Unmap the key if it exists in ReverseKeyMap
			unmappedKey := key
			if verbose, exists := ReverseKeyMap[key]; exists {
				unmappedKey = verbose
			}
			// Recursively unmap the value
			unmapped[unmappedKey] = unmapKeys(value)
		}
		return unmapped
		
	case []interface{}:
		unmapped := make([]interface{}, len(v))
		for i, item := range v {
			unmapped[i] = unmapKeys(item)
		}
		return unmapped
		
	default:
		// Return primitive values as-is
		return v
	}
}

// TryDecompressJSON attempts to decompress a string that might be compressed JSON
// Returns the decompressed JSON string or the original if not compressed
func TryDecompressJSON(data string) (string, error) {
	// Try to decompress
	decompressed, err := DecompressPayload(data)
	if err != nil {
		// Not compressed, return original
		return data, nil
	}
	
	// Convert back to JSON
	jsonBytes, err := json.Marshal(decompressed)
	if err != nil {
		return "", fmt.Errorf("failed to marshal decompressed data: %w", err)
	}
	
	return string(jsonBytes), nil
}