package logger

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"
)

// Logger provides debug logging functionality
type Logger struct {
	file     *os.File
	logger   *log.Logger
	mu       sync.Mutex
	enabled  bool
	logLevel LogLevel
}

// LogLevel represents the severity of a log message
type LogLevel int

const (
	DEBUG LogLevel = iota
	INFO
	WARN
	ERROR
)

var (
	instance *Logger
	once     sync.Once
)

// Initialize sets up the logger singleton
func Initialize(logDir string, enabled bool) error {
	var initErr error
	once.Do(func() {
		if !enabled {
			instance = &Logger{enabled: false}
			return
		}

		// Create log directory if it doesn't exist
		if err := os.MkdirAll(logDir, 0755); err != nil {
			initErr = err
			return
		}

		// Create log file with timestamp
		timestamp := time.Now().Format("2006-01-02_15-04-05")
		logPath := filepath.Join(logDir, fmt.Sprintf("debug_%s.log", timestamp))
		
		file, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err != nil {
			initErr = err
			return
		}

		instance = &Logger{
			file:     file,
			logger:   log.New(file, "", 0),
			enabled:  true,
			logLevel: DEBUG,
		}

		instance.Info("=== Logger initialized ===")
		instance.Info("Log file: %s", logPath)
	})
	
	return initErr
}

// Get returns the logger instance
func Get() *Logger {
	if instance == nil {
		// Create a no-op logger if not initialized
		return &Logger{enabled: false}
	}
	return instance
}

// Close closes the log file
func (l *Logger) Close() {
	if l.file != nil {
		l.file.Close()
	}
}

// log writes a message to the log file
func (l *Logger) log(level LogLevel, format string, args ...interface{}) {
	if !l.enabled || level < l.logLevel {
		return
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	// Get caller information
	_, file, line, _ := runtime.Caller(2)
	file = filepath.Base(file)

	// Format timestamp
	timestamp := time.Now().Format("15:04:05.000")
	
	// Format level
	levelStr := ""
	switch level {
	case DEBUG:
		levelStr = "DEBUG"
	case INFO:
		levelStr = "INFO "
	case WARN:
		levelStr = "WARN "
	case ERROR:
		levelStr = "ERROR"
	}

	// Format message
	msg := fmt.Sprintf(format, args...)
	
	// Write to log
	l.logger.Printf("[%s] %s [%s:%d] %s", timestamp, levelStr, file, line, msg)
}

// Debug logs a debug message
func (l *Logger) Debug(format string, args ...interface{}) {
	l.log(DEBUG, format, args...)
}

// Info logs an info message
func (l *Logger) Info(format string, args ...interface{}) {
	l.log(INFO, format, args...)
}

// Warn logs a warning message
func (l *Logger) Warn(format string, args ...interface{}) {
	l.log(WARN, format, args...)
}

// Error logs an error message
func (l *Logger) Error(format string, args ...interface{}) {
	l.log(ERROR, format, args...)
}

// KeyEvent logs keyboard events for debugging
func (l *Logger) KeyEvent(key string, modifiers string, context string) {
	l.Debug("KeyEvent: key=%s, mods=%s, context=%s", key, modifiers, context)
}

// StateChange logs UI state changes
func (l *Logger) StateChange(component string, oldState string, newState string) {
	l.Debug("StateChange: %s: %s -> %s", component, oldState, newState)
}

// MenuAction logs menu actions
func (l *Logger) MenuAction(menu string, action string, details string) {
	l.Debug("MenuAction: menu=%s, action=%s, details=%s", menu, action, details)
}