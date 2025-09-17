package mcp

import (
	"encoding/json"
	"testing"
)

func TestProtocol_CreateRequest(t *testing.T) {
	p := NewProtocol()
	
	// Test creating a request
	req, err := p.CreateRequest("test_method", map[string]string{"key": "value"})
	if err != nil {
		t.Fatalf("Failed to create request: %v", err)
	}
	
	if req.JSONRPC != JSONRPCVersion {
		t.Errorf("Expected JSONRPC version %s, got %s", JSONRPCVersion, req.JSONRPC)
	}
	
	if req.Method != "test_method" {
		t.Errorf("Expected method test_method, got %s", req.Method)
	}
	
	if req.ID == nil {
		t.Error("Expected non-nil ID")
	}
	
	// Verify params
	var params map[string]string
	if err := json.Unmarshal(req.Params, &params); err != nil {
		t.Fatalf("Failed to unmarshal params: %v", err)
	}
	
	if params["key"] != "value" {
		t.Errorf("Expected params key=value, got %v", params)
	}
}

func TestProtocol_CreateNotification(t *testing.T) {
	p := NewProtocol()
	
	// Test creating a notification
	notif, err := p.CreateNotification("test_notification", map[string]int{"count": 42})
	if err != nil {
		t.Fatalf("Failed to create notification: %v", err)
	}
	
	if notif.JSONRPC != JSONRPCVersion {
		t.Errorf("Expected JSONRPC version %s, got %s", JSONRPCVersion, notif.JSONRPC)
	}
	
	if notif.Method != "test_notification" {
		t.Errorf("Expected method test_notification, got %s", notif.Method)
	}
	
	// Verify params
	var params map[string]int
	if err := json.Unmarshal(notif.Params, &params); err != nil {
		t.Fatalf("Failed to unmarshal params: %v", err)
	}
	
	if params["count"] != 42 {
		t.Errorf("Expected params count=42, got %v", params)
	}
}

func TestProtocol_HandleMessage_Request(t *testing.T) {
	p := NewProtocol()
	
	// Register a handler
	handlerCalled := false
	p.RegisterHandler("test", func(params json.RawMessage) (interface{}, error) {
		handlerCalled = true
		return map[string]string{"result": "success"}, nil
	})
	
	// Create a request message
	req := Request{
		JSONRPC: JSONRPCVersion,
		ID:      "test-id",
		Method:  "test",
		Params:  json.RawMessage(`{"foo": "bar"}`),
	}
	
	reqBytes, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("Failed to marshal request: %v", err)
	}
	
	// Handle the message
	response, err := p.HandleMessage(reqBytes)
	if err != nil {
		t.Fatalf("Failed to handle message: %v", err)
	}
	
	if !handlerCalled {
		t.Error("Handler was not called")
	}
	
	// Parse response
	var resp Response
	if err := json.Unmarshal(response, &resp); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}
	
	if resp.ID != "test-id" {
		t.Errorf("Expected ID test-id, got %v", resp.ID)
	}
	
	if resp.Error != nil {
		t.Errorf("Expected no error, got %v", resp.Error)
	}
	
	// Check result
	var result map[string]string
	if err := json.Unmarshal(resp.Result, &result); err != nil {
		t.Fatalf("Failed to unmarshal result: %v", err)
	}
	
	if result["result"] != "success" {
		t.Errorf("Expected result success, got %v", result)
	}
}

func TestProtocol_HandleMessage_MethodNotFound(t *testing.T) {
	p := NewProtocol()
	
	// Create a request for non-existent method
	req := Request{
		JSONRPC: JSONRPCVersion,
		ID:      123,
		Method:  "nonexistent",
	}
	
	reqBytes, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("Failed to marshal request: %v", err)
	}
	
	// Handle the message
	response, err := p.HandleMessage(reqBytes)
	if err != nil {
		t.Fatalf("Failed to handle message: %v", err)
	}
	
	// Parse response
	var resp Response
	if err := json.Unmarshal(response, &resp); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}
	
	if resp.Error == nil {
		t.Fatal("Expected error response")
	}
	
	if resp.Error.Code != MethodNotFound {
		t.Errorf("Expected error code %d, got %d", MethodNotFound, resp.Error.Code)
	}
}

func TestProtocol_HandleMessage_Notification(t *testing.T) {
	p := NewProtocol()
	
	// Register a handler
	// Note: For notifications, handlers are called asynchronously
	// so we don't track if it was called in this test
	p.RegisterHandler("test_notif", func(params json.RawMessage) (interface{}, error) {
		return nil, nil
	})
	
	// Create a notification message (no ID)
	notif := Notification{
		JSONRPC: JSONRPCVersion,
		Method:  "test_notif",
		Params:  json.RawMessage(`{"data": "test"}`),
	}
	
	notifBytes, err := json.Marshal(notif)
	if err != nil {
		t.Fatalf("Failed to marshal notification: %v", err)
	}
	
	// Handle the message
	response, err := p.HandleMessage(notifBytes)
	if err != nil {
		t.Fatalf("Failed to handle message: %v", err)
	}
	
	// Notifications should not generate a response
	if response != nil {
		t.Errorf("Expected no response for notification, got %v", response)
	}
	
	// Give the async handler time to run
	// In production, notifications are handled asynchronously
	// For testing, we'd need a better synchronization mechanism
	// but this is sufficient for basic testing
}

func TestProtocol_PendingRequests(t *testing.T) {
	p := NewProtocol()
	
	// Register a pending request
	ch := p.RegisterPendingRequest("test-req-1")
	
	// Simulate receiving a response
	resp := &Response{
		JSONRPC: JSONRPCVersion,
		ID:      "test-req-1",
		Result:  json.RawMessage(`{"status": "ok"}`),
	}
	
	respBytes, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("Failed to marshal response: %v", err)
	}
	
	// Handle the response
	_, _ = p.HandleMessage(respBytes)
	
	// Check if we received the response
	select {
	case received := <-ch:
		if received.ID != "test-req-1" {
			t.Errorf("Expected response ID test-req-1, got %v", received.ID)
		}
	default:
		t.Error("Expected to receive response on channel")
	}
	
	// Clean up
	p.UnregisterPendingRequest("test-req-1")
}