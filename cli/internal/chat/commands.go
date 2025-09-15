package chat

import (
	"fmt"
	"sort"
	"strings"
)

// Command represents a slash command
type Command struct {
	Name        string   // Full command name (e.g., "settings")
	Aliases     []string // Short aliases (e.g., ["s"])
	Description string   // Help text
	Handler     func() error // Function to execute
}

// CommandRegistry manages available commands
type CommandRegistry struct {
	commands map[string]*Command
	aliases  map[string]string // alias -> command name
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
	for _, alias := range cmd.Aliases {
		r.aliases[alias] = cmd.Name
	}
}

// Autocomplete returns the best matching command for the given input
func (r *CommandRegistry) Autocomplete(input string) (string, *Command) {
	// Remove leading slash if present
	input = strings.TrimPrefix(input, "/")
	if input == "" {
		return "", nil
	}

	// Check for exact command match
	if cmd, ok := r.commands[input]; ok {
		return "/" + input, cmd
	}

	// Check for exact alias match
	if cmdName, ok := r.aliases[input]; ok {
		return "/" + cmdName, r.commands[cmdName]
	}

	// Find commands that start with the input
	var matches []string
	for name := range r.commands {
		if strings.HasPrefix(name, input) {
			matches = append(matches, name)
		}
	}

	// Also check aliases
	for alias, cmdName := range r.aliases {
		if strings.HasPrefix(alias, input) {
			// Add the full command name if not already in matches
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

	// If exactly one match, return it
	if len(matches) == 1 {
		return "/" + matches[0], r.commands[matches[0]]
	}

	// If multiple matches, return the shortest one (most likely what user wants)
	if len(matches) > 1 {
		sort.Slice(matches, func(i, j int) bool {
			return len(matches[i]) < len(matches[j])
		})
		return "/" + matches[0], r.commands[matches[0]]
	}

	return "", nil
}

// GetCommand returns a command by exact name or alias
func (r *CommandRegistry) GetCommand(input string) *Command {
	// Remove leading slash if present
	input = strings.TrimPrefix(input, "/")

	// Check for exact command match
	if cmd, ok := r.commands[input]; ok {
		return cmd
	}

	// Check for alias match
	if cmdName, ok := r.aliases[input]; ok {
		return r.commands[cmdName]
	}

	return nil
}

// GetSuggestions returns all commands that could match the input
func (r *CommandRegistry) GetSuggestions(input string) []string {
	// Remove leading slash if present
	input = strings.TrimPrefix(input, "/")

	var suggestions []string

	// If empty input, show all commands
	if input == "" {
		for name := range r.commands {
			suggestions = append(suggestions, "/"+name)
		}
		sort.Strings(suggestions)
		return suggestions
	}

	// Find all matching commands
	for name := range r.commands {
		if strings.HasPrefix(name, input) {
			suggestions = append(suggestions, "/"+name)
		}
	}

	// Find all matching aliases
	for alias, cmdName := range r.aliases {
		if strings.HasPrefix(alias, input) {
			fullCmd := "/" + cmdName
			// Check if not already added
			found := false
			for _, s := range suggestions {
				if s == fullCmd {
					found = true
					break
				}
			}
			if !found {
				suggestions = append(suggestions, fullCmd+" ("+alias+")")
			}
		}
	}

	sort.Strings(suggestions)
	return suggestions
}

// GetHelp returns formatted help text for all commands
func (r *CommandRegistry) GetHelp() string {
	var help strings.Builder
	help.WriteString("Available commands:\n\n")

	// Sort commands by name
	var names []string
	for name := range r.commands {
		names = append(names, name)
	}
	sort.Strings(names)

	// Display each command
	for _, name := range names {
		cmd := r.commands[name]

		// Format: /command (alias) - description
		help.WriteString(fmt.Sprintf("  /%s", name))

		if len(cmd.Aliases) > 0 {
			aliasStr := strings.Join(cmd.Aliases, ", ")
			help.WriteString(fmt.Sprintf(" (%s)", aliasStr))
		}

		help.WriteString(fmt.Sprintf(" - %s\n", cmd.Description))
	}

	help.WriteString("\nType '/' followed by command name or alias. Commands autocomplete on Tab or Enter.")

	return help.String()
}

// IsCommand checks if the input is a command
func IsCommand(input string) bool {
	return strings.HasPrefix(strings.TrimSpace(input), "/")
}

// ParseCommand extracts command and arguments from input
func ParseCommand(input string) (string, string) {
	input = strings.TrimSpace(input)
	if !strings.HasPrefix(input, "/") {
		return "", input
	}

	parts := strings.SplitN(input, " ", 2)
	cmd := strings.TrimPrefix(parts[0], "/")
	args := ""
	if len(parts) > 1 {
		args = parts[1]
	}

	return cmd, args
}