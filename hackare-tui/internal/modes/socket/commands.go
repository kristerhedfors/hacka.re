package socket

import (
	"fmt"
	"sort"
	"strings"
)

// Command represents a slash command
type Command struct {
	Name        string
	Aliases     []string
	Description string
	Usage       string
	Handler     func(args string, ctx *Context) error
	SubCommands map[string]*Command
}

// CommandRegistry manages all available commands
type CommandRegistry struct {
	commands map[string]*Command
	aliases  map[string]string
}

// NewCommandRegistry creates a new command registry
func NewCommandRegistry() *CommandRegistry {
	return &CommandRegistry{
		commands: make(map[string]*Command),
		aliases:  make(map[string]string),
	}
}

// Register adds a command to the registry
func (r *CommandRegistry) Register(cmd *Command) {
	r.commands[cmd.Name] = cmd

	// Register aliases
	for _, alias := range cmd.Aliases {
		r.aliases[alias] = cmd.Name
	}
}

// Get retrieves a command by name or alias
func (r *CommandRegistry) Get(name string) *Command {
	// Check direct command
	if cmd, ok := r.commands[name]; ok {
		return cmd
	}

	// Check alias
	if actualName, ok := r.aliases[name]; ok {
		return r.commands[actualName]
	}

	return nil
}

// Autocomplete returns matching commands for a prefix
func (r *CommandRegistry) Autocomplete(prefix string) []string {
	var matches []string

	// Check commands
	for name := range r.commands {
		if strings.HasPrefix(name, prefix) {
			matches = append(matches, name)
		}
	}

	// Check aliases
	for alias, cmdName := range r.aliases {
		if strings.HasPrefix(alias, prefix) {
			// Add the actual command name if not already added
			found := false
			for _, m := range matches {
				if m == cmdName {
					found = true
					break
				}
			}
			if !found {
				matches = append(matches, cmdName)
			}
		}
	}

	sort.Strings(matches)
	return matches
}

// GetHelp returns formatted help text
func (r *CommandRegistry) GetHelp() string {
	var lines []string
	lines = append(lines, "Available Commands:")
	lines = append(lines, "")

	// Sort commands by name
	var names []string
	for name := range r.commands {
		names = append(names, name)
	}
	sort.Strings(names)

	// Format each command
	for _, name := range names {
		cmd := r.commands[name]

		// Build command line with aliases
		cmdLine := fmt.Sprintf("  /%s", name)
		if len(cmd.Aliases) > 0 {
			aliasStr := strings.Join(cmd.Aliases, ", /")
			cmdLine += fmt.Sprintf(" (/%s)", aliasStr)
		}

		// Add description
		cmdLine += fmt.Sprintf(" - %s", cmd.Description)
		lines = append(lines, cmdLine)

		// Add usage if specified
		if cmd.Usage != "" {
			lines = append(lines, fmt.Sprintf("    Usage: %s", cmd.Usage))
		}
	}

	lines = append(lines, "")
	lines = append(lines, "Type '/' followed by command name. Use Tab for autocomplete.")

	return strings.Join(lines, "\n")
}

// RegisterDefaultCommands sets up the standard command set
func RegisterDefaultCommands(r *CommandRegistry, ctx *Context) {
	// Chat command
	r.Register(&Command{
		Name:        "chat",
		Aliases:     []string{"c", "say"},
		Description: "Send a chat message",
		Usage:       "/chat <message>",
		Handler: func(args string, ctx *Context) error {
			if args == "" {
				return fmt.Errorf("message required")
			}
			return ctx.SendMessage(args)
		},
	})

	// Settings command
	r.Register(&Command{
		Name:        "settings",
		Aliases:     []string{"s", "set", "config"},
		Description: "Configure settings",
		Usage:       "/settings [setting] [value]",
		Handler: func(args string, ctx *Context) error {
			return ctx.ShowSettings(args)
		},
	})

	// Prompts command
	r.Register(&Command{
		Name:        "prompts",
		Aliases:     []string{"p", "prompt"},
		Description: "Manage system prompts",
		Usage:       "/prompts [list|add|edit|delete]",
		Handler: func(args string, ctx *Context) error {
			return ctx.ShowPrompts(args)
		},
	})

	// Functions command
	r.Register(&Command{
		Name:        "functions",
		Aliases:     []string{"f", "func", "fn"},
		Description: "Manage functions",
		Usage:       "/functions [list|add|edit|delete|enable|disable]",
		Handler: func(args string, ctx *Context) error {
			return ctx.ShowFunctions(args)
		},
	})

	// MCP command
	r.Register(&Command{
		Name:        "mcp",
		Aliases:     []string{"m"},
		Description: "MCP server connections",
		Usage:       "/mcp [connect|disconnect|list]",
		Handler: func(args string, ctx *Context) error {
			return ctx.ShowMCP(args)
		},
	})

	// RAG command
	r.Register(&Command{
		Name:        "rag",
		Aliases:     []string{"r"},
		Description: "RAG configuration",
		Usage:       "/rag [enable|disable|configure]",
		Handler: func(args string, ctx *Context) error {
			return ctx.ShowRAG(args)
		},
	})

	// Share command
	r.Register(&Command{
		Name:        "share",
		Aliases:     []string{"sh"},
		Description: "Share configuration link",
		Usage:       "/share",
		Handler: func(args string, ctx *Context) error {
			return ctx.GenerateShareLink()
		},
	})

	// Clear command
	r.Register(&Command{
		Name:        "clear",
		Aliases:     []string{"cls"},
		Description: "Clear the screen",
		Handler: func(args string, ctx *Context) error {
			return ctx.ClearScreen()
		},
	})

	// History command
	r.Register(&Command{
		Name:        "history",
		Aliases:     []string{"h", "hist"},
		Description: "Show command history",
		Handler: func(args string, ctx *Context) error {
			return ctx.ShowHistory()
		},
	})

	// Mode command
	r.Register(&Command{
		Name:        "mode",
		Aliases:     []string{"ui"},
		Description: "Switch UI mode",
		Usage:       "/mode [rich|socket|auto]",
		Handler: func(args string, ctx *Context) error {
			return ctx.SwitchMode(args)
		},
	})

	// Status command
	r.Register(&Command{
		Name:        "status",
		Aliases:     []string{"st", "info"},
		Description: "Show connection and system status",
		Handler: func(args string, ctx *Context) error {
			return ctx.ShowStatus()
		},
	})

	// Help command
	r.Register(&Command{
		Name:        "help",
		Aliases:     []string{"?", "h"},
		Description: "Show this help message",
		Handler: func(args string, ctx *Context) error {
			help := r.GetHelp()
			ctx.Output(help)
			return nil
		},
	})

	// Exit command
	r.Register(&Command{
		Name:        "exit",
		Aliases:     []string{"quit", "q", "bye"},
		Description: "Exit the application",
		Handler: func(args string, ctx *Context) error {
			return ctx.Exit()
		},
	})

	// Reset command
	r.Register(&Command{
		Name:        "reset",
		Aliases:     []string{"restart"},
		Description: "Reset the chat session",
		Handler: func(args string, ctx *Context) error {
			return ctx.ResetSession()
		},
	})

	// Export command
	r.Register(&Command{
		Name:        "export",
		Aliases:     []string{"save"},
		Description: "Export chat history",
		Usage:       "/export [filename]",
		Handler: func(args string, ctx *Context) error {
			return ctx.ExportChat(args)
		},
	})
}