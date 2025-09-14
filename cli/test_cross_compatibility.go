package main

import (
	"fmt"
	"log"
	
	"github.com/hacka-re/cli/internal/share"
)

func main() {
	// Test with a known password and simple data
	password := "test123"
	
	// Simple test config
	testConfig := &share.SharedConfig{
		APIKey: "sk-test",
		Model:  "gpt-4",
	}
	
	// Create URL with Go implementation
	url, err := share.CreateShareableURL(testConfig, password, "https://hacka.re/")
	if err != nil {
		log.Fatalf("Failed to create URL: %v", err)
	}
	
	fmt.Println("=== Cross-Compatibility Test ===")
	fmt.Println()
	fmt.Println("Test this URL in JavaScript with password:", password)
	fmt.Println("URL:", url)
	fmt.Println()
	
	// Extract just the encrypted part for easier testing
	if len(url) > 50 {
		start := len("https://hacka.re/#gpt=")
		encPart := url[start:]
		fmt.Println("Encrypted part only:")
		fmt.Println(encPart)
		fmt.Println()
		fmt.Println("To test in browser console:")
		fmt.Println("CryptoUtils.decryptData('" + encPart + "', '" + password + "')")
	}
	
	// Also test namespace derivation
	namespace, masterKey, err := share.DeriveNamespaceFromURL(url, password)
	if err != nil {
		log.Fatalf("Failed to derive namespace: %v", err)
	}
	
	fmt.Println()
	fmt.Println("Go-derived values:")
	fmt.Println("Namespace:", namespace)
	fmt.Println("Master Key (first 32 chars):", masterKey[:32])
}