package crypto

import (
	"regexp"
	"testing"
)

func TestGeneratePassword(t *testing.T) {
	tests := []struct {
		name   string
		length int
		want   int
	}{
		{"Default length", 0, DefaultPasswordLength},
		{"Custom length 8", 8, 8},
		{"Custom length 16", 16, 16},
		{"Custom length 32", 32, 32},
		{"Negative length uses default", -1, DefaultPasswordLength},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			password, err := GeneratePassword(tt.length)
			if err != nil {
				t.Fatalf("GeneratePassword() error = %v", err)
			}

			if len(password) != tt.want {
				t.Errorf("GeneratePassword() length = %v, want %v", len(password), tt.want)
			}

			// Verify password only contains alphanumeric characters
			alphanumeric := regexp.MustCompile("^[a-zA-Z0-9]+$")
			if !alphanumeric.MatchString(password) {
				t.Errorf("GeneratePassword() contains non-alphanumeric characters: %v", password)
			}
		})
	}
}

func TestGenerateSecurePassword(t *testing.T) {
	password, err := GenerateSecurePassword()
	if err != nil {
		t.Fatalf("GenerateSecurePassword() error = %v", err)
	}

	if len(password) != DefaultPasswordLength {
		t.Errorf("GenerateSecurePassword() length = %v, want %v", len(password), DefaultPasswordLength)
	}

	// Verify password only contains alphanumeric characters
	alphanumeric := regexp.MustCompile("^[a-zA-Z0-9]+$")
	if !alphanumeric.MatchString(password) {
		t.Errorf("GenerateSecurePassword() contains non-alphanumeric characters: %v", password)
	}
}

func TestPasswordUniqueness(t *testing.T) {
	// Generate multiple passwords and ensure they're unique
	passwords := make(map[string]bool)
	iterations := 100

	for i := 0; i < iterations; i++ {
		password, err := GenerateSecurePassword()
		if err != nil {
			t.Fatalf("GenerateSecurePassword() error = %v", err)
		}

		if passwords[password] {
			t.Errorf("Duplicate password generated: %v", password)
		}
		passwords[password] = true
	}

	// We should have generated unique passwords
	if len(passwords) != iterations {
		t.Errorf("Expected %d unique passwords, got %d", iterations, len(passwords))
	}
}

func TestPasswordDistribution(t *testing.T) {
	// Test that all character types appear in generated passwords over many iterations
	hasLower := false
	hasUpper := false
	hasDigit := false

	// Generate multiple passwords to check distribution
	for i := 0; i < 100; i++ {
		password, err := GeneratePassword(32) // Longer password for better distribution test
		if err != nil {
			t.Fatalf("GeneratePassword() error = %v", err)
		}

		for _, ch := range password {
			if ch >= 'a' && ch <= 'z' {
				hasLower = true
			}
			if ch >= 'A' && ch <= 'Z' {
				hasUpper = true
			}
			if ch >= '0' && ch <= '9' {
				hasDigit = true
			}
		}

		if hasLower && hasUpper && hasDigit {
			// All character types found
			return
		}
	}

	if !hasLower || !hasUpper || !hasDigit {
		t.Errorf("Password generation doesn't use all character types. Lower: %v, Upper: %v, Digit: %v",
			hasLower, hasUpper, hasDigit)
	}
}