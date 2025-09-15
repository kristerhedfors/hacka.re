package web

import (
	"archive/zip"
	"bytes"
	"context"
	_ "embed"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"strings"
	"time"
)

// Embed the release ZIP file at compile time
//
//go:embed hacka.re-release.zip
var embeddedZip []byte

// Server represents the base web server
type Server struct {
	port    int
	host    string
	server  *http.Server
	verbose int
}

// ZipServer serves files from an embedded ZIP archive
type ZipServer struct {
	*Server
	zipReader *zip.Reader
	files     map[string]*zip.File
}

// NewZipServer creates a server that serves from embedded ZIP
func NewZipServer(host string, port int, verbose int) (*ZipServer, error) {
	// Create a reader for the embedded ZIP
	reader := bytes.NewReader(embeddedZip)
	zipReader, err := zip.NewReader(reader, int64(len(embeddedZip)))
	if err != nil {
		return nil, fmt.Errorf("failed to open embedded ZIP: %w", err)
	}
	
	// Build a map of files for quick lookup
	files := make(map[string]*zip.File)
	for _, file := range zipReader.File {
		// Normalize the path (remove leading slash if present)
		normalizedPath := strings.TrimPrefix(file.Name, "/")
		files[normalizedPath] = file
		
		// Also store without trailing slash for directories
		if strings.HasSuffix(normalizedPath, "/") {
			files[strings.TrimSuffix(normalizedPath, "/")] = file
		}
	}
	
	return &ZipServer{
		Server: &Server{
			host:    host,
			port:    port,
			verbose: verbose,
		},
		zipReader: zipReader,
		files:     files,
	}, nil
}

// Start starts the ZIP-based web server
func (s *ZipServer) Start() error {
	// Create HTTP handler
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Log request if verbose
		if s.verbose >= 1 {
			fmt.Printf("[%s] %s %s from %s\n",
				time.Now().Format("15:04:05"),
				r.Method,
				r.URL.Path,
				r.RemoteAddr)
			
			if s.verbose >= 2 {
				fmt.Println("  Headers:")
				for name, values := range r.Header {
					for _, value := range values {
						fmt.Printf("    %s: %s\n", name, value)
					}
				}
				if r.URL.RawQuery != "" {
					fmt.Printf("  Query: %s\n", r.URL.RawQuery)
				}
			}
		}
		
		// Clean and normalize the path
		urlPath := r.URL.Path
		if urlPath == "/" {
			urlPath = "/index.html"
		}
		urlPath = strings.TrimPrefix(urlPath, "/")
		
		// Try to find the file in the ZIP
		file, exists := s.files[urlPath]
		if !exists {
			// Try adding index.html for directory paths
			indexPath := path.Join(urlPath, "index.html")
			file, exists = s.files[indexPath]
			if !exists {
				http.NotFound(w, r)
				return
			}
			urlPath = indexPath
		}
		
		// Check if it's a directory
		if file.FileInfo().IsDir() {
			// Try index.html in the directory
			indexPath := path.Join(urlPath, "index.html")
			file, exists = s.files[indexPath]
			if !exists {
				http.NotFound(w, r)
				return
			}
			urlPath = indexPath
		}
		
		// Open the file from ZIP
		rc, err := file.Open()
		if err != nil {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}
		defer rc.Close()
		
		// Set content type
		w.Header().Set("Content-Type", getContentType(urlPath))
		
		// Set content length if available
		w.Header().Set("Content-Length", fmt.Sprintf("%d", file.UncompressedSize64))
		
		// Copy the file content to response
		_, err = io.Copy(w, rc)
		if err != nil {
			// Connection probably closed by client
			return
		}
	})
	
	// Use the base server's start logic
	s.Server.server = &http.Server{
		Handler:      handler,
		Addr:        fmt.Sprintf("%s:%d", s.host, s.port),
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}
	
	fmt.Printf("Starting web server on http://%s:%d\n", s.host, s.port)
	fmt.Println("Press Ctrl+C to stop the server")
	
	return s.Server.server.ListenAndServe()
}

// Stop gracefully stops the web server
func (s *ZipServer) Stop() error {
	if s.Server.server == nil {
		return nil
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	return s.Server.server.Shutdown(ctx)
}

// GetURL returns the server URL
func (s *ZipServer) GetURL() string {
	return fmt.Sprintf("http://%s:%d", s.host, s.port)
}

// GetPort returns the actual port being used
func (s *ZipServer) GetPort() int {
	return s.port
}

// getContentType returns the appropriate content-type for a file
func getContentType(filename string) string {
	ext := strings.ToLower(path.Ext(filename))
	switch ext {
	case ".html":
		return "text/html; charset=utf-8"
	case ".js":
		return "application/javascript; charset=utf-8"
	case ".css":
		return "text/css; charset=utf-8"
	case ".json":
		return "application/json; charset=utf-8"
	case ".svg":
		return "image/svg+xml"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".ico":
		return "image/x-icon"
	case ".woff":
		return "font/woff"
	case ".woff2":
		return "font/woff2"
	case ".ttf":
		return "font/ttf"
	case ".md":
		return "text/markdown; charset=utf-8"
	default:
		return "application/octet-stream"
	}
}

// GetPortFromEnv gets the port from environment variable or returns default
func GetPortFromEnv(defaultPort int) int {
	if portStr := os.Getenv("HACKARE_WEB_PORT"); portStr != "" {
		var port int
		if _, err := fmt.Sscanf(portStr, "%d", &port); err == nil && port > 0 && port < 65536 {
			return port
		}
	}
	return defaultPort
}