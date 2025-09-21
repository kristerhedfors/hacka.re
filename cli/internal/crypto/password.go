package crypto

import (
	"crypto/rand"
	"math/big"
)

const (
	// DefaultPasswordLength is the default length for generated passwords
	DefaultPasswordLength = 12
	// PasswordCharset contains alphanumeric characters for password generation
	PasswordCharset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
)

// GeneratePassword generates a cryptographically secure random password
// using the specified length and alphanumeric character set
func GeneratePassword(length int) (string, error) {
	if length <= 0 {
		length = DefaultPasswordLength
	}

	b := make([]byte, length)
	charsetLength := int64(len(PasswordCharset))

	for i := range b {
		// Generate a random index into the charset
		n, err := rand.Int(rand.Reader, big.NewInt(charsetLength))
		if err != nil {
			return "", err
		}
		b[i] = PasswordCharset[n.Int64()]
	}

	return string(b), nil
}

// GenerateSecurePassword generates a 12-character alphanumeric password
func GenerateSecurePassword() (string, error) {
	return GeneratePassword(DefaultPasswordLength)
}