package ui

import (
	"fmt"
	"strings"

	qrcode "github.com/skip2/go-qrcode"
)

// ShowQRCode displays a QR code in the terminal
func ShowQRCode(data string) error {
	// Generate QR code with medium error correction level
	qr, err := qrcode.New(data, qrcode.Medium)
	if err != nil {
		return fmt.Errorf("failed to generate QR code: %w", err)
	}

	// Get the QR code as a string with ASCII art
	// Use custom ASCII characters for better terminal display
	asciiQR := qr.ToSmallString(false)

	// Replace characters for better visibility in terminal
	asciiQR = strings.ReplaceAll(asciiQR, "█", "██")
	asciiQR = strings.ReplaceAll(asciiQR, " ", "  ")

	// Print with a border
	fmt.Println("\n╔════════════════════════════════════════════╗")
	fmt.Println("║           QR Code for Sharing              ║")
	fmt.Println("╠════════════════════════════════════════════╣")
	
	// Print the QR code with indentation
	lines := strings.Split(asciiQR, "\n")
	for _, line := range lines {
		if line != "" {
			fmt.Printf("  %s\n", line)
		}
	}
	
	fmt.Println("╚════════════════════════════════════════════╝")
	
	return nil
}

// GenerateQRString generates a QR code as a string
func GenerateQRString(data string) (string, error) {
	qr, err := qrcode.New(data, qrcode.Medium)
	if err != nil {
		return "", fmt.Errorf("failed to generate QR code: %w", err)
	}

	// Return as ASCII art string
	return qr.ToSmallString(false), nil
}

// ShowQRCodeInBox displays a QR code with a nice box border
func ShowQRCodeInBox(data string, title string) error {
	qr, err := qrcode.New(data, qrcode.Medium)
	if err != nil {
		return fmt.Errorf("failed to generate QR code: %w", err)
	}

	asciiQR := qr.ToSmallString(false)
	lines := strings.Split(asciiQR, "\n")

	// Find maximum width
	maxWidth := 0
	for _, line := range lines {
		if len(line) > maxWidth {
			maxWidth = len(line)
		}
	}

	// Adjust for double-width characters
	maxWidth = maxWidth * 2

	// Create border
	border := strings.Repeat("═", maxWidth+4)

	// Print header
	fmt.Printf("\n╔%s╗\n", border)
	
	// Print title centered
	if title != "" {
		padding := (maxWidth + 4 - len(title)) / 2
		fmt.Printf("║%s%s%s║\n", 
			strings.Repeat(" ", padding),
			title,
			strings.Repeat(" ", maxWidth+4-padding-len(title)))
		fmt.Printf("╠%s╣\n", border)
	}

	// Print QR code lines
	for _, line := range lines {
		if line != "" {
			// Replace characters for better visibility
			line = strings.ReplaceAll(line, "█", "██")
			line = strings.ReplaceAll(line, " ", "  ")
			
			// Calculate padding
			lineLen := len(strings.ReplaceAll(strings.ReplaceAll(line, "██", "█"), "  ", " "))
			padding := (maxWidth - lineLen*2) / 2
			
			fmt.Printf("║  %s%s%s  ║\n",
				strings.Repeat(" ", padding),
				line,
				strings.Repeat(" ", maxWidth-lineLen*2-padding))
		}
	}

	// Print footer
	fmt.Printf("╚%s╝\n", border)

	return nil
}