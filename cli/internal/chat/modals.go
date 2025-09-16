package chat

import "github.com/hacka-re/cli/internal/config"

// ModalHandlers provides functions to open various modals
type ModalHandlers struct {
	OpenTUI         func() error  // Opens the main TUI menu
	OpenSettings    func(cfg *config.Config) error  // Deprecated - use OpenTUI
	OpenPrompts     func(cfg *config.Config) error  // Deprecated - use OpenTUI
	ShowPlaceholder func(title, message string)
}