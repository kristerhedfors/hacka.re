package rich

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/gdamore/tcell/v2"
	"github.com/hacka-re/cli/internal/logger"
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

// HandleMouse processes mouse input for scrolling
func (cp *ChatPanel) HandleMouse(ev *tcell.EventMouse) {
	x, y := ev.Position()
	button := ev.Buttons()

	// Check if mouse is within chat panel bounds
	if x < cp.x || x >= cp.x+cp.width || y < cp.y || y >= cp.y+cp.height {
		return
	}

	// Handle scroll wheel
	switch button {
	case tcell.WheelUp:
		cp.scrollUp(3) // Scroll up 3 lines per wheel notch
	case tcell.WheelDown:
		cp.scrollDown(3) // Scroll down 3 lines per wheel notch
	}

	// Handle click on scroll bar
	scrollBarX := cp.x + cp.width - 2
	messageAreaHeight := cp.height - 5
	scrollBarY := cp.y + 2

	if x == scrollBarX && y >= scrollBarY && y < scrollBarY+messageAreaHeight-2 {
		// Click on scroll bar - jump to position
		if button&tcell.Button1 != 0 {
			// Calculate scroll position based on click
			relativeY := y - scrollBarY
			maxScroll := cp.calculateMaxScroll()
			if messageAreaHeight > 2 {
				cp.scrollOffset = (relativeY * maxScroll) / (messageAreaHeight - 2)
				if cp.scrollOffset > maxScroll {
					cp.scrollOffset = maxScroll
				}
				if cp.scrollOffset < 0 {
					cp.scrollOffset = 0
				}
			}
		}
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
		// Scroll up one line
		cp.scrollUp(1)
		return false

	case tcell.KeyDown:
		// Scroll down one line
		cp.scrollDown(1)
		return false

	case tcell.KeyPgUp:
		// Page up - scroll up by half the visible area
		visibleLines := cp.height - 5
		cp.scrollUp(visibleLines / 2)
		return false

	case tcell.KeyPgDn:
		// Page down - scroll down by half the visible area
		visibleLines := cp.height - 5
		cp.scrollDown(visibleLines / 2)
		return false

	case tcell.KeyHome:
		// Check if Ctrl is pressed
		if ev.Modifiers()&tcell.ModCtrl != 0 {
			// Ctrl+Home - scroll to top of messages
			cp.scrollOffset = 0
		} else {
			// Home - move cursor to beginning of input
			cp.cursorPos = 0
		}
		return false

	case tcell.KeyEnd:
		// Check if Ctrl is pressed
		if ev.Modifiers()&tcell.ModCtrl != 0 {
			// Ctrl+End - scroll to bottom of messages
			cp.scrollToBottom()
		} else {
			// End - move cursor to end of input
			cp.cursorPos = len(cp.inputBuffer)
		}
		return false

	case tcell.KeyRune:
		r := ev.Rune()
		// Handle Ctrl+U (scroll up) and Ctrl+D (scroll down) for Unix users
		if ev.Modifiers()&tcell.ModCtrl != 0 {
			switch r {
			case 'u', 'U':
				// Ctrl+U - scroll up half page
				visibleLines := cp.height - 5
				cp.scrollUp(visibleLines / 2)
				return false
			case 'd', 'D':
				// Ctrl+D - scroll down half page
				visibleLines := cp.height - 5
				cp.scrollDown(visibleLines / 2)
				return false
			}
		}
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

	// Log message sending
	if log := logger.Get(); log != nil {
		log.Info("[ChatPanel] Sending message: %s", message)
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
	cp.scrollOffset = cp.calculateMaxScroll()
}

// scrollUp scrolls up by the specified number of lines
func (cp *ChatPanel) scrollUp(lines int) {
	cp.scrollOffset -= lines
	if cp.scrollOffset < 0 {
		cp.scrollOffset = 0
	}
}

// scrollDown scrolls down by the specified number of lines
func (cp *ChatPanel) scrollDown(lines int) {
	maxScroll := cp.calculateMaxScroll()
	cp.scrollOffset += lines
	if cp.scrollOffset > maxScroll {
		cp.scrollOffset = maxScroll
	}
}

// calculateMaxScroll calculates the maximum scroll offset
func (cp *ChatPanel) calculateMaxScroll() int {
	// Calculate total lines needed for all messages
	totalLines := 0
	for _, msg := range cp.messages {
		prefix := fmt.Sprintf("[%s] ", msg.Role)
		lines := cp.wrapText(prefix+msg.Content, cp.width-4)
		totalLines += len(lines) + 1 // +1 for spacing between messages
	}

	// Calculate visible area (leave room for borders and input)
	visibleLines := cp.height - 5

	// Max scroll is total lines minus visible lines
	maxScroll := totalLines - visibleLines
	if maxScroll < 0 {
		maxScroll = 0
	}

	return maxScroll
}

// streamResponse handles streaming response from the API
func (cp *ChatPanel) streamResponse() {
	// Log streaming start
	if log := logger.Get(); log != nil {
		log.Info("[ChatPanel] Starting stream response")
	}

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
			// Log streaming completion
			if log := logger.Get(); log != nil {
				if streamingIndex < len(cp.messages) {
					log.Info("[ChatPanel] Streaming complete, message length: %d", len(cp.messages[streamingIndex].Content))
				}
			}

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
		// Log the error
		if log := logger.Get(); log != nil {
			log.Error("[ChatPanel] Streaming error: %v", err)
		}

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

	// Draw title with scroll instructions
	title := "Chat Interface - ESC to return"
	if cp.isStreaming {
		title = "Chat Interface - Streaming... - ESC to return"
	}
	titleX := cp.x + (cp.width-len(title))/2
	style := tcell.StyleDefault.Foreground(tcell.ColorGreen).Bold(true)
	for i, r := range title {
		cp.screen.SetContent(titleX+i, cp.y, r, nil, style)
	}

	// Draw scroll help on the right
	scrollHelp := "[↑↓/PgUp/PgDn to scroll]"
	helpX := cp.x + cp.width - len(scrollHelp) - 2
	helpStyle := tcell.StyleDefault.Foreground(tcell.ColorGray)
	for i, r := range scrollHelp {
		cp.screen.SetContent(helpX+i, cp.y, r, nil, helpStyle)
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

	// Build all message lines first to handle scrolling properly
	var allLines []struct {
		text  string
		style tcell.Style
	}

	for _, msg := range messagesCopy {
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

		// Format and wrap message
		prefix := fmt.Sprintf("[%s] ", msg.Role)
		lines := cp.wrapText(prefix+msg.Content, cp.width-4)

		for _, line := range lines {
			allLines = append(allLines, struct {
				text  string
				style tcell.Style
			}{line, style})
		}

		// Add spacing between messages
		allLines = append(allLines, struct {
			text  string
			style tcell.Style
		}{"", tcell.StyleDefault})
	}

	// Calculate visible range
	visibleStart := cp.scrollOffset
	visibleEnd := visibleStart + messageAreaHeight - 2
	if visibleEnd > len(allLines) {
		visibleEnd = len(allLines)
	}
	if visibleStart > len(allLines) {
		visibleStart = 0
		cp.scrollOffset = 0
	}

	// Draw visible lines
	currentY := startY
	for i := visibleStart; i < visibleEnd && currentY < cp.y+cp.height-3; i++ {
		line := allLines[i]

		// Clear the line first
		for x := cp.x + 2; x < cp.x+cp.width-2; x++ {
			cp.screen.SetContent(x, currentY, ' ', nil, tcell.StyleDefault)
		}

		// Draw the text
		for j, r := range line.text {
			if cp.x+2+j < cp.x+cp.width-2 {
				cp.screen.SetContent(cp.x+2+j, currentY, r, nil, line.style)
			}
		}
		currentY++
	}

	// Draw scroll indicator if needed
	if len(allLines) > messageAreaHeight-2 {
		scrollBarX := cp.x + cp.width - 2
		scrollBarHeight := messageAreaHeight - 2
		scrollBarY := startY

		// Draw scroll track
		for y := 0; y < scrollBarHeight; y++ {
			cp.screen.SetContent(scrollBarX, scrollBarY+y, '│', nil,
				tcell.StyleDefault.Foreground(tcell.ColorDarkGray))
		}

		// Calculate thumb size and position
		if len(allLines) > 0 {
			// Thumb size proportional to visible area
			thumbSize := max(1, (scrollBarHeight * (messageAreaHeight - 2)) / len(allLines))

			// Thumb position based on scroll offset
			maxScroll := cp.calculateMaxScroll()
			var thumbPos int
			if maxScroll > 0 {
				thumbPos = (cp.scrollOffset * (scrollBarHeight - thumbSize)) / maxScroll
			} else {
				thumbPos = 0
			}

			// Draw thumb
			for i := 0; i < thumbSize && thumbPos+i < scrollBarHeight; i++ {
				cp.screen.SetContent(scrollBarX, scrollBarY+thumbPos+i, '█', nil,
					tcell.StyleDefault.Foreground(tcell.ColorGray))
			}
		}

		// Draw scroll arrows
		if cp.scrollOffset > 0 {
			cp.screen.SetContent(scrollBarX, scrollBarY-1, '▲', nil,
				tcell.StyleDefault.Foreground(tcell.ColorWhite))
		}
		if cp.scrollOffset < cp.calculateMaxScroll() {
			cp.screen.SetContent(scrollBarX, scrollBarY+scrollBarHeight, '▼', nil,
				tcell.StyleDefault.Foreground(tcell.ColorWhite))
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
	if width <= 0 {
		return []string{text}
	}

	var lines []string
	// Split by existing newlines first
	for _, line := range strings.Split(text, "\n") {
		if len(line) == 0 {
			lines = append(lines, "")
			continue
		}

		// For each line, wrap if needed without changing spacing
		for len(line) > width {
			// Try to find a space to break at
			breakPos := width
			for i := width - 1; i > width/2; i-- {
				if line[i] == ' ' {
					breakPos = i + 1 // Include the space at the end of the line
					break
				}
			}
			// If no space found, just break at width
			lines = append(lines, line[:breakPos])
			line = line[breakPos:]
			// Trim leading space from continuation if we broke at a space
			if len(line) > 0 && line[0] == ' ' {
				line = line[1:]
			}
		}
		if len(line) > 0 {
			lines = append(lines, line)
		}
	}

	if len(lines) == 0 {
		lines = append(lines, "")
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