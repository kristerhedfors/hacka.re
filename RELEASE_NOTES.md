# hacka.re - Release Candidate 1

## Overview

This document summarizes the features and achievements of hacka.re as of Release Candidate 1. This information is for internal use only and is separate from the README.md and GitHub Pages content.

## Features

### Core Functionality

- **OpenAI-Compatible API Integration**: Seamless integration with OpenAI-compatible APIs for AI model access
- **Streaming Responses**: Real-time streaming of AI responses with token speed display
- **Context Window Visualization**: Real-time display of token usage within model's context limit with progress bar
- **Chat History**: Persistent chat history stored locally in the browser
- **Markdown Support**: Full markdown rendering in AI responses including code blocks
- **Code Highlighting**: Syntax highlighting for code blocks in AI responses
- **Copy Code Button**: One-click copying of code blocks to clipboard

### Model Support

- **Production Models**: Support for production models including:
  - Llama 3.3 70B Versatile
  - Llama 3.1 8B Instant
  - Llama Guard 3 8B
  - Llama 3 70B/8B
  - Gemma 2 9B IT
  - Whisper Large v3 (and variants)

- **Preview Models**: Support for preview models including:
  - Llama 4 Maverick/Scout 17B
  - Mistral Saba 24B
  - DeepSeek R1 Distill Llama 70B
  - Qwen QWQ 32B
  - PlayAI TTS (including Arabic variant)
  - Allam 2 7B

- **Preview Systems**: Support for compound systems:
  - Compound Beta
  - Compound Beta Mini

### User Experience

- **Modern Interface**: Clean, responsive design with intuitive controls
- **System Prompts**: Customizable system prompts for tailoring AI behavior
- **API Key Management**: Secure local storage of API keys
- **Model Selection**: Easy switching between available models
- **Token Speed Display**: Real-time display of token generation speed
- **Responsive Design**: Works on desktop and mobile devices

### Security Features

- **Local Storage**: All data stored locally in the browser, no server-side storage
- **Client-Side Processing**: All processing happens in the browser
- **No Data Collection**: No user data or conversations are collected or transmitted

### Link Sharing Functionality

- **Dedicated Share Button**: Easily accessible share button in the header
- **Encrypted API Key Sharing**: Session key-protected sharing of API keys
- **System Prompt Sharing**: Option to include system prompts in shared links
- **Model Sharing**: Option to include the active model in shared links
- **Conversation Sharing**: Option to share recent conversation history
- **Customizable Sharing**: Checkboxes to select exactly what to include in the shared link
- **QR Code Generation**: QR codes for easy sharing of links with size warnings
- **Session Key Management**: Generate strong session keys, toggle visibility, copy to clipboard, and lock for team sharing
- **NaCl Encryption**: Strong encryption for shared data
- **Session Key-Based Key Derivation**: Improved security through key derivation

## Technical Achievements

- **Modular Architecture**: Well-organized code with clear separation of concerns
- **Service-Based Design**: Dedicated services for API, storage, sharing, and UI utilities
- **No External Dependencies**: All libraries bundled locally for offline use and privacy
- **Vanilla JavaScript**: No framework dependencies, pure JavaScript implementation
- **Performance Optimization**: Efficient rendering and minimal DOM operations

## Known Issues

- **Link Sharing Functionality**: While the link sharing feature has been improved, some areas still need attention:
  - QR code generation for very long links (improved with size warnings)
  - Browser compatibility with the clipboard API on some platforms
  - Additional unit testing for edge cases in encryption/decryption
  - Model mismatch handling when shared model isn't available (implemented with fallback)

## Next Steps

- Implement comprehensive unit testing for the link sharing functionality
- Add more robust error handling throughout the application
- Improve accessibility features
- Enhance mobile responsiveness
- Add support for new models as they become available
- Consider adding conversation management features (saving/loading multiple conversations)

---

*This document is for internal use only and should not be shared publicly.*
