package ui

import (
	"strconv"
	"strings"
	"unicode"

	"github.com/hacka-re/cli/internal/config"
)

// FieldType represents the type of a field
type FieldType int

const (
	FieldText FieldType = iota
	FieldPassword
	FieldSelect
	FieldNumber
	FieldBool
)

// Field represents a settings field with enhanced features
type Field struct {
	Label       string
	Value       string
	Type        FieldType
	Options     []string // For select fields
	Editable    bool
	Refreshable bool // Can be refreshed from API
	// For expandable yes/no fields
	Expandable  bool
	Info        string // Main info text
	YesBrief    string // Brief yes description (few words)
	NoBrief     string // Brief no description (few words)
}

// buildFields constructs the settings fields from config
func buildFields(cfg *config.Config) []Field {
	// For now, just use the current model
	// In the future, we could fetch available models from the API
	modelOptions := []string{cfg.Model}

	return []Field{
		{
			Label:    "API Provider",
			Value:    string(cfg.Provider),
			Type:     FieldSelect,
			Options:  getProviderOptions(),
			Editable: true,
		},
		{
			Label:    "Base URL",
			Value:    cfg.BaseURL,
			Type:     FieldText,
			Editable: true,
		},
		{
			Label:    "API Key",
			Value:    maskAPIKey(cfg.APIKey),
			Type:     FieldPassword,
			Editable: true,
		},
		{
			Label:       "Model",
			Value:       cfg.Model,
			Type:        FieldSelect,
			Options:     modelOptions,
			Editable:    true,
			Refreshable: true,
		},
		{
			Label:    "Max Tokens",
			Value:    formatInt(cfg.MaxTokens),
			Type:     FieldNumber,
			Editable: true,
		},
		{
			Label:    "Temperature",
			Value:    formatFloat(cfg.Temperature),
			Type:     FieldNumber,
			Editable: true,
		},
		{
			Label:    "System Prompt",
			Value:    truncateText(cfg.SystemPrompt, 50),
			Type:     FieldText,
			Editable: true,
		},
		{
			Label:      "Stream Response",
			Value:      boolToString(cfg.StreamResponse),
			Type:       FieldBool,
			Editable:   true,
			Expandable: true,
			Info:       "Controls whether responses are streamed in real-time or sent all at once after processing.",
			YesBrief:   "See responses as they generate",
			NoBrief:    "Wait for complete response",
		},
		{
			Label:      "YOLO Mode",
			Value:      boolToString(cfg.YoloMode),
			Type:       FieldBool,
			Editable:   true,
			Expandable: true,
			Info:       "YOLO Mode automatically executes function calls without user confirmation. Use with caution!",
			YesBrief:   "Auto-execute all functions",
			NoBrief:    "Confirm before execution",
		},
		{
			Label:      "Voice Control",
			Value:      boolToString(cfg.VoiceControl),
			Type:       FieldBool,
			Editable:   true,
			Expandable: true,
			Info:       "Enable voice input using your system's speech recognition capabilities.",
			YesBrief:   "Speak to input text",
			NoBrief:    "Type only",
		},
	}
}

// Helper functions
func getProviderOptions() []string {
	var options []string
	for key := range config.Providers {
		options = append(options, string(key))
	}
	return options
}

func maskAPIKey(key string) string {
	if key == "" {
		return "(not set)"
	}
	if len(key) <= 8 {
		return "••••••••"
	}
	return "••••" + key[len(key)-4:]
}

func formatInt(val int) string {
	if val == 0 {
		return "default"
	}
	return strconv.Itoa(val)
}

func formatFloat(val float64) string {
	if val == 0 {
		return "default"
	}
	return strconv.FormatFloat(val, 'f', 2, 64)
}

func truncateText(text string, maxLen int) string {
	if len(text) <= maxLen {
		return text
	}
	return text[:maxLen-3] + "..."
}

func boolToString(b bool) string {
	if b {
		return "Yes"
	}
	return "No"
}

// wordWrap wraps text to fit within the specified width
func wordWrap(text string, width int) []string {
	if width <= 0 {
		return []string{text}
	}

	var lines []string
	paragraphs := strings.Split(text, "\n")

	for _, paragraph := range paragraphs {
		if paragraph == "" {
			lines = append(lines, "")
			continue
		}

		// Handle bullet points specially
		if strings.HasPrefix(paragraph, "•") || strings.HasPrefix(paragraph, "- ") {
			// Preserve bullet point formatting
			if len(paragraph) <= width {
				lines = append(lines, paragraph)
			} else {
				// Wrap but indent continuation lines
				words := strings.Fields(paragraph)
				current := ""
				indent := "  " // Indent for continuation lines

				for i, word := range words {
					if i == 0 {
						current = word
					} else if len(current)+1+len(word) <= width {
						current += " " + word
					} else {
						lines = append(lines, current)
						current = indent + word
					}
				}
				if current != "" {
					lines = append(lines, current)
				}
			}
			continue
		}

		// Regular text wrapping
		words := strings.Fields(paragraph)
		if len(words) == 0 {
			continue
		}

		current := words[0]
		for _, word := range words[1:] {
			if len(current)+1+len(word) <= width {
				current += " " + word
			} else {
				lines = append(lines, current)
				current = word
			}
		}
		if current != "" {
			lines = append(lines, current)
		}
	}

	return lines
}

// wordWrapPreservingBullets is an improved version that better preserves bullet formatting
func wordWrapPreservingBullets(text string, width int) []string {
	if width <= 0 {
		return []string{text}
	}

	var result []string
	lines := strings.Split(text, "\n")

	for _, line := range lines {
		// Preserve empty lines
		if strings.TrimSpace(line) == "" {
			result = append(result, "")
			continue
		}

		// Check if this is a bullet point
		isBullet := false
		bulletPrefix := ""
		content := line

		// Check for various bullet formats
		if strings.HasPrefix(line, "• ") {
			isBullet = true
			bulletPrefix = "• "
			content = line[2:]
		} else if strings.HasPrefix(line, "- ") {
			isBullet = true
			bulletPrefix = "- "
			content = line[2:]
		} else if strings.HasPrefix(line, "* ") {
			isBullet = true
			bulletPrefix = "* "
			content = line[2:]
		}

		// Wrap the content
		if len(bulletPrefix+content) <= width {
			result = append(result, line)
		} else {
			// Need to wrap
			words := strings.Fields(content)
			if len(words) == 0 {
				result = append(result, bulletPrefix)
				continue
			}

			// First line with bullet
			current := bulletPrefix + words[0]
			indent := "  " // Indent for continuation

			for i := 1; i < len(words); i++ {
				word := words[i]
				testLine := current + " " + word

				if len(testLine) <= width {
					current = testLine
				} else {
					result = append(result, current)
					if isBullet {
						current = indent + word
					} else {
						current = word
					}
				}
			}

			if current != "" && current != indent {
				result = append(result, current)
			}
		}
	}

	return result
}

// Additional helper to check if a rune is a space
func isSpace(r rune) bool {
	return unicode.IsSpace(r)
}