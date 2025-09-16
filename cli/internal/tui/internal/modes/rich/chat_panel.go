package rich

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/tui/internal/core"
	"github.com/hacka-re/cli/internal/tui/internal/services"
)

// ChatPanel represents the chat interface panel
type ChatPanel struct {
	screen   tcell.Screen
	config   *core.ConfigManager
	state    *core.AppState
	eventBus *core.EventBus

	// Position and dimensions
	x, y          int
	width, height int

	// Chat state
	messages       []ChatMessage
	inputBuffer    string
	cursorPos      int
	scrollOffset   int
	isStreaming    bool
	streamingMsg   *ChatMessage
	streamingMutex sync.Mutex

	// API client
	chatClient *services.ChatClient

	// UI state
	focused      bool
	needsRedraw  bool
}

// ChatMessage represents a single chat message
type ChatMessage struct {
	Role      string    // user, assistant, system
	Content   string
	Timestamp time.Time
}

// NewChatPanel creates a new chat panel
func NewChatPanel(screen tcell.Screen, config *core.ConfigManager, state *core.AppState, eventBus *core.EventBus) *ChatPanel {
	w, h := screen.Size()

	// Use most of the screen for chat
	padding := 2
	panelWidth := w - (padding * 2)
	panelHeight := h - (padding * 2)

	cp := &ChatPanel{
		screen:     screen,
		config:     config,
		state:      state,
		eventBus:   eventBus,
		x:          padding,
		y:          padding,
		width:      panelWidth,
		height:     panelHeight,
		messages:   make([]ChatMessage, 0),
		focused:    true,
		chatClient: services.NewChatClient(config),
	}

	// Load existing messages from state if any
	cp.loadMessagesFromState()

	// Add welcome message if no messages exist
	if len(cp.messages) == 0 {
		cp.messages = append(cp.messages, ChatMessage{
			Role:      "system",
			Content:   "Welcome to hacka.re chat! Type your message below or use /help for commands.",
			Timestamp: time.Now(),
		})
	}

	return cp
}

// loadMessagesFromState loads existing messages from the app state
func (cp *ChatPanel) loadMessagesFromState() {
	// Get messages from state
	stateMessages := cp.state.GetMessages()

	// Convert to ChatMessage format
	for _, msg := range stateMessages {
		cp.messages = append(cp.messages, ChatMessage{
			Role:      msg.Role,
			Content:   msg.Content,
			Timestamp: msg.Timestamp,
		})
	}
}

// saveMessagesToState saves current messages to the app state
func (cp *ChatPanel) saveMessagesToState() {
	// Clear existing messages
	// Note: AppState doesn't have a clear method, so we'll add messages incrementally

	// Add each message to state
	for _, msg := range cp.messages {
		// Only add if not already in state
		cp.state.AddMessage(msg.Role, msg.Content)
	}
}

// HandleInput processes keyboard input
func (cp *ChatPanel) HandleInput(ev *tcell.EventKey) bool {
	switch ev.Key() {
	case tcell.KeyEscape:
		// Save state and return to main menu
		cp.saveMessagesToState()
		return true // Signal to return to main menu

	case tcell.KeyEnter:
		if strings.TrimSpace(cp.inputBuffer) != "" {
			cp.sendMessage()
		}
		return false

	case tcell.KeyBackspace, tcell.KeyBackspace2:
		if cp.cursorPos > 0 && len(cp.inputBuffer) > 0 {
			cp.inputBuffer = cp.inputBuffer[:cp.cursorPos-1] + cp.inputBuffer[cp.cursorPos:]
			cp.cursorPos--
		}
		return false

	case tcell.KeyLeft:
		if cp.cursorPos > 0 {
			cp.cursorPos--
		}
		return false

	case tcell.KeyRight:
		if cp.cursorPos < len(cp.inputBuffer) {
			cp.cursorPos++
		}
		return false

	case tcell.KeyUp:
		// Scroll up through messages
		if cp.scrollOffset > 0 {
			cp.scrollOffset--
		}
		return false

	case tcell.KeyDown:
		// Scroll down through messages
		maxScroll := len(cp.messages) - (cp.height - 5) // Leave room for input area
		if maxScroll > 0 && cp.scrollOffset < maxScroll {
			cp.scrollOffset++
		}
		return false

	case tcell.KeyHome:
		cp.cursorPos = 0
		return false

	case tcell.KeyEnd:
		cp.cursorPos = len(cp.inputBuffer)
		return false

	case tcell.KeyRune:
		r := ev.Rune()
		cp.inputBuffer = cp.inputBuffer[:cp.cursorPos] + string(r) + cp.inputBuffer[cp.cursorPos:]
		cp.cursorPos++
		return false
	}

	return false
}

