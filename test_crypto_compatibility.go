package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	
	"github.com/hacka-re/cli/internal/crypto"
	"github.com/hacka-re/cli/internal/share"
)

func main() {
	// Test data
	testConfig := &share.SharedConfig{
		APIKey:       "test-api-key-123",
		BaseURL:      "https://api.openai.com/v1",
		Model:        "gpt-4",
		MaxTokens:    2000,
		Temperature:  0.7,
		SystemPrompt: "You are a helpful assistant.",
		Functions: []share.Function{
			{
				Name:        "testFunction",
				Code:        "function test() { return 'hello'; }",
				Description: "Test function",
				Enabled:     true,
			},
		},
	}
	
	password := "testPassword123"
	baseURL := "https://hacka.re/"
	
	fmt.Println("=== Testing Go Crypto Implementation ===")
	fmt.Println()
	
	// Test 1: Create a shareable URL
	fmt.Println("1. Creating shareable URL...")
	url, err := share.CreateShareableURL(testConfig, password, baseURL)
	if err != nil {
		log.Fatalf("Failed to create shareable URL: %v", err)
	}
	fmt.Printf("URL created: %s\n", url[:50]+"...")
	fmt.Println()
	
	// Test 2: Parse the URL back
	fmt.Println("2. Parsing URL back...")
	parsedConfig, err := share.ParseURL(url, password)
	if err != nil {
		log.Fatalf("Failed to parse URL: %v", err)
	}
	
	// Verify the data matches
	if parsedConfig.APIKey != testConfig.APIKey {
		log.Fatalf("API key mismatch: expected %s, got %s", testConfig.APIKey, parsedConfig.APIKey)
	}
	if parsedConfig.Model != testConfig.Model {
		log.Fatalf("Model mismatch: expected %s, got %s", testConfig.Model, parsedConfig.Model)
	}
	fmt.Println("✓ Data decrypted successfully and matches original")
	fmt.Println()
	
	// Test 3: Derive namespace from URL
	fmt.Println("3. Deriving namespace from URL...")
	namespace, masterKey, err := share.DeriveNamespaceFromURL(url, password)
	if err != nil {
		log.Fatalf("Failed to derive namespace: %v", err)
	}
	fmt.Printf("Namespace: %s\n", namespace)
	fmt.Printf("Master Key: %s...\n", masterKey[:16])
	fmt.Println()
	
	// Test 4: Test with a known JS-generated URL (if provided as argument)
	if len(os.Args) > 1 {
		jsURL := os.Args[1]
		fmt.Println("4. Testing with JS-generated URL...")
		fmt.Printf("URL: %s...\n", jsURL[:50])
		
		// Try to decrypt
		jsConfig, err := share.ParseURL(jsURL, password)
		if err != nil {
			fmt.Printf("Failed to parse JS URL: %v\n", err)
		} else {
			jsonData, _ := json.MarshalIndent(jsConfig, "", "  ")
			fmt.Printf("Successfully decrypted JS data:\n%s\n", string(jsonData))
		}
	}
	
	fmt.Println()
	fmt.Println("=== Test Complete ===")
}