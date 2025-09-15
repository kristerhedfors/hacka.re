package share

import (
	"fmt"
	"os"
	"strings"
)

// GetSessionFromEnvironment checks for session link in environment variables
// Checks HACKARE_LINK, HACKARE_SESSION, and HACKARE_CONFIG (all synonymous)
// These all represent the same thing: a session in the form of a link containing configuration
// Returns the session link if found, empty string if none found
// Returns an error if multiple are defined (configuration conflict)
func GetSessionFromEnvironment() (string, error) {
	// These three environment variables are synonymous
	// They all represent a session (a link containing encrypted configuration)
	// Accepted formats:
	// - Full URL: https://hacka.re/#gpt=eyJlbmM...
	// - Fragment: gpt=eyJlbmM...
	// - Raw data: eyJlbmM...
	envVars := []string{
		"HACKARE_LINK",
		"HACKARE_SESSION",
		"HACKARE_CONFIG",
	}

	var foundVar string
	var foundSession string
	var definedVars []string

	// Check all environment variables for session data
	for _, envVar := range envVars {
		if value := os.Getenv(envVar); value != "" {
			definedVars = append(definedVars, envVar)
			if foundVar == "" {
				foundVar = envVar
				foundSession = strings.TrimSpace(value)
			}
		}
	}

	// Fail if multiple session variables are defined
	if len(definedVars) > 1 {
		return "", fmt.Errorf("multiple hacka.re session environment variables are set: %s\nThese variables are synonymous - please use only one",
			strings.Join(definedVars, ", "))
	}

	return foundSession, nil
}

// HasEnvironmentSession returns true if any of the session environment variables are set
// Returns an error if multiple are set
func HasEnvironmentSession() (bool, error) {
	session, err := GetSessionFromEnvironment()
	if err != nil {
		return false, err
	}
	return session != "", nil
}

// GetEnvironmentSessionSource returns which environment variable contains the session (for logging)
// Returns an error if multiple are set
func GetEnvironmentSessionSource() (string, error) {
	envVars := []string{
		"HACKARE_LINK",
		"HACKARE_SESSION",
		"HACKARE_CONFIG",
	}

	var foundVar string
	var definedVars []string

	for _, envVar := range envVars {
		if os.Getenv(envVar) != "" {
			definedVars = append(definedVars, envVar)
			if foundVar == "" {
				foundVar = envVar
			}
		}
	}

	// Fail if multiple session variables are defined
	if len(definedVars) > 1 {
		return "", fmt.Errorf("multiple hacka.re session environment variables are set: %s",
			strings.Join(definedVars, ", "))
	}

	return foundVar, nil
}