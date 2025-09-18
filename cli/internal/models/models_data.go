package models

// ModelInfo contains information about a model's capabilities
type ModelInfo struct {
	ContextWindow int // Maximum context window in tokens
}

// Provider represents an AI provider with its models
type Provider struct {
	Name   string
	Models map[string]ModelInfo
}

// ModelsData contains all model information from models.dev
var ModelsData = map[string]map[string]ModelInfo{
	"openai": {
		"gpt-4":                   {ContextWindow: 8192},
		"gpt-5":                   {ContextWindow: 400000},
		"gpt-5-mini":              {ContextWindow: 400000},
		"o1-preview":              {ContextWindow: 128000},
		"gpt-4-turbo":             {ContextWindow: 128000},
		"codex-mini-latest":       {ContextWindow: 200000},
		"gpt-5-nano":              {ContextWindow: 128000}, // Note: duplicate entry in JS, using second value
		"gpt-4.1-nano":            {ContextWindow: 1047576},
		"gpt-3.5-turbo":           {ContextWindow: 16385},
		"gpt-3.5-turbo-16k":       {ContextWindow: 16385},
		"gpt-4o":                  {ContextWindow: 128000},
		"gpt-4.1":                 {ContextWindow: 1047576},
		"o1-mini":                 {ContextWindow: 128000},
		"gpt-4.1-mini":            {ContextWindow: 1047576},
		"o3":                      {ContextWindow: 200000},
		"gpt-3.5-turbo-0125":      {ContextWindow: 16385},
		"o1":                      {ContextWindow: 200000},
		"gpt-4o-2024-05-13":       {ContextWindow: 128000},
		"o3-mini":                 {ContextWindow: 200000},
		"o4":                      {ContextWindow: 400000},
		"gpt-4o-2024-08-06":       {ContextWindow: 128000},
		"gpt-5-nano-2024-07-18":   {ContextWindow: 128000},
		"o4-mini":                 {ContextWindow: 400000},
		"gpt-3.5-turbo-1106":      {ContextWindow: 16385},
		"o1-2024-12-17":           {ContextWindow: 200000},
		"o1-mini-2024-09-12":      {ContextWindow: 128000},
		"o1-preview-2024-09-12":   {ContextWindow: 128000},
		"gpt-oss-120b":            {ContextWindow: 131072},
		"gpt-oss-20b":             {ContextWindow: 131072},
	},
	"anthropic": {
		"claude-opus-4":               {ContextWindow: 200000},
		"claude-sonnet-4":             {ContextWindow: 200000},
		"claude-instant-1.2":          {ContextWindow: 100000},
		"claude-2.1":                  {ContextWindow: 200000},
		"claude-3-5-haiku-20241022":   {ContextWindow: 200000},
		"claude-3-7-sonnet-20250219":  {ContextWindow: 200000},
		"claude-2.0":                  {ContextWindow: 100000},
		"claude-3-opus-20240229":      {ContextWindow: 200000},
		"claude-opus-4-1":             {ContextWindow: 200000},
		"claude-3-sonnet-20240229":    {ContextWindow: 200000},
		"claude-3-haiku-20240307":     {ContextWindow: 200000},
		"claude-3-5-sonnet-20241022":  {ContextWindow: 200000},
		"claude-3-5-sonnet-20240620":  {ContextWindow: 200000},
	},
	"groq": {
		"llama-3.3-70b-versatile":             {ContextWindow: 128000},
		"llama-3.3-70b-specdec":                {ContextWindow: 8192},
		"llama-3.3-8b-specdec":                 {ContextWindow: 8192},
		"llama-3.2-11b-vision-preview":        {ContextWindow: 8192},
		"llama-3.2-3b-preview":                 {ContextWindow: 8192},
		"llama-3.2-1b-preview":                 {ContextWindow: 8192},
		"llama-4-scout-17b-16e-preview-fp8":   {ContextWindow: 128000},
		"llama-3.1-405b-reasoning":             {ContextWindow: 32768},
		"llama-3.1-70b-versatile":              {ContextWindow: 131072},
		"llama-3.1-8b-instant":                 {ContextWindow: 131072},
		"llama-3.2-90b-vision-preview":         {ContextWindow: 8192},
		"llama-4-maverick-17b-128e-preview-fp8": {ContextWindow: 128000},
		"mixtral-8x7b-32768":                   {ContextWindow: 32768},
	},
	"mistral": {
		"mistral-small-2503":      {ContextWindow: 128000},
		"mistral-large-2411":      {ContextWindow: 128000},
		"ministral-3b-2410":       {ContextWindow: 128000},
		"mistral-medium-2505":     {ContextWindow: 128000},
		"mistral-large-latest":    {ContextWindow: 128000},
		"ministral-8b-2410":       {ContextWindow: 128000},
		"mistral-nemo":            {ContextWindow: 128000},
		"codestral-2501":          {ContextWindow: 256000},
		"open-mistral-7b":         {ContextWindow: 32000},
		"mistral-small-2409":      {ContextWindow: 128000},
		"mistral-large":           {ContextWindow: 128000},
		"mistral-small":           {ContextWindow: 32000},
		"mistral-medium":          {ContextWindow: 32000},
		"mistral-tiny":            {ContextWindow: 32000},
		"magistral-small":         {ContextWindow: 128000},
		"magistral-medium":        {ContextWindow: 128000},
		"magistral-medium-latest": {ContextWindow: 128000},
		"devstral-small-2505":     {ContextWindow: 128000},
		"devstral-small-2507":     {ContextWindow: 128000},
		"devstral-medium-2507":    {ContextWindow: 128000},
		"devstral-small":          {ContextWindow: 128000},
		"devstral-medium":         {ContextWindow: 128000},
	},
	"deepseek": {
		"deepseek-chat":                {ContextWindow: 128000},
		"deepseek-coder":               {ContextWindow: 128000},
		"deepseek-reasoner":            {ContextWindow: 65536},
		"deepseek-r1":                  {ContextWindow: 65536},
		"deepseek-r1-0528":             {ContextWindow: 65536},
		"deepseek-r1-distill-llama-70b": {ContextWindow: 131072},
		"deepseek-r1-distill-qwen-14b":  {ContextWindow: 64000},
	},
	"microsoft": {
		"mai-ds-r1":      {ContextWindow: 65536},
		"mai-ds-r1-gguf": {ContextWindow: 65536},
	},
}

// GetModelInfo returns the model information for a given provider and model
func GetModelInfo(provider, model string) (ModelInfo, bool) {
	if providerModels, ok := ModelsData[provider]; ok {
		if info, ok := providerModels[model]; ok {
			return info, true
		}
	}
	// Return default if not found
	return ModelInfo{ContextWindow: 4096}, false
}

// GetSystemPromptMaxTokens returns a reasonable limit for system prompts
// based on the model's context window (usually 20-25% of total)
func GetSystemPromptMaxTokens(provider, model string) int {
	info, found := GetModelInfo(provider, model)
	if !found {
		// Default fallback
		return 2048
	}

	// Use 20% of context window for system prompts
	// This leaves plenty of room for conversation
	maxTokens := info.ContextWindow / 5

	// Cap at reasonable limits
	if maxTokens > 50000 {
		return 50000 // Reasonable max for system prompts
	}
	if maxTokens < 1000 {
		return 1000 // Minimum useful size
	}

	return maxTokens
}