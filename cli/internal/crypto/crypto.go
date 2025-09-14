package crypto

import (
	"crypto/rand"
	"crypto/sha512"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"

	"golang.org/x/crypto/nacl/secretbox"
)

const (
	SaltLength         = 10 // 10 bytes for salt (80 bits)
	NonceLength        = 10 // 10 bytes for nonce stored in encrypted blob
	NonceExpandedLength = 24 // 24 bytes required by NaCl after expansion
	KeyLength          = 32 // Final key length in bytes
	Iterations         = 8192 // Number of iterations for key derivation (power of 2 for efficiency)
)

// EncryptedData represents the encrypted payload structure
type EncryptedData struct {
	Enc   string `json:"enc"`   // Base64 encoded encrypted data
	Salt  string `json:"salt"`  // Base64 encoded salt
	Nonce string `json:"nonce"` // Base64 encoded nonce
}

// GenerateRandomBytes generates random bytes of specified length
func GenerateRandomBytes(n int) ([]byte, error) {
	b := make([]byte, n)
	_, err := rand.Read(b)
	if err != nil {
		return nil, err
	}
	return b, nil
}

// DeriveKey derives a key from password using iterative SHA-512
// Algorithm: 8192 rounds of SHA512(previous_result + salt)
// Keeps all 64 bytes on each iteration, only slices at the end
func DeriveKey(password string, salt []byte) []byte {
	// Convert password to bytes
	passwordBytes := []byte(password)
	
	// Start with password
	result := passwordBytes
	
	// 8192 iterations of: result = SHA512(result + salt)
	// Keep ALL 64 bytes on each iteration for maximum entropy
	for i := 0; i < Iterations; i++ {
		// Combine current result with salt
		input := append(result, salt...)
		
		// Hash it - keep ALL 64 bytes for next iteration
		hash := sha512.Sum512(input)
		result = hash[:] // SHA-512 produces 64 bytes
	}
	
	// Only slice to 32 bytes at the very end
	return result[:KeyLength]
}

// Encrypt encrypts data with a password
func Encrypt(data []byte, password string) (*EncryptedData, error) {
	// Generate salt
	salt, err := GenerateRandomBytes(SaltLength)
	if err != nil {
		return nil, fmt.Errorf("failed to generate salt: %w", err)
	}

	// Derive key from password
	key := DeriveKey(password, salt)

	// Generate nonce (10 bytes, will be expanded)
	nonce, err := GenerateRandomBytes(NonceLength)
	if err != nil {
		return nil, fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Expand nonce to 24 bytes with SHA-512
	expandedNonce := ExpandNonce(nonce)

	// Convert key to array
	var keyArray [32]byte
	copy(keyArray[:], key)

	// Convert expanded nonce to array
	var nonceArray [24]byte
	copy(nonceArray[:], expandedNonce)

	// Encrypt using NaCl secretbox
	encrypted := secretbox.Seal(nil, data, &nonceArray, &keyArray)

	return &EncryptedData{
		Enc:   base64.StdEncoding.EncodeToString(encrypted),
		Salt:  base64.StdEncoding.EncodeToString(salt),
		Nonce: base64.StdEncoding.EncodeToString(nonce), // Store the original 10-byte nonce
	}, nil
}

// Decrypt decrypts data with a password
func Decrypt(encData *EncryptedData, password string) ([]byte, error) {
	// Decode base64
	encrypted, err := base64.StdEncoding.DecodeString(encData.Enc)
	if err != nil {
		return nil, fmt.Errorf("failed to decode encrypted data: %w", err)
	}

	salt, err := base64.StdEncoding.DecodeString(encData.Salt)
	if err != nil {
		return nil, fmt.Errorf("failed to decode salt: %w", err)
	}

	nonce, err := base64.StdEncoding.DecodeString(encData.Nonce)
	if err != nil {
		return nil, fmt.Errorf("failed to decode nonce: %w", err)
	}

	// Derive key from password
	key := DeriveKey(password, salt)

	// Convert key to array
	var keyArray [32]byte
	copy(keyArray[:], key)

	// Expand nonce to 24 bytes with SHA-512
	expandedNonce := ExpandNonce(nonce)

	// Convert expanded nonce to array
	var nonceArray [24]byte
	copy(nonceArray[:], expandedNonce)

	// Decrypt using NaCl secretbox
	decrypted, ok := secretbox.Open(nil, encrypted, &nonceArray, &keyArray)
	if !ok {
		return nil, errors.New("decryption failed - incorrect password or corrupted data")
	}

	return decrypted, nil
}

// EncryptJSON encrypts a JSON object with a password
func EncryptJSON(v interface{}, password string) (*EncryptedData, error) {
	data, err := json.Marshal(v)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal JSON: %w", err)
	}
	return Encrypt(data, password)
}

