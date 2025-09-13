package crypto

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"

	"golang.org/x/crypto/nacl/secretbox"
	"golang.org/x/crypto/pbkdf2"
)

const (
	SaltLength  = 16
	NonceLength = 24 // NaCl nonce length
	KeyLength   = 32
	Iterations  = 10000
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

// DeriveKey derives a key from password using PBKDF2
func DeriveKey(password string, salt []byte) []byte {
	return pbkdf2.Key([]byte(password), salt, Iterations, KeyLength, sha256.New)
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

	// Generate nonce
	nonce, err := GenerateRandomBytes(NonceLength)
	if err != nil {
		return nil, fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Convert key to array
	var keyArray [32]byte
	copy(keyArray[:], key)

	// Convert nonce to array
	var nonceArray [24]byte
	copy(nonceArray[:], nonce)

	// Encrypt using NaCl secretbox
	encrypted := secretbox.Seal(nil, data, &nonceArray, &keyArray)

	return &EncryptedData{
		Enc:   base64.StdEncoding.EncodeToString(encrypted),
		Salt:  base64.StdEncoding.EncodeToString(salt),
		Nonce: base64.StdEncoding.EncodeToString(nonce),
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

	// Convert nonce to array
	var nonceArray [24]byte
	copy(nonceArray[:], nonce)

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

// HashString generates a SHA-256 hash of a string (hex encoded)
func HashString(input string) string {
	hash := sha256.Sum256([]byte(input))
	return fmt.Sprintf("%x", hash)
}