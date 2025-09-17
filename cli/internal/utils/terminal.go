package utils

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"syscall"

	"golang.org/x/term"
)

// GetPassword securely reads a password from stdin with a custom prompt
func GetPassword(prompt string) (string, error) {
	fmt.Print(prompt)

	// Try to read password without echo
	if term.IsTerminal(int(syscall.Stdin)) {
		bytePassword, err := term.ReadPassword(int(syscall.Stdin))
		fmt.Println() // Print newline after password input
		if err != nil {
			return "", err
		}
		return string(bytePassword), nil
	}

	// Fallback to regular input (for non-terminal environments)
	reader := bufio.NewReader(os.Stdin)
	password, err := reader.ReadString('\n')
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(password), nil
}

// GetPasswordSilent securely reads a password from stdin without printing newline to stdout
// (prints to stderr instead, useful for commands that output JSON to stdout)
func GetPasswordSilent() (string, error) {
	// Try to read password without echo
	if term.IsTerminal(int(syscall.Stdin)) {
		bytePassword, err := term.ReadPassword(int(syscall.Stdin))
		fmt.Fprintln(os.Stderr) // Print newline to stderr after password input
		if err != nil {
			return "", err
		}
		return string(bytePassword), nil
	}

	// Fallback to regular input (for non-terminal environments)
	reader := bufio.NewReader(os.Stdin)
	password, err := reader.ReadString('\n')
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(password), nil
}

// GetPasswordWithConfirmation prompts for a password twice and ensures they match
func GetPasswordWithConfirmation(initialPrompt, confirmPrompt string) (string, error) {
	password, err := GetPassword(initialPrompt)
	if err != nil {
		return "", err
	}

	confirm, err := GetPassword(confirmPrompt)
	if err != nil {
		return "", err
	}

	if password != confirm {
		return "", fmt.Errorf("passwords do not match")
	}

	return password, nil
}

// IsTerminal checks if the current stdin is a terminal
func IsTerminal() bool {
	return term.IsTerminal(int(syscall.Stdin))
}