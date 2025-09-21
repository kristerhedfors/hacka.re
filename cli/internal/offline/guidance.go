package offline

import (
	"fmt"
	"strings"
)

// ShowConflictError displays an error message for conflicting configuration
func ShowConflictError(config *Configuration, err *ConflictError) {
	fmt.Println("╔════════════════════════════════════════════════════════════════╗")
	fmt.Println("║                    Configuration Conflict                      ║")
	fmt.Println("╚════════════════════════════════════════════════════════════════╝")
	fmt.Println()
	fmt.Println("Error: Offline mode (-o/--offline) cannot be used with remote API configuration.")
	fmt.Println()
	fmt.Println("You have configured:")
	for _, detail := range err.Details {
		fmt.Printf("  • %s\n", detail)
	}
	fmt.Println()
	fmt.Println("Choose one:")
	fmt.Println("  1. Remove --offline flag to use remote API:")
	fmt.Println("     hacka.re --api-provider openai --api-key YOUR_KEY")
	fmt.Println()
	fmt.Println("  2. Remove API configuration to use offline mode:")
	fmt.Println("     hacka.re --offline")
	fmt.Println()
}

// ShowNoProviderGuidance displays comprehensive guidance when no provider is configured
func ShowNoProviderGuidance() {
	fmt.Println("╔════════════════════════════════════════════════════════════════╗")
	fmt.Println("║                   No LLM Provider Configured                   ║")
	fmt.Println("╚════════════════════════════════════════════════════════════════╝")
	fmt.Println()
	fmt.Println("Choose your preferred way to run LLMs:")
	fmt.Println()

	// Offline options
	fmt.Println("═══ OFFLINE OPTIONS (No Internet Required) ═══")
	fmt.Println()

	showLlamafileGuidance()
	showOllamaGuidance()
	showLMStudioGuidance()

	// Remote options
	fmt.Println("═══ REMOTE OPTIONS (API Key Required) ═══")
	fmt.Println()

	showRemoteProvidersGuidance()
}

func showLlamafileGuidance() {
	fmt.Println("1. Llamafile (Simplest - Single Executable)")
	fmt.Println("   " + strings.Repeat("─", 40))
	fmt.Println("   Download and run:")
	fmt.Println("     wget https://huggingface.co/Mozilla/Qwen3-4B-llamafile/resolve/main/Qwen_Qwen3-4B-Q4_K_M.llamafile")
	fmt.Println("     chmod +x Qwen_Qwen3-4B-Q4_K_M.llamafile")
	fmt.Println("     hacka.re -o --llamafile ./Qwen_Qwen3-4B-Q4_K_M.llamafile")
	fmt.Println()
	fmt.Println("   Or set environment variable:")
	fmt.Println("     export HACKARE_LLAMAFILE=/path/to/your.llamafile")
	fmt.Println("     hacka.re -o")
	fmt.Println()
	fmt.Println("   ✓ No installation required")
	fmt.Println("   ✓ Cross-platform single file")
	fmt.Println("   ✓ Includes model + runtime")
	fmt.Println()
}

func showOllamaGuidance() {
	fmt.Println("2. Ollama (CLI-First Approach)")
	fmt.Println("   " + strings.Repeat("─", 40))
	fmt.Println("   Install and run:")
	fmt.Println("     # Install")
	fmt.Println("     curl -fsSL https://ollama.com/install.sh | sh")
	fmt.Println()
	fmt.Println("     # Pull a model")
	fmt.Println("     ollama pull llama3.2")
	fmt.Println()
	fmt.Println("     # Start with CORS enabled for hacka.re")
	fmt.Println("     OLLAMA_ORIGINS=https://hacka.re ollama serve")
	fmt.Println()
	fmt.Println("     # In another terminal")
	fmt.Println("     hacka.re --api-provider ollama")
	fmt.Println()
	fmt.Println("   ✓ Easy model management")
	fmt.Println("   ✓ Memory efficient")
	fmt.Println("   ✓ Large model selection")
	fmt.Println()
}