// DecryptJSON decrypts a JSON object with a password
func DecryptJSON(encData *EncryptedData, password string, v interface{}) error {
	data, err := Decrypt(encData, password)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}

// GenerateShareableURL creates a shareable URL with encrypted data
func GenerateShareableURL(baseURL string, encData *EncryptedData) (string, error) {
	// Encode the encrypted data structure to JSON
	jsonData, err := json.Marshal(encData)
	if err != nil {
		return "", fmt.Errorf("failed to marshal encrypted data: %w", err)
	}

	// Base64 encode the JSON
	encoded := base64.RawURLEncoding.EncodeToString(jsonData)

	// Create the URL with fragment
	return fmt.Sprintf("%s#gpt=%s", baseURL, encoded), nil
}

// ParseShareableURL extracts encrypted data from a shareable URL
func ParseShareableURL(url string) (*EncryptedData, error) {
	// Find the fragment
	fragmentStart := -1
	for i, c := range url {
		if c == '#' {
			fragmentStart = i
			break
		}
	}

	if fragmentStart == -1 {
		return nil, errors.New("no fragment found in URL")
	}

	fragment := url[fragmentStart+1:]

	// Check for gpt= prefix
	const prefix = "gpt="
	if len(fragment) < len(prefix) || fragment[:len(prefix)] != prefix {
		return nil, errors.New("fragment does not start with 'gpt='")
	}

	// Extract the encoded data
	encoded := fragment[len(prefix):]

	// Base64 decode
	jsonData, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return nil, fmt.Errorf("failed to decode base64: %w", err)
	}

	// Unmarshal JSON
	var encData EncryptedData
	if err := json.Unmarshal(jsonData, &encData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal encrypted data: %w", err)
	}

	return &encData, nil
}

// HashString generates a SHA-512 hash of a string (hex encoded)
func HashString(input string) string {
	hash := sha512.Sum512([]byte(input))
	return hex.EncodeToString(hash[:])
}

// DeriveMasterKey derives a master key from password + salt + nonce using iterative SHA-512
// Algorithm: 8192 rounds of SHA512(previous_result + salt + nonce)
// Keeps all 64 bytes on each iteration, only slices at the end
func DeriveMasterKey(password string, salt, nonce []byte) string {
	// Convert password to bytes
	passwordBytes := []byte(password)
	
	// Start with password
	result := passwordBytes
	
	// 8192 iterations of: result = SHA512(result + salt + nonce)
	// Keep ALL 64 bytes on each iteration for maximum entropy
	for i := 0; i < Iterations; i++ {
		// Combine current result with salt AND nonce
		input := make([]byte, len(result)+len(salt)+len(nonce))
		copy(input, result)
		copy(input[len(result):], salt)
		copy(input[len(result)+len(salt):], nonce)
		
		// Hash it - keep ALL 64 bytes for next iteration
		hash := sha512.Sum512(input)
		result = hash[:] // SHA-512 produces 64 bytes
	}
	
	// Only slice to 32 bytes at the very end, then convert to hex
	finalKey := result[:KeyLength]
	return hex.EncodeToString(finalKey)
}

// DeriveNamespaceHash derives namespace hash from decryption key, master key, and nonce
// Uses SHA-512 hash of concatenated keys and nonce
func DeriveNamespaceHash(decryptionKey []byte, masterKeyHex string, nonce []byte) string {
	// Convert master key from hex to bytes
	masterKeyBytes, err := hex.DecodeString(masterKeyHex)
	if err != nil {
		// If hex decode fails, return empty string
		return ""
	}
	
	// Combine decryptionKey + masterKey + nonce
	combined := make([]byte, len(decryptionKey)+len(masterKeyBytes)+len(nonce))
	offset := 0
	copy(combined[offset:], decryptionKey)
	offset += len(decryptionKey)
	copy(combined[offset:], masterKeyBytes)
	offset += len(masterKeyBytes)
	copy(combined[offset:], nonce)
	
	// Hash with SHA-512
	hash := sha512.Sum512(combined)
	
	// Return as hex string
	return hex.EncodeToString(hash[:])
}

// ExpandNonce expands a 10-byte nonce to 24 bytes using SHA-512
func ExpandNonce(nonce []byte) []byte {
	hash := sha512.Sum512(nonce)
	return hash[:NonceExpandedLength]
}

// EncodeBase64URLSafe encodes data to URL-safe base64 (no padding)
func EncodeBase64URLSafe(data []byte) string {
	return base64.RawURLEncoding.EncodeToString(data)
}

