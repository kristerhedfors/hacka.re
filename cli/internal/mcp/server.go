package mcp

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"sync"

	"github.com/hacka-re/cli/internal/logger"
	"github.com/hacka-re/cli/internal/mcp/types"
)

// Server represents an MCP server
type Server struct {
	mu          sync.RWMutex
	name        string
	version     string
	protocol    *Protocol
	toolReg     *types.ToolRegistry
	prompts     map[string]*types.Prompt
	resources   map[string]*types.Resource
	initialised bool
	capabilities types.Capabilities
	systemPrompt string
}

// NewServer creates a new MCP server
func NewServer(name, version string) *Server {
	return &Server{
		name:      name,
		version:   version,
		protocol:  NewProtocol(),
		toolReg:   types.NewToolRegistry(),
		prompts:   make(map[string]*types.Prompt),
		resources: make(map[string]*types.Resource),
		capabilities: types.Capabilities{
			Tools:     &types.ToolsCapability{Supported: true},
			Resources: &types.ResourcesCapability{Supported: true},
			Prompts:   &types.PromptsCapability{Supported: true},
		},
	}
}

// SetSystemPrompt sets the system prompt for the server
func (s *Server) SetSystemPrompt(prompt string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.systemPrompt = prompt
}

// RegisterTool registers a tool with the server
func (s *Server) RegisterTool(tool *types.Tool, handler types.ToolHandler) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.toolReg.RegisterTool(tool, handler)
	logger.Get().Debug("[MCP Server] Registered tool: %s", tool.Name)
}

// RegisterPrompt registers a prompt with the server
func (s *Server) RegisterPrompt(prompt *types.Prompt) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.prompts[prompt.Name] = prompt
	logger.Get().Debug("[MCP Server] Registered prompt: %s", prompt.Name)
}

// RegisterResource registers a resource with the server
func (s *Server) RegisterResource(resource *types.Resource) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.resources[resource.URI] = resource
	logger.Get().Debug("[MCP Server] Registered resource: %s", resource.URI)
}

// Start starts the server and begins handling messages
func (s *Server) Start(reader io.Reader, writer io.Writer) error {
	logger.Get().Info("[MCP Server] Starting %s v%s", s.name, s.version)
	
	// Register protocol handlers
	s.registerHandlers()
	
	// Create buffered reader and writer
	bufReader := bufio.NewReader(reader)
	bufWriter := bufio.NewWriter(writer)
	
	// Main message loop
	for {
		// Read message (assume newline-delimited JSON)
		line, err := bufReader.ReadBytes('\n')
		if err != nil {
			if err == io.EOF {
				logger.Get().Info("[MCP Server] Connection closed")
				return nil
			}
			logger.Get().Error("[MCP Server] Read error: %v", err)
			return err
		}
		
		// Handle the message
		response, err := s.protocol.HandleMessage(line)
		if err != nil {
			logger.Get().Error("[MCP Server] Handle error: %v", err)
			continue
		}
		
		// Send response if there is one
		if response != nil {
			_, err = bufWriter.Write(response)
			if err != nil {
				logger.Get().Error("[MCP Server] Write error: %v", err)
				return err
			}
			_, err = bufWriter.Write([]byte("\n"))
			if err != nil {
				logger.Get().Error("[MCP Server] Write newline error: %v", err)
				return err
			}
			err = bufWriter.Flush()
			if err != nil {
				logger.Get().Error("[MCP Server] Flush error: %v", err)
				return err
			}
		}
	}
}

// registerHandlers registers all JSON-RPC method handlers
func (s *Server) registerHandlers() {
	// Initialize handler
	s.protocol.RegisterHandler("initialize", s.handleInitialize)
	
	// Tool handlers
	s.protocol.RegisterHandler("tools/list", s.handleListTools)
	s.protocol.RegisterHandler("tools/call", s.handleCallTool)
	
	// Resource handlers
	s.protocol.RegisterHandler("resources/list", s.handleListResources)
	s.protocol.RegisterHandler("resources/read", s.handleReadResource)
	
	// Prompt handlers
	s.protocol.RegisterHandler("prompts/list", s.handleListPrompts)
	s.protocol.RegisterHandler("prompts/get", s.handleGetPrompt)
	
	// Notification handlers
	s.protocol.RegisterHandler("notifications/initialized", s.handleInitialized)
}

// handleInitialize handles the initialize request
func (s *Server) handleInitialize(params json.RawMessage) (interface{}, error) {
	var req types.InitializeRequest
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, NewError(InvalidParams, "Invalid initialize parameters", nil)
	}
	
	logger.Get().Info("[MCP Server] Received initialize from %s v%s", req.ClientInfo.Name, req.ClientInfo.Version)
	
	s.mu.Lock()
	s.initialised = true
	s.mu.Unlock()
	
	return types.InitializeResponse{
		ProtocolVersion: MCPProtocolVersion,
		ServerInfo: types.ServerInfo{
			Name:    s.name,
			Version: s.version,
		},
		Capabilities: s.capabilities,
	}, nil
}