func showLMStudioGuidance() {
	fmt.Println("3. LM Studio (GUI Application)")
	fmt.Println("   " + strings.Repeat("─", 40))
	fmt.Println("   Setup:")
	fmt.Println("     1. Download from https://lmstudio.ai")
	fmt.Println("     2. Launch and download a model from the catalog")
	fmt.Println("     3. Enable local server in settings")
	fmt.Println("     4. Enable CORS: Developer → Settings → Enable CORS")
	fmt.Println()
	fmt.Println("   Run hacka.re:")
	fmt.Println("     hacka.re --api-provider lmstudio")
	fmt.Println()
	fmt.Println("   ✓ User-friendly GUI")
	fmt.Println("   ✓ Built-in model catalog")
	fmt.Println("   ⚠️  CORS enables access from all websites")
	fmt.Println()
}

func showRemoteProvidersGuidance() {
	fmt.Println("OpenAI (GPT-4, GPT-3.5)")
	fmt.Println("  hacka.re --api-provider openai --api-key sk-YOUR_KEY")
	fmt.Println()
	fmt.Println("Groq (Fast inference)")
	fmt.Println("  hacka.re --api-provider groq --api-key gsk_YOUR_KEY")
	fmt.Println()
	fmt.Println("Custom endpoint")
	fmt.Println("  hacka.re --base-url https://your-api.com/v1 --api-key YOUR_KEY")
	fmt.Println()
}

// ShowQuickHelp shows a brief help message for offline mode
func ShowQuickHelp() {
	fmt.Println("Quick start for offline mode:")
	fmt.Println()
	fmt.Println("  # If you have a llamafile:")
	fmt.Println("  hacka.re -o --llamafile /path/to/model.llamafile")
	fmt.Println()
	fmt.Println("  # If you have Ollama installed:")
	fmt.Println("  OLLAMA_ORIGINS=https://hacka.re ollama serve")
	fmt.Println("  hacka.re --api-provider ollama")
	fmt.Println()
	fmt.Println("For detailed setup instructions, run: hacka.re --help-llm")
}

// ShowLocalLLMHelp displays comprehensive local LLM setup instructions
func ShowLocalLLMHelp() {
	fmt.Println("╔════════════════════════════════════════════════════════════════╗")
	fmt.Println("║                    Local LLM Setup Guide                       ║")
	fmt.Println("╚════════════════════════════════════════════════════════════════╝")
	fmt.Println()

	fmt.Println("hacka.re supports multiple local LLM runtimes:")
	fmt.Println()

	providers := []struct {
		name     string
		port     string
		apiKey   string
		provider string
	}{
		{"Llamafile", "8080", "no-key", "llamafile"},
		{"Ollama", "11434", "no-key", "ollama"},
		{"LM Studio", "1234", "no-key", "lmstudio"},
		{"GPT4All", "4891", "no-key", "gpt4all"},
		{"LocalAI", "8080", "no-key", "localai"},
	}

	fmt.Println("┌─────────────┬──────────┬────────────┬──────────────────────┐")
	fmt.Println("│ Runtime     │ Port     │ API Key    │ Provider Flag        │")
	fmt.Println("├─────────────┼──────────┼────────────┼──────────────────────┤")

	for _, p := range providers {
		fmt.Printf("│ %-11s │ %-8s │ %-10s │ --api-provider %-5s │\n",
			p.name, p.port, p.apiKey, p.provider)
	}

	fmt.Println("└─────────────┴──────────┴────────────┴──────────────────────┘")
	fmt.Println()
	fmt.Println("All local providers use 'no-key' as the API key value.")
	fmt.Println()
	fmt.Println("For detailed setup of each provider, see:")
	fmt.Println("https://hacka.re/about/local-llm-toolbox.html")
}