// sendMessage sends the current input as a user message
func (cp *ChatPanel) sendMessage() {
	message := strings.TrimSpace(cp.inputBuffer)
	if message == "" {
		return
	}

	// Handle commands
	if strings.HasPrefix(message, "/") {
		cp.handleCommand(message)
		cp.inputBuffer = ""
		cp.cursorPos = 0
		return
	}

	// Add user message
	cp.messages = append(cp.messages, ChatMessage{
		Role:      "user",
		Content:   message,
		Timestamp: time.Now(),
	})

	// Save to state
	cp.state.AddMessage("user", message)

	// Clear input
	cp.inputBuffer = ""
	cp.cursorPos = 0

	// Auto-scroll to bottom
	cp.scrollToBottom()

	// Mark as streaming
	cp.isStreaming = true

	// Send to API in background
	go cp.streamResponse()
}

// handleCommand processes chat commands
func (cp *ChatPanel) handleCommand(cmd string) {
	switch {
	case strings.HasPrefix(cmd, "/clear"):
		cp.messages = []ChatMessage{}
		cp.scrollOffset = 0

	case strings.HasPrefix(cmd, "/help"):
		cp.messages = append(cp.messages, ChatMessage{
			Role:    "system",
			Content: "Available commands:\n/clear - Clear chat history\n/help - Show this help\nESC - Return to main menu",
			Timestamp: time.Now(),
		})
		cp.scrollToBottom()

	default:
		cp.messages = append(cp.messages, ChatMessage{
			Role:      "system",
			Content:   "Unknown command: " + cmd,
			Timestamp: time.Now(),
		})
		cp.scrollToBottom()
	}
}

// scrollToBottom scrolls to the bottom of the message list
func (cp *ChatPanel) scrollToBottom() {
	maxScroll := len(cp.messages) - (cp.height - 5)
	if maxScroll > 0 {
		cp.scrollOffset = maxScroll
	} else {
		cp.scrollOffset = 0
	}
}

// streamResponse handles streaming response from the API
func (cp *ChatPanel) streamResponse() {
	// Convert messages to API format
	apiMessages := make([]services.ChatMessage, 0)
	for _, msg := range cp.messages {
		// Skip system messages for API
		if msg.Role == "system" && strings.Contains(msg.Content, "Welcome to hacka.re") {
			continue
		}
		apiMessages = append(apiMessages, services.ChatMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}

	// Add system prompt from config if configured
	config := cp.config.Get()
	if config.SystemPrompt != "" {
		apiMessages = append([]services.ChatMessage{
			{Role: "system", Content: config.SystemPrompt},
		}, apiMessages...)
	}

	// Create streaming message
	cp.streamingMutex.Lock()
	cp.streamingMsg = &ChatMessage{
		Role:      "assistant",
		Content:   "",
		Timestamp: time.Now(),
	}
	cp.messages = append(cp.messages, *cp.streamingMsg)
	streamingIndex := len(cp.messages) - 1
	cp.streamingMutex.Unlock()

	// Stream the response
	err := cp.chatClient.StreamCompletion(apiMessages, func(chunk string, done bool) error {
		cp.streamingMutex.Lock()
		defer cp.streamingMutex.Unlock()

		if done {
			// Streaming complete
			cp.isStreaming = false
			cp.streamingMsg = nil

			// Save to state
			if streamingIndex < len(cp.messages) {
				cp.state.AddMessage("assistant", cp.messages[streamingIndex].Content)
			}
		} else {
			// Append chunk to streaming message
			if streamingIndex < len(cp.messages) {
				cp.messages[streamingIndex].Content += chunk
				if cp.streamingMsg != nil {
					cp.streamingMsg.Content = cp.messages[streamingIndex].Content
				}
			}

			// Auto-scroll to bottom
			cp.scrollToBottom()
		}

		// Trigger redraw
		cp.needsRedraw = true
		// Send a resize event to trigger screen update
		if cp.screen != nil {
			cp.screen.PostEvent(tcell.NewEventResize(0, 0))
		}

		return nil
	})

	if err != nil {
		// Add error message
		cp.streamingMutex.Lock()
		errorMsg := ChatMessage{
			Role:      "system",
			Content:   fmt.Sprintf("Error: %v", err),
			Timestamp: time.Now(),
		}
		cp.messages = append(cp.messages, errorMsg)
		cp.isStreaming = false
		cp.streamingMsg = nil
		cp.scrollToBottom()
		cp.needsRedraw = true
		cp.streamingMutex.Unlock()

		// Trigger redraw
		if cp.screen != nil {
			cp.screen.PostEvent(tcell.NewEventResize(0, 0))
		}
	}
}

// Draw renders the chat panel
func (cp *ChatPanel) Draw() {
	// Draw border
	cp.drawBorder()

	// Draw title
	title := "Chat Interface - ESC to return"
	if cp.isStreaming {
		title = "Chat Interface - Streaming... - ESC to return"
	}
	titleX := cp.x + (cp.width-len(title))/2
	style := tcell.StyleDefault.Foreground(tcell.ColorGreen).Bold(true)
	for i, r := range title {
		cp.screen.SetContent(titleX+i, cp.y, r, nil, style)
	}

	// Show API info
	config := cp.config.Get()
	apiInfo := fmt.Sprintf("[%s/%s]", config.Provider, config.Model)
	infoX := cp.x + 2
	infoStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)
	for i, r := range apiInfo {
		cp.screen.SetContent(infoX+i, cp.y, r, nil, infoStyle)
	}

	// Draw messages area
	cp.drawMessages()

	// Draw input area
	cp.drawInputArea()
}

