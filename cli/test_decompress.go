package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	
	"github.com/hacka-re/cli/internal/crypto"
)

func main() {
	// The URL and password
	url := "https://hacka.re/#gpt=Pv7t0A8dwCnGwYDMCGkVyGwiLR_YpN_ku6jAXdF1CZa_xRxgVaA5mHMUHgqwMHbhk7uTD7hq2-dMlq4lJW9M6phg_9SKr3OKB_t7BzWghgJHEm7j8cA8vFmWpZKtur02DSxvsXvMM1D2_qLKdrQrNRKOXV0iE0vI8UYUsfxxb_Ip_Bw5004eR5UGcDWYAuRqk6ElXG2e2jRZK-_GYlFFOG9o9AxevNUxWJFRugboal-QRyipx32g1Oj7sNBBP30ho2x6vVPQ5YelI_LivO5mi2aHPCED3TIu5inHav7dSiO9WaYR5oVgrtLW8ADXp1TpE7b053P-E8NCssdzwYwZxBE_-otVnT3EiuK26T2juWhQ_h-zJm1uWaK5UWDWzbYZXECwcIYYMtg"
	password := "asd"
	
	// Extract encrypted data
	encryptedData, err := crypto.ParseShareLinkURL(url)
	if err != nil {
		log.Fatalf("Failed to parse URL: %v", err)
	}
	
	fmt.Printf("Encrypted data (first 50 chars): %s...\n", encryptedData[:50])
	
	// Decrypt
	plainData, err := crypto.DecryptShareLink(encryptedData, password)
	if err != nil {
		log.Fatalf("Failed to decrypt: %v", err)
	}
	
	fmt.Printf("Decrypted data length: %d\n", len(plainData))
	fmt.Printf("First 100 bytes: %s\n", string(plainData[:min(100, len(plainData))]))
	
	// Check if it's a JSON string
	if len(plainData) > 0 && plainData[0] == '"' {
		var compressedStr string
		if err := json.Unmarshal(plainData, &compressedStr); err != nil {
			log.Fatalf("Failed to unmarshal: %v", err)
		}
		
		fmt.Printf("\nCompressed string (first 50 chars): %s...\n", compressedStr[:50])
		
		// Try to decode the base64
		decoded, err := base64.RawURLEncoding.DecodeString(compressedStr)
		if err != nil {
			fmt.Printf("Failed to decode as RawURL: %v\n", err)
			decoded, err = base64.StdEncoding.DecodeString(compressedStr)
			if err != nil {
				log.Fatalf("Failed to decode base64: %v", err)
			}
			fmt.Println("Decoded using standard base64")
		} else {
			fmt.Println("Decoded using RawURL base64")
		}
		
		fmt.Printf("Decoded bytes (first 20): %v\n", decoded[:min(20, len(decoded))])
		
		// Check if it starts with deflate magic bytes
		if len(decoded) >= 2 {
			fmt.Printf("First two bytes: %02x %02x\n", decoded[0], decoded[1])
			// deflate raw starts with 0x78 0x9c or similar
			// zlib starts with 0x78 0x01, 0x78 0x5e, 0x78 0x9c, 0x78 0xda
		}
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}