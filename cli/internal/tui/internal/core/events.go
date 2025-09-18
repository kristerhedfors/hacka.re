package core

import (
	"sync"
)

// EventType represents the type of event
type EventType string

const (
	// UI Events
	EventModeChange     EventType = "mode_change"
	EventPanelChange    EventType = "panel_change"
	EventModalOpen      EventType = "modal_open"
	EventModalClose     EventType = "modal_close"
	EventRedraw         EventType = "redraw"

	// Chat Events
	EventMessageAdded   EventType = "message_added"
	EventStreamStart    EventType = "stream_start"
	EventStreamData     EventType = "stream_data"
	EventStreamEnd      EventType = "stream_end"

	// Command Events
	EventCommandExecute EventType = "command_execute"
	EventCommandComplete EventType = "command_complete"
	EventCommandError   EventType = "command_error"

	// Connection Events
	EventConnected      EventType = "connected"
	EventDisconnected   EventType = "disconnected"
	EventReconnecting   EventType = "reconnecting"

	// Config Events
	EventConfigChanged  EventType = "config_changed"
	EventConfigSaved    EventType = "config_saved"

	// Function Events
	EventFunctionAdded  EventType = "function_added"
	EventFunctionRemoved EventType = "function_removed"
	EventFunctionExecute EventType = "function_execute"

	// Mouse Events
	EventMouseClick      EventType = "mouse_click"
	EventMouseDoubleClick EventType = "mouse_double_click"
	EventMouseDrag       EventType = "mouse_drag"
	EventMouseHover      EventType = "mouse_hover"
	EventMouseScroll     EventType = "mouse_scroll"
	EventMouseRelease    EventType = "mouse_release"
)

// Event represents an application event
type Event struct {
	Type     EventType
	Data     interface{}
	Source   string
	Error    error
}

// EventHandler is a function that handles events
type EventHandler func(Event)

// EventBus manages event distribution
type EventBus struct {
	mu        sync.RWMutex
	handlers  map[EventType][]EventHandler
	allHandlers []EventHandler
	queue     chan Event
	stop      chan struct{}
	wg        sync.WaitGroup
}

// NewEventBus creates a new event bus
func NewEventBus() *EventBus {
	eb := &EventBus{
		handlers:    make(map[EventType][]EventHandler),
		allHandlers: make([]EventHandler, 0),
		queue:       make(chan Event, 100),
		stop:        make(chan struct{}),
	}

	// Start event processor
	eb.wg.Add(1)
	go eb.processEvents()

	return eb
}

// Subscribe registers a handler for specific event types
func (eb *EventBus) Subscribe(eventType EventType, handler EventHandler) {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	if eb.handlers[eventType] == nil {
		eb.handlers[eventType] = make([]EventHandler, 0)
	}
	eb.handlers[eventType] = append(eb.handlers[eventType], handler)
}

// SubscribeAll registers a handler for all events
func (eb *EventBus) SubscribeAll(handler EventHandler) {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	eb.allHandlers = append(eb.allHandlers, handler)
}

// Publish sends an event to the bus
func (eb *EventBus) Publish(event Event) {
	select {
	case eb.queue <- event:
	default:
		// Queue is full, drop the event
		// In production, you might want to log this
	}
}

// PublishAsync sends an event asynchronously
func (eb *EventBus) PublishAsync(eventType EventType, data interface{}) {
	eb.Publish(Event{
		Type: eventType,
		Data: data,
	})
}

// processEvents handles event distribution
func (eb *EventBus) processEvents() {
	defer eb.wg.Done()

	for {
		select {
		case event := <-eb.queue:
			eb.distributeEvent(event)
		case <-eb.stop:
			return
		}
	}
}

// distributeEvent sends an event to all registered handlers
func (eb *EventBus) distributeEvent(event Event) {
	eb.mu.RLock()
	defer eb.mu.RUnlock()

	// Send to specific handlers
	if handlers, ok := eb.handlers[event.Type]; ok {
		for _, handler := range handlers {
			// Call handler in goroutine to prevent blocking
			go func(h EventHandler) {
				defer func() {
					// Recover from panic in handler
					if r := recover(); r != nil {
						// Log the panic
					}
				}()
				h(event)
			}(handler)
		}
	}

	// Send to all-event handlers
	for _, handler := range eb.allHandlers {
		go func(h EventHandler) {
			defer func() {
				if r := recover(); r != nil {
					// Log the panic
				}
			}()
			h(event)
		}(handler)
	}
}

// Stop shuts down the event bus
func (eb *EventBus) Stop() {
	close(eb.stop)
	eb.wg.Wait()
	close(eb.queue)
}

// EventLogger is a simple event logger for debugging
type EventLogger struct {
	enabled bool
}

// NewEventLogger creates a new event logger
func NewEventLogger(enabled bool) *EventLogger {
	return &EventLogger{enabled: enabled}
}

// LogEvent logs an event (implementation would write to file/stdout)
func (el *EventLogger) LogEvent(event Event) {
	if !el.enabled {
		return
	}
	// In production, this would write to a log file
	// For now, we'll just have the structure
}