// DecodeBase64URLSafe decodes URL-safe base64 (with or without padding)
func DecodeBase64URLSafe(s string) ([]byte, error) {
	// Try raw URL encoding first (no padding)
	data, err := base64.RawURLEncoding.DecodeString(s)
	if err == nil {
		return data, nil
	}
	
	// Try standard URL encoding (with padding)
	return base64.URLEncoding.DecodeString(s)
}

// EncryptShareLink encrypts data for a share link (matches JS format)
func EncryptShareLink(data []byte, password string) (string, error) {
	// Generate salt (10 bytes) and nonce (10 bytes)
	salt, err := GenerateRandomBytes(SaltLength)
	if err != nil {
		return "", fmt.Errorf("failed to generate salt: %w", err)
	}

	nonce, err := GenerateRandomBytes(NonceLength)
	if err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Derive decryption key: 8192 rounds of SHA512(previous + salt)
	key := DeriveKey(password, salt)

	// Expand nonce to 24 bytes with SHA-512
	expandedNonce := ExpandNonce(nonce)

	// Convert key to array
	var keyArray [32]byte
	copy(keyArray[:], key)

	// Convert expanded nonce to array
	var nonceArray [24]byte
	copy(nonceArray[:], expandedNonce)

	// Encrypt with secretbox (symmetric encryption)
	cipher := secretbox.Seal(nil, data, &nonceArray, &keyArray)

	// Combine salt, nonce, and cipher
	fullMessage := make([]byte, len(salt)+len(nonce)+len(cipher))
	offset := 0
	copy(fullMessage[offset:], salt)
	offset += len(salt)
	copy(fullMessage[offset:], nonce)
	offset += len(nonce)
	copy(fullMessage[offset:], cipher)

	// Convert directly to URL-safe base64
	return EncodeBase64URLSafe(fullMessage), nil
}

// DecryptShareLink decrypts data from a share link (matches JS format)
func DecryptShareLink(encryptedData string, password string) ([]byte, error) {
	// Convert from URL-safe base64 to bytes
	data, err := DecodeBase64URLSafe(encryptedData)
	if err != nil {
		return nil, fmt.Errorf("failed to decode base64: %w", err)
	}

	// Current format: salt(10) + nonce(10) + cipher
	if len(data) < (SaltLength + NonceLength + 16) {
		return nil, errors.New("encrypted data too small")
	}

	// Extract components
	offset := 0
	salt := data[offset : offset+SaltLength]
	offset += SaltLength

	nonce := data[offset : offset+NonceLength]
	offset += NonceLength

	cipher := data[offset:]

	// Expand nonce to 24 bytes with SHA-512
	expandedNonce := ExpandNonce(nonce)

	// Derive decryption key: 8192 rounds of SHA512(previous + salt)
	key := DeriveKey(password, salt)

	// Convert key to array
	var keyArray [32]byte
	copy(keyArray[:], key)

	// Convert expanded nonce to array
	var nonceArray [24]byte
	copy(nonceArray[:], expandedNonce)

	// Decrypt using NaCl secretbox
	plain, ok := secretbox.Open(nil, cipher, &nonceArray, &keyArray)
	if !ok {
		return nil, errors.New("decryption failed - incorrect password or corrupted data")
	}

	return plain, nil
}

// ParseShareLinkURL extracts encrypted data from a shareable URL (new format)
func ParseShareLinkURL(url string) (string, error) {
	// Find the fragment
	fragmentStart := -1
	for i, c := range url {
		if c == '#' {
			fragmentStart = i
			break
		}
	}

	if fragmentStart == -1 {
		return "", errors.New("no fragment found in URL")
	}

	fragment := url[fragmentStart+1:]

	// Check for gpt= prefix
	const prefix = "gpt="
	if len(fragment) < len(prefix) || fragment[:len(prefix)] != prefix {
		return "", errors.New("fragment does not start with 'gpt='")
	}

	// Extract and return the encoded data
	return fragment[len(prefix):], nil
}

// ExtractSaltAndNonce extracts salt and nonce from encrypted share link data
func ExtractSaltAndNonce(encryptedData string) (salt, nonce []byte, err error) {
	// Convert from URL-safe base64 to bytes
	data, err := DecodeBase64URLSafe(encryptedData)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to decode base64: %w", err)
	}

	// Check minimum size
	if len(data) < (SaltLength + NonceLength) {
		return nil, nil, errors.New("encrypted data too small")
	}

	// Extract salt and nonce
	salt = data[:SaltLength]
	nonce = data[SaltLength : SaltLength+NonceLength]

	return salt, nonce, nil
}