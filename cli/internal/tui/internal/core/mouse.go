package core

import (
	"time"

	"github.com/gdamore/tcell/v2"
)

// MouseButton represents mouse button types
type MouseButton int

const (
	MouseButtonNone MouseButton = iota
	MouseButtonLeft
	MouseButtonMiddle
	MouseButtonRight
	MouseWheelUp
	MouseWheelDown
)

// MouseEventType represents the type of mouse event
type MouseEventType int

const (
	MouseEventClick MouseEventType = iota
	MouseEventDoubleClick
	MouseEventDrag
	MouseEventHover
	MouseEventScroll
	MouseEventRelease
)

// MouseEvent represents a processed mouse event
type MouseEvent struct {
	Type      MouseEventType
	Button    MouseButton
	X, Y      int
	Modifiers tcell.ModMask
	Timestamp time.Time
}

// MouseManager handles mouse event processing and state tracking
type MouseManager struct {
	// State tracking
	lastClickTime   time.Time
	lastClickX      int
	lastClickY      int
	lastButton      MouseButton
	isDragging      bool
	dragStartX      int
	dragStartY      int
	currentX        int
	currentY        int

	// Configuration
	doubleClickTime time.Duration
	dragThreshold   int
}

// NewMouseManager creates a new mouse manager
func NewMouseManager() *MouseManager {
	return &MouseManager{
		doubleClickTime: 500 * time.Millisecond,
		dragThreshold:   3, // pixels before drag is detected
		lastButton:      MouseButtonNone,
	}
}

// ProcessEvent processes a raw tcell mouse event and returns a processed MouseEvent
func (m *MouseManager) ProcessEvent(ev *tcell.EventMouse) *MouseEvent {
	x, y := ev.Position()
	buttons := ev.Buttons()
	modifiers := ev.Modifiers()
	now := time.Now()

	// Update current position
	m.currentX = x
	m.currentY = y

	// Determine button and event type
	button := m.detectButton(buttons)
	eventType := m.detectEventType(x, y, button, now)

	// Create processed event
	mouseEvent := &MouseEvent{
		Type:      eventType,
		Button:    button,
		X:         x,
		Y:         y,
		Modifiers: modifiers,
		Timestamp: now,
	}

	// Update state based on event
	m.updateState(mouseEvent)

	return mouseEvent
}

// detectButton determines which button is pressed
func (m *MouseManager) detectButton(buttons tcell.ButtonMask) MouseButton {
	switch {
	case buttons&tcell.Button1 != 0:
		return MouseButtonLeft
	case buttons&tcell.Button2 != 0:
		return MouseButtonMiddle
	case buttons&tcell.Button3 != 0:
		return MouseButtonRight
	case buttons&tcell.WheelUp != 0:
		return MouseWheelUp
	case buttons&tcell.WheelDown != 0:
		return MouseWheelDown
	default:
		return MouseButtonNone
	}
}

// detectEventType determines the type of mouse event
func (m *MouseManager) detectEventType(x, y int, button MouseButton, now time.Time) MouseEventType {
	// Handle wheel events
	if button == MouseWheelUp || button == MouseWheelDown {
		return MouseEventScroll
	}

	// Handle button release
	if button == MouseButtonNone && m.lastButton != MouseButtonNone {
		eventType := MouseEventRelease
		if m.isDragging {
			m.isDragging = false
		}
		return eventType
	}

	// Handle drag detection
	if button != MouseButtonNone && m.lastButton != MouseButtonNone {
		// Button is being held down
		if !m.isDragging {
			// Check if we've moved enough to start dragging
			dx := abs(x - m.dragStartX)
			dy := abs(y - m.dragStartY)
			if dx > m.dragThreshold || dy > m.dragThreshold {
				m.isDragging = true
				return MouseEventDrag
			}
			// Still within drag threshold, treat as continued click
			return MouseEventClick
		} else {
			// Continue dragging
			return MouseEventDrag
		}
	}

	// Handle click detection
	if button != MouseButtonNone && button != MouseWheelUp && button != MouseWheelDown {
		// Check for double click
		if m.lastClickTime != (time.Time{}) && // Check if we have a previous click
		   button == MouseButtonLeft && // Only for left button
		   x == m.lastClickX && y == m.lastClickY &&
		   now.Sub(m.lastClickTime) < m.doubleClickTime {
			return MouseEventDoubleClick
		}

		// Start potential drag
		m.dragStartX = x
		m.dragStartY = y

		return MouseEventClick
	}

	// Default to hover if no buttons pressed
	if button == MouseButtonNone {
		return MouseEventHover
	}

	return MouseEventClick
}

// updateState updates the mouse manager state after processing an event
func (m *MouseManager) updateState(event *MouseEvent) {
	switch event.Type {
	case MouseEventClick, MouseEventDoubleClick:
		m.lastClickTime = event.Timestamp
		m.lastClickX = event.X
		m.lastClickY = event.Y
		m.lastButton = event.Button

	case MouseEventRelease:
		m.lastButton = MouseButtonNone
		m.isDragging = false

	case MouseEventDrag:
		// Dragging state is already set in detectEventType

	case MouseEventHover:
		// No state update needed for hover
	}
}

// GetPosition returns the current mouse position
func (m *MouseManager) GetPosition() (int, int) {
	return m.currentX, m.currentY
}

// IsDragging returns whether the mouse is currently dragging
func (m *MouseManager) IsDragging() bool {
	return m.isDragging
}

// GetDragDelta returns the distance dragged from the start position
func (m *MouseManager) GetDragDelta() (int, int) {
	if !m.isDragging {
		return 0, 0
	}
	return m.currentX - m.dragStartX, m.currentY - m.dragStartY
}

// SetDoubleClickTime sets the maximum time between clicks for double-click detection
func (m *MouseManager) SetDoubleClickTime(duration time.Duration) {
	m.doubleClickTime = duration
}

// SetDragThreshold sets the minimum distance before drag is detected
func (m *MouseManager) SetDragThreshold(pixels int) {
	m.dragThreshold = pixels
}

// Reset resets the mouse manager state
func (m *MouseManager) Reset() {
	m.lastButton = MouseButtonNone
	m.isDragging = false
	m.lastClickTime = time.Time{}
}

// Helper function for absolute value
func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}

// IsWithinBounds checks if coordinates are within a rectangular area
func IsWithinBounds(x, y, areaX, areaY, areaWidth, areaHeight int) bool {
	return x >= areaX && x < areaX+areaWidth &&
	       y >= areaY && y < areaY+areaHeight
}

// ComponentHitTest is a helper for components to test if mouse is over them
type ComponentHitTest struct {
	X, Y          int
	Width, Height int
}

// NewComponentHitTest creates a new hit test area
func NewComponentHitTest(x, y, width, height int) *ComponentHitTest {
	return &ComponentHitTest{
		X:      x,
		Y:      y,
		Width:  width,
		Height: height,
	}
}

// Contains checks if the given coordinates are within this component
func (c *ComponentHitTest) Contains(x, y int) bool {
	return IsWithinBounds(x, y, c.X, c.Y, c.Width, c.Height)
}

// ContainsEvent checks if a mouse event is within this component
func (c *ComponentHitTest) ContainsEvent(event *MouseEvent) bool {
	return c.Contains(event.X, event.Y)
}