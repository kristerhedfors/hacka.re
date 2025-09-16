# Changelog

All notable changes to the hacka.re Terminal UI project will be documented in this file.

## [2.0.0] - 2024-XX-XX

### Added - Library Interface

- **NEW: Library Package** - hackare-tui is now available as a Go library
  - `pkg/tui/` - Public API for external integration
  - `pkg/interfaces/` - Configuration interfaces for external systems
  - `LaunchTUI()` function for embedding TUI in other applications

- **Configuration Adapter System**
  - `internal/adapters/` - Adapts external configurations to internal format
  - Support for `ExternalConfig` interface
  - Support for `CLIConfig` interface for CLI compatibility
  - Automatic config field mapping and validation

- **Callback System**
  - Complete callback interface for parent application integration
  - Support for chat, browse, serve, share, save, load, and exit callbacks
  - State management for external callback storage

- **Enhanced Core Architecture**
  - Extended `AppState` with callback support
  - Added `ConfigManager.GetConfigPath()` for external access
  - Enhanced event logging system with `EventLogger`
  - Support for custom config paths via `NewConfigManagerWithPath()`

- **Rich TUI Mode Enhancements**
  - `NewAppWithCallbacks()` constructor for external integration
  - Callback integration in menu handlers
  - Enhanced main menu with better callback support

- **Socket Mode Enhancements**
  - `NewHandlerWithCallbacks()` constructor for external integration
  - Callback system integration for command handlers

### Testing

- Comprehensive test suite for library interface
  - `pkg/tui/launcher_test.go` - Tests for main API
  - `internal/adapters/config_adapter_test.go` - Tests for config adaptation
  - Mock implementations for `ExternalConfig` and `CLIConfig`
  - Config persistence and validation tests

### Documentation

- Updated README.md with library usage examples
- Added complete API documentation
- Configuration interface documentation
- Integration examples for external applications

### Architecture Improvements

- Clean separation between public API and internal implementation
- Modular design allows external configuration injection
- Event-driven architecture with callback support
- No circular dependencies between packages

## [1.0.0] - Previous Release

### Initial Features

- Dual-mode terminal UI (rich TUI and socket mode)
- Terminal capability detection
- Command system with autocomplete
- Configuration management
- Event-driven architecture
- Socket mode protocol for basic terminals

---

## Migration Guide for CLI Integration

To integrate hackare-tui into the hacka.re CLI:

1. **Add Dependency**
   ```bash
   go get github.com/hacka-re/tui
   ```

2. **Implement Config Interface**
   ```go
   // Make your CLI config implement interfaces.CLIConfig
   func (c *config.Config) GetProvider() string { return string(c.Provider) }
   // ... implement other methods
   ```

3. **Create Integration Layer**
   ```go
   import "github.com/hacka-re/tui/pkg/tui"

   callbacks := &tui.Callbacks{
       OnStartChat: func(cfg interface{}) error {
           return chat.StartChat(cliConfig)
       },
       // ... other callbacks
   }

   options := &tui.LaunchOptions{
       Mode: "auto",
       Config: cliConfig,
       Callbacks: callbacks,
   }

   return tui.LaunchTUI(options)
   ```

4. **Replace UI Calls**
   ```go
   // OLD: ui.ShowMainMenu(cfg)
   // NEW: tui.LaunchTUI(options)
   ```

This release enables the hacka.re CLI to completely replace its existing UI system with hackare-tui while maintaining full compatibility and adding new capabilities.