// drawBorder draws the panel border
func (cp *ChatPanel) drawBorder() {
	style := tcell.StyleDefault.Foreground(tcell.ColorWhite)

	// Top and bottom borders
	for x := cp.x; x < cp.x+cp.width; x++ {
		cp.screen.SetContent(x, cp.y, '═', nil, style)
		cp.screen.SetContent(x, cp.y+cp.height-1, '═', nil, style)
	}

	// Left and right borders
	for y := cp.y; y < cp.y+cp.height; y++ {
		cp.screen.SetContent(cp.x, y, '║', nil, style)
		cp.screen.SetContent(cp.x+cp.width-1, y, '║', nil, style)
	}

	// Corners
	cp.screen.SetContent(cp.x, cp.y, '╔', nil, style)
	cp.screen.SetContent(cp.x+cp.width-1, cp.y, '╗', nil, style)
	cp.screen.SetContent(cp.x, cp.y+cp.height-1, '╚', nil, style)
	cp.screen.SetContent(cp.x+cp.width-1, cp.y+cp.height-1, '╝', nil, style)
}

// drawMessages draws the chat messages
func (cp *ChatPanel) drawMessages() {
	messageAreaHeight := cp.height - 5 // Leave room for input and borders
	startY := cp.y + 2

	// Lock for thread-safe message access
	cp.streamingMutex.Lock()
	messagesCopy := make([]ChatMessage, len(cp.messages))
	copy(messagesCopy, cp.messages)
	cp.streamingMutex.Unlock()

	// Calculate visible messages
	visibleStart := cp.scrollOffset
	visibleEnd := visibleStart + messageAreaHeight - 2
	if visibleEnd > len(messagesCopy) {
		visibleEnd = len(messagesCopy)
	}

	// Draw each visible message
	currentY := startY
	for i := visibleStart; i < visibleEnd && currentY < cp.y+cp.height-3; i++ {
		msg := messagesCopy[i]

		// Choose color based on role
		var style tcell.Style
		switch msg.Role {
		case "user":
			style = tcell.StyleDefault.Foreground(tcell.ColorBlue)
		case "assistant":
			style = tcell.StyleDefault.Foreground(tcell.ColorGreen)
		case "system":
			style = tcell.StyleDefault.Foreground(tcell.ColorYellow)
		default:
			style = tcell.StyleDefault
		}

		// Format message
		prefix := fmt.Sprintf("[%s] ", msg.Role)
		lines := cp.wrapText(prefix+msg.Content, cp.width-4)

		// Draw each line
		for _, line := range lines {
			if currentY >= cp.y+cp.height-3 {
				break
			}

			// Clear the line first
			for x := cp.x + 2; x < cp.x+cp.width-2; x++ {
				cp.screen.SetContent(x, currentY, ' ', nil, tcell.StyleDefault)
			}

			// Draw the text
			for j, r := range line {
				if cp.x+2+j < cp.x+cp.width-2 {
					cp.screen.SetContent(cp.x+2+j, currentY, r, nil, style)
				}
			}
			currentY++
		}

		// Add spacing between messages
		if currentY < cp.y+cp.height-3 {
			currentY++
		}
	}

	// Draw scroll indicator if needed
	if len(messagesCopy) > messageAreaHeight-2 {
		scrollBarX := cp.x + cp.width - 2
		scrollBarHeight := messageAreaHeight - 2
		scrollBarY := startY

		// Calculate thumb position
		if len(messagesCopy) > 0 {
			thumbPos := (cp.scrollOffset * scrollBarHeight) / len(messagesCopy)
			if thumbPos >= 0 && thumbPos < scrollBarHeight {
				cp.screen.SetContent(scrollBarX, scrollBarY+thumbPos, '█', nil,
					tcell.StyleDefault.Foreground(tcell.ColorGray))
			}
		}
	}
}

