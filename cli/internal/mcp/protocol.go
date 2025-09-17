package mcp

import (
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
)

// JSON-RPC 2.0 Protocol Implementation for MCP

const (
	// JSONRPCVersion is the JSON-RPC version we support
	JSONRPCVersion = "2.0"
	
	// MCP Protocol version
	MCPProtocolVersion = "0.1.0"
)

// Error codes as per JSON-RPC 2.0 specification
const (
	ParseError     = -32700
	InvalidRequest = -32600
	MethodNotFound = -32601
	InvalidParams  = -32602
	InternalError  = -32603
)

// Request represents a JSON-RPC 2.0 request
type Request struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      interface{}     `json:"id,omitempty"`      // Can be string, number, or null
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

// Response represents a JSON-RPC 2.0 response
type Response struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      interface{}     `json:"id"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *Error          `json:"error,omitempty"`
}

// Notification represents a JSON-RPC 2.0 notification (no ID)
type Notification struct {
	JSONRPC string          `json:"jsonrpc"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

// Error represents a JSON-RPC 2.0 error
type Error struct {
	Code    int             `json:"code"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data,omitempty"`
}

// Error implements the error interface
func (e *Error) Error() string {
	return e.Message
}

// Protocol handles JSON-RPC 2.0 communication
type Protocol struct {
	mu            sync.RWMutex
	handlers      map[string]Handler
	requestID     atomic.Uint64
	pendingReqs   map[interface{}]chan *Response
	pendingMu     sync.RWMutex
}

// Handler is a function that processes a JSON-RPC request
type Handler func(params json.RawMessage) (interface{}, error)

// NewProtocol creates a new JSON-RPC protocol handler
func NewProtocol() *Protocol {
	return &Protocol{
		handlers:    make(map[string]Handler),
		pendingReqs: make(map[interface{}]chan *Response),
	}
}

// RegisterHandler registers a method handler
func (p *Protocol) RegisterHandler(method string, handler Handler) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.handlers[method] = handler
}

// CreateRequest creates a new JSON-RPC request with auto-generated ID
func (p *Protocol) CreateRequest(method string, params interface{}) (*Request, error) {
	var paramBytes json.RawMessage
	if params != nil {
		b, err := json.Marshal(params)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal params: %w", err)
		}
		paramBytes = b
	}
	
	return &Request{
		JSONRPC: JSONRPCVersion,
		ID:      p.requestID.Add(1),
		Method:  method,
		Params:  paramBytes,
	}, nil
}

// CreateNotification creates a JSON-RPC notification (no response expected)
func (p *Protocol) CreateNotification(method string, params interface{}) (*Notification, error) {
	var paramBytes json.RawMessage
	if params != nil {
		b, err := json.Marshal(params)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal params: %w", err)
		}
		paramBytes = b
	}
	
	return &Notification{
		JSONRPC: JSONRPCVersion,
		Method:  method,
		Params:  paramBytes,
	}, nil
}

// HandleMessage processes an incoming JSON-RPC message
func (p *Protocol) HandleMessage(data []byte) ([]byte, error) {
	// First check if it has an "id" field at all to distinguish request from notification
	var generic map[string]interface{}
	if err := json.Unmarshal(data, &generic); err == nil {
		// Check if this is a response (has id and result or error)
		if _, hasID := generic["id"]; hasID {
			if _, hasResult := generic["result"]; hasResult {
				// It's a response
				var resp Response
				if err := json.Unmarshal(data, &resp); err == nil {
					p.handleResponse(&resp)
					return nil, nil
				}
			} else if _, hasError := generic["error"]; hasError {
				// It's an error response
				var resp Response
				if err := json.Unmarshal(data, &resp); err == nil {
					p.handleResponse(&resp)
					return nil, nil
				}
			} else if _, hasMethod := generic["method"]; hasMethod {
				// It's a request (has id and method)
				var req Request
				if err := json.Unmarshal(data, &req); err == nil {
					return p.handleRequest(&req)
				}
			}
		} else if _, hasMethod := generic["method"]; hasMethod {
			// It's a notification (has method but no id)
			var notif Notification
			if err := json.Unmarshal(data, &notif); err == nil {
				p.handleNotification(&notif)
				return nil, nil
			}
		}
	}

	// Invalid message
	return p.createErrorResponse(nil, ParseError, "Parse error", nil)
}