// handleInitialized handles the initialized notification
func (s *Server) handleInitialized(params json.RawMessage) (interface{}, error) {
	logger.Get().Info("[MCP Server] Client initialization complete")
	return nil, nil
}

// handleListTools handles the tools/list request
func (s *Server) handleListTools(params json.RawMessage) (interface{}, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	if !s.initialised {
		return nil, NewError(InvalidRequest, "Server not initialized", nil)
	}
	
	tools := s.toolReg.ListTools()
	logger.Get().Debug("[MCP Server] Listing %d tools", len(tools))
	
	return types.ListToolsResponse{
		Tools: tools,
	}, nil
}

// handleCallTool handles the tools/call request
func (s *Server) handleCallTool(params json.RawMessage) (interface{}, error) {
	var req types.CallToolRequest
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, NewError(InvalidParams, "Invalid tool call parameters", nil)
	}
	
	s.mu.RLock()
	if !s.initialised {
		s.mu.RUnlock()
		return nil, NewError(InvalidRequest, "Server not initialized", nil)
	}
	s.mu.RUnlock()
	
	logger.Get().Info("[MCP Server] Calling tool: %s", req.Name)
	
	content, err := s.toolReg.ExecuteTool(req.Name, req.Arguments)
	if err != nil {
		logger.Get().Error("[MCP Server] Tool execution failed: %v", err)
		return nil, NewError(InternalError, fmt.Sprintf("Tool execution failed: %v", err), nil)
	}
	
	return types.CallToolResponse{
		Content: content,
	}, nil
}

// handleListResources handles the resources/list request
func (s *Server) handleListResources(params json.RawMessage) (interface{}, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	if !s.initialised {
		return nil, NewError(InvalidRequest, "Server not initialized", nil)
	}
	
	resources := make([]types.Resource, 0, len(s.resources))
	for _, resource := range s.resources {
		resources = append(resources, *resource)
	}
	
	logger.Get().Debug("[MCP Server] Listing %d resources", len(resources))
	
	return types.ListResourcesResponse{
		Resources: resources,
	}, nil
}

// handleReadResource handles the resources/read request
func (s *Server) handleReadResource(params json.RawMessage) (interface{}, error) {
	var req types.ReadResourceRequest
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, NewError(InvalidParams, "Invalid resource read parameters", nil)
	}
	
	s.mu.RLock()
	if !s.initialised {
		s.mu.RUnlock()
		return nil, NewError(InvalidRequest, "Server not initialized", nil)
	}
	
	resource, exists := s.resources[req.URI]
	s.mu.RUnlock()
	
	if !exists {
		return nil, NewError(InvalidParams, fmt.Sprintf("Resource not found: %s", req.URI), nil)
	}
	
	// For now, return the resource description as text content
	// In a real implementation, this would read the actual resource
	return types.ReadResourceResponse{
		Content: []types.Content{
			{
				Type: "text",
				Text: resource.Description,
			},
		},
	}, nil
}

// handleListPrompts handles the prompts/list request
func (s *Server) handleListPrompts(params json.RawMessage) (interface{}, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	if !s.initialised {
		return nil, NewError(InvalidRequest, "Server not initialized", nil)
	}
	
	prompts := make([]types.Prompt, 0, len(s.prompts))
	for _, prompt := range s.prompts {
		prompts = append(prompts, *prompt)
	}
	
	logger.Get().Debug("[MCP Server] Listing %d prompts", len(prompts))
	
	return types.ListPromptsResponse{
		Prompts: prompts,
	}, nil
}

// handleGetPrompt handles the prompts/get request
func (s *Server) handleGetPrompt(params json.RawMessage) (interface{}, error) {
	var req types.GetPromptRequest
	if err := json.Unmarshal(params, &req); err != nil {
		return nil, NewError(InvalidParams, "Invalid prompt get parameters", nil)
	}
	
	s.mu.RLock()
	if !s.initialised {
		s.mu.RUnlock()
		return nil, NewError(InvalidRequest, "Server not initialized", nil)
	}
	
	prompt, exists := s.prompts[req.Name]
	systemPrompt := s.systemPrompt
	s.mu.RUnlock()
	
	if !exists {
		return nil, NewError(InvalidParams, fmt.Sprintf("Prompt not found: %s", req.Name), nil)
	}
	
	// Build the prompt content
	content := []types.Content{}
	
	// Add system prompt if configured
	if systemPrompt != "" {
		content = append(content, types.Content{
			Type: "text",
			Text: systemPrompt,
		})
	}
	
	// Add the prompt description
	if prompt.Description != "" {
		content = append(content, types.Content{
			Type: "text",
			Text: prompt.Description,
		})
	}
	
	return types.GetPromptResponse{
		Description: prompt.Description,
		Content:     content,
	}, nil
}