// drawInputArea draws the input area at the bottom
func (cp *ChatPanel) drawInputArea() {
	inputY := cp.y + cp.height - 2

	// Draw separator
	for x := cp.x + 1; x < cp.x+cp.width-1; x++ {
		cp.screen.SetContent(x, inputY-1, '─', nil, tcell.StyleDefault)
	}

	// Draw prompt
	prompt := "> "
	promptStyle := tcell.StyleDefault.Foreground(tcell.ColorBlue)
	for i, r := range prompt {
		cp.screen.SetContent(cp.x+2+i, inputY, r, nil, promptStyle)
	}

	// Draw input text
	inputStartX := cp.x + 2 + len(prompt)
	maxInputWidth := cp.width - 6 - len(prompt)

	// Clear input area first
	for x := inputStartX; x < cp.x+cp.width-2; x++ {
		cp.screen.SetContent(x, inputY, ' ', nil, tcell.StyleDefault)
	}

	// Draw visible portion of input
	visibleInput := cp.inputBuffer
	if len(visibleInput) > maxInputWidth {
		// Show a window around the cursor
		start := cp.cursorPos - maxInputWidth/2
		if start < 0 {
			start = 0
		}
		end := start + maxInputWidth
		if end > len(cp.inputBuffer) {
			end = len(cp.inputBuffer)
			start = end - maxInputWidth
			if start < 0 {
				start = 0
			}
		}
		visibleInput = cp.inputBuffer[start:end]
	}

	// Draw the input text
	inputStyle := tcell.StyleDefault.Foreground(tcell.ColorWhite)
	for i, r := range visibleInput {
		if inputStartX+i < cp.x+cp.width-2 {
			cp.screen.SetContent(inputStartX+i, inputY, r, nil, inputStyle)
		}
	}

	// Draw cursor
	if cp.focused {
		cursorX := inputStartX + cp.cursorPos
		if len(cp.inputBuffer) > maxInputWidth {
			// Adjust cursor position for windowed input
			// This is simplified - in production you'd want more sophisticated logic
			cursorX = inputStartX + min(cp.cursorPos, maxInputWidth-1)
		}
		if cursorX < cp.x+cp.width-2 {
			cp.screen.ShowCursor(cursorX, inputY)
		}
	}
}

// wrapText wraps text to fit within the given width
func (cp *ChatPanel) wrapText(text string, width int) []string {
	var lines []string
	words := strings.Fields(text)
	if len(words) == 0 {
		return []string{""}
	}

	currentLine := ""
	for _, word := range words {
		if len(currentLine)+len(word)+1 > width {
			if currentLine != "" {
				lines = append(lines, currentLine)
				currentLine = word
			} else {
				// Word is too long, break it
				for len(word) > width {
					lines = append(lines, word[:width])
					word = word[width:]
				}
				currentLine = word
			}
		} else {
			if currentLine == "" {
				currentLine = word
			} else {
				currentLine += " " + word
			}
		}
	}
	if currentLine != "" {
		lines = append(lines, currentLine)
	}

	return lines
}


// SetDimensions sets the panel dimensions
func (cp *ChatPanel) SetDimensions(width, height int) {
	cp.width = width
	cp.height = height
}

// SetPosition sets the panel position
func (cp *ChatPanel) SetPosition(x, y int) {
	cp.x = x
	cp.y = y
}