// handleRequest processes a JSON-RPC request
func (p *Protocol) handleRequest(req *Request) ([]byte, error) {
	// Validate JSON-RPC version
	if req.JSONRPC != JSONRPCVersion {
		return p.createErrorResponse(req.ID, InvalidRequest, "Invalid JSON-RPC version", nil)
	}
	
	// Look up handler
	p.mu.RLock()
	handler, exists := p.handlers[req.Method]
	p.mu.RUnlock()
	
	if !exists {
		return p.createErrorResponse(req.ID, MethodNotFound, fmt.Sprintf("Method not found: %s", req.Method), nil)
	}
	
	// Execute handler
	result, err := handler(req.Params)
	if err != nil {
		// Check if it's already a JSON-RPC error
		var rpcErr *Error
		if errors.As(err, &rpcErr) {
			return p.createErrorResponse(req.ID, rpcErr.Code, rpcErr.Message, rpcErr.Data)
		}
		return p.createErrorResponse(req.ID, InternalError, err.Error(), nil)
	}
	
	// Create success response
	resultBytes, err := json.Marshal(result)
	if err != nil {
		return p.createErrorResponse(req.ID, InternalError, "Failed to marshal result", nil)
	}
	
	resp := Response{
		JSONRPC: JSONRPCVersion,
		ID:      req.ID,
		Result:  resultBytes,
	}
	
	return json.Marshal(resp)
}

// handleResponse processes a JSON-RPC response
func (p *Protocol) handleResponse(resp *Response) {
	p.pendingMu.Lock()
	ch, exists := p.pendingReqs[resp.ID]
	if exists {
		delete(p.pendingReqs, resp.ID)
	}
	p.pendingMu.Unlock()
	
	if exists && ch != nil {
		select {
		case ch <- resp:
		default:
			// Channel might be closed or full
		}
	}
}

// handleNotification processes a JSON-RPC notification
func (p *Protocol) handleNotification(notif *Notification) {
	// Look up handler
	p.mu.RLock()
	handler, exists := p.handlers[notif.Method]
	p.mu.RUnlock()
	
	if exists {
		// Execute handler in goroutine since we don't need to send response
		go func() {
			_, _ = handler(notif.Params)
		}()
	}
}

// createErrorResponse creates a JSON-RPC error response
func (p *Protocol) createErrorResponse(id interface{}, code int, message string, data json.RawMessage) ([]byte, error) {
	resp := Response{
		JSONRPC: JSONRPCVersion,
		ID:      id,
		Error: &Error{
			Code:    code,
			Message: message,
			Data:    data,
		},
	}
	return json.Marshal(resp)
}

// RegisterPendingRequest registers a pending request for response tracking
func (p *Protocol) RegisterPendingRequest(id interface{}) chan *Response {
	ch := make(chan *Response, 1)
	p.pendingMu.Lock()
	p.pendingReqs[id] = ch
	p.pendingMu.Unlock()
	return ch
}

// UnregisterPendingRequest removes a pending request
func (p *Protocol) UnregisterPendingRequest(id interface{}) {
	p.pendingMu.Lock()
	delete(p.pendingReqs, id)
	p.pendingMu.Unlock()
}

// NewError creates a new JSON-RPC error
func NewError(code int, message string, data interface{}) *Error {
	var dataBytes json.RawMessage
	if data != nil {
		b, _ := json.Marshal(data)
		dataBytes = b
	}
	return &Error{
		Code:    code,
		Message: message,
		Data:    dataBytes,
	}
}