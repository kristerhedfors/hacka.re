package core

import (
	"fmt"
	"sync"
	"time"
)

// Message represents a chat message
type Message struct {
	ID        string    `json:"id"`
	Role      string    `json:"role"`      // system, user, assistant, function
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// Function represents a callable function
type Function struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
	Code        string                 `json:"code"`
	Enabled     bool                   `json:"enabled"`
}

// Prompt represents a system prompt template
type Prompt struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Content     string `json:"content"`
	Category    string `json:"category"`
	IsDefault   bool   `json:"is_default"`
}

// AppState holds the application state
type AppState struct {
	mu sync.RWMutex

	// Chat state
	Messages      []Message
	CurrentInput  string
	IsStreaming   bool
	StreamBuffer  string

	// UI state
	Mode          UIMode
	ActivePanel   Panel
	ModalOpen     bool
	ModalType     string

	// Command state
	CommandHistory []string
	HistoryIndex   int
	FilterText     string

	// Function state
	Functions     []Function
	ActiveFunction *Function

	// Prompt state
	Prompts       []Prompt
	ActivePrompt  *Prompt

	// Connection state
	Connected     bool
	LastError     error
	LastActivity  time.Time
}

// UIMode represents the current UI mode
type UIMode string

const (
	ModeRich   UIMode = "rich"   // Full TUI with panels
	ModeSocket UIMode = "socket" // Simple character-based
	ModeAuto   UIMode = "auto"   // Auto-detect best mode
)

// Panel represents an active panel in rich mode
type Panel string

const (
	PanelChat      Panel = "chat"
	PanelSettings  Panel = "settings"
	PanelPrompts   Panel = "prompts"
	PanelFunctions Panel = "functions"
	PanelMCP       Panel = "mcp"
	PanelRAG       Panel = "rag"
	PanelHelp      Panel = "help"
)

// NewAppState creates a new application state
func NewAppState() *AppState {
	return &AppState{
		Messages:       make([]Message, 0),
		CommandHistory: make([]string, 0),
		Functions:      make([]Function, 0),
		Prompts:        make([]Prompt, 0),
		Mode:           ModeAuto,
		ActivePanel:    PanelChat,
		Connected:      true,
		LastActivity:   time.Now(),
	}
}

// AddMessage adds a new message to the chat history
func (s *AppState) AddMessage(role, content string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	msg := Message{
		ID:        generateID(),
		Role:      role,
		Content:   content,
		Timestamp: time.Now(),
	}

	s.Messages = append(s.Messages, msg)
	s.LastActivity = time.Now()
}

// GetMessages returns a copy of the messages
func (s *AppState) GetMessages() []Message {
	s.mu.RLock()
	defer s.mu.RUnlock()

	msgs := make([]Message, len(s.Messages))
	copy(msgs, s.Messages)
	return msgs
}

// SetStreaming sets the streaming state
func (s *AppState) SetStreaming(streaming bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.IsStreaming = streaming
	if !streaming {
		s.StreamBuffer = ""
	}
}

// AppendToStream appends text to the stream buffer
func (s *AppState) AppendToStream(text string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.StreamBuffer += text
}

// GetStreamBuffer returns the current stream buffer
func (s *AppState) GetStreamBuffer() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.StreamBuffer
}

// SetMode sets the UI mode
func (s *AppState) SetMode(mode UIMode) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Mode = mode
}

// GetMode returns the current UI mode
func (s *AppState) GetMode() UIMode {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.Mode
}

// SetActivePanel sets the active panel
func (s *AppState) SetActivePanel(panel Panel) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ActivePanel = panel
}

// GetActivePanel returns the active panel
func (s *AppState) GetActivePanel() Panel {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.ActivePanel
}

// AddToHistory adds a command to the history
func (s *AppState) AddToHistory(cmd string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Don't add duplicates of the last command
	if len(s.CommandHistory) > 0 && s.CommandHistory[len(s.CommandHistory)-1] == cmd {
		return
	}

	s.CommandHistory = append(s.CommandHistory, cmd)
	s.HistoryIndex = len(s.CommandHistory)
}

// GetHistoryItem returns a history item by relative offset
func (s *AppState) GetHistoryItem(offset int) string {
	s.mu.Lock()
	defer s.mu.Unlock()

	newIndex := s.HistoryIndex + offset
	if newIndex < 0 || newIndex >= len(s.CommandHistory) {
		return ""
	}

	s.HistoryIndex = newIndex
	return s.CommandHistory[s.HistoryIndex]
}

// SetError sets the last error
func (s *AppState) SetError(err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.LastError = err
}

// GetError returns and clears the last error
func (s *AppState) GetError() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	err := s.LastError
	s.LastError = nil
	return err
}

// generateID generates a unique ID
func generateID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}