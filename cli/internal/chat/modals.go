package chat

import "github.com/hacka-re/cli/internal/config"

// ModalHandlers provides functions to open various modals
type ModalHandlers struct {
	OpenSettings    func(cfg *config.Config) error
	OpenPrompts     func(cfg *config.Config) error
	ShowPlaceholder func(title, message string)
}

// SetModalHandlers sets the modal handler functions
func (ec *EnhancedChat) SetModalHandlers(handlers ModalHandlers) {
	ec.modalHandlers = handlers
}