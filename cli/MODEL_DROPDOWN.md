# hacka.re CLI - Model Dropdown Feature

## 🎯 Overview

The hacka.re CLI now includes a comprehensive model dropdown system with pre-populated model metadata from OpenAI, Groq, and Berget providers - just like the web application!

## ✨ Key Features

### 1. Pre-populated Model Database
- **300+ models** with complete metadata
- **Automatic categorization**: Production, Preview, Legacy, System
- **Rich information**: Context windows, token limits, capabilities
- **Provider-specific lists**: OpenAI, Groq, Berget, Ollama, etc.

### 2. Interactive Model Selection

```
╔════════════════════════════════════════════════════════════════════════╗
║                      hacka.re CLI Settings                              ║
╠════════════════════════════════════════════════════════════════════════╣
║ Provider: openai                                                        ║
║                                                                          ║
║ API Provider:       openai                                              ║
║ Base URL:           https://api.openai.com/v1                          ║
║ API Key:            sk-...wxyz                                         ║
║ Model:              GPT-5 Nano (gpt-5-nano)        [↵ select] [^R refresh] ║
║                     ┌─────────────────────────────────────────────────┐ ║
║                     │          Select Model                            │ ║
║                     ├─────────────────────────────────────────────────┤ ║
║                     │ ▶ GPT-5 Nano      - Smallest GPT-5 model        │ ║
║                     │   GPT-5 Mini      - Small GPT-5 with balance    │ ║
║                     │   GPT-5           - Most capable GPT-5          │ ║
║                     │   GPT-4.1 Nano    - Ultra-long context nano     │ ║
║                     │   GPT-4.1 Mini    - Ultra-long context mini     │ ║
║                     │   GPT-4.1         - 1M token context           │ ║
║                     │   GPT-4o          - Multimodal optimized       │ ║
║                     │   GPT-4o Mini     - Smaller, faster variant    │ ║
║                     │   GPT-4 Turbo     - 128k context, faster       │ ║
║                     │   GPT-3.5 Turbo   - Fast, efficient            │ ║
║                     │   O1              - Advanced reasoning  [preview]│ ║
║                     │   O1 Mini         - Faster reasoning   [preview]│ ║
║                     └─────────────────────────────────────────────────┘ ║
║ Max Tokens:         4096                                                ║
║ Temperature:        0.7                                                  ║
╚════════════════════════════════════════════════════════════════════════╝
  ↑↓ Navigate | ↵ Select/Edit | ^R Refresh | ^T Test | ^S Save | ^Q Quit
```

### 3. Model Information Display

When selecting a model, detailed information is shown:

```
┌──────────────────────────────────────────────────────────┐
│                    GPT-5 Nano                           │
├──────────────────────────────────────────────────────────┤
│ ID: gpt-5-nano                                          │
│ Context: 128000 tokens                                  │
│ Max Output: 8192 tokens                                 │
│ Category: production                                    │
│ Owner: openai                                          │
│ Info: Smallest GPT-5 model, optimized for speed        │
│ Features: chat, functions, vision                      │
└──────────────────────────────────────────────────────────┘
```

## 📊 Model Categories

### Production Models
- Ready for production use
- Stable and reliable
- Full support

### Preview Models
- Beta features
- May change
- Testing recommended

### Legacy Models
- Older versions
- May be deprecated
- Consider upgrading

### System Models
- Special purpose (embeddings, TTS, etc.)
- Not for chat
- Specific use cases

## 🔧 Controls

| Key | Action |
|-----|--------|
| `↑/↓` | Navigate model list |
| `Enter` | Select model |
| `Ctrl+R` | Refresh models from API |
| `Ctrl+T` | Test connection with selected model |
| `Escape` | Close dropdown |

## 🌟 Provider-Specific Models

### OpenAI (45+ models)
- **GPT-5 Family**: Nano, Mini, Full
- **GPT-4.1 Family**: 1M context window
- **GPT-4o Family**: Multimodal
- **GPT-4 Turbo**: 128k context
- **GPT-3.5 Turbo**: Fast & efficient
- **O1 Series**: Advanced reasoning
- **Embeddings**: text-embedding-3-large/small
- **Audio**: Whisper, TTS
- **Images**: DALL-E 2/3

### Groq (15+ models)
- **Kimi K2**: 200k context (default)
- **Llama 3.3**: 70B versatile
- **Llama 3.1**: 8B/70B variants
- **Mixtral**: 8x7B MoE
- **Gemma 2**: Google's models
- **DeepSeek R1**: Reasoning models
- **Whisper**: Speech recognition

### Berget (5+ models)
- **Magistral**: Small/Medium (default)
- **Devstral**: Code-focused models
- **E5 Multilingual**: Embeddings

## 🚀 Quick Start

1. **Launch Settings**
   ```bash
   ./hacka.re
   ```

2. **Select Provider**
   Use Tab to cycle through providers

3. **Choose Model**
   Press Enter on Model field to open dropdown

4. **Test Connection**
   Press Ctrl+T to verify model works

5. **Save Configuration**
   Press Ctrl+S to save settings

## 🔄 API Model Refresh

The CLI can fetch the latest models from your provider:

1. Navigate to Model field
2. Press `Ctrl+R` to refresh
3. New models are added to the dropdown
4. Cached for future use

## 💡 Smart Defaults

Each provider has a recommended default model:
- **OpenAI**: `gpt-5-nano` (fast, efficient)
- **Groq**: `moonshotai/kimi-k2-instruct` (200k context)
- **Berget**: `mistralai/Magistral-Small-2506` (balanced)

## 🎯 Model Compatibility

The dropdown integrates with the model compatibility system:
- Shows which models need `max_completion_tokens`
- Indicates temperature restrictions
- Displays token limits
- Automatic parameter adjustment

## 📝 Example Workflow

```bash
# Start the CLI
./hacka.re

# In settings:
# 1. Tab to cycle to "groq" provider
# 2. Enter API key
# 3. Press Enter on Model field
# 4. Use arrows to select "llama-3.3-70b-versatile"
# 5. Press Enter to confirm
# 6. Ctrl+T to test connection
# 7. Ctrl+S to save

# Start chat with selected model
./hacka.re --chat
```

The model dropdown provides the same rich model selection experience as the hacka.re web application, with all metadata stored locally for instant access!