# hacka.re

A privacy-focused, serverless chat interface for OpenAI-compatible APIs.

## Overview

hacka.re is a lightweight, static web UI built with pure HTML, CSS, and JavaScript that runs entirely client-side with no server-side rendering. The name "hacka.re" comes from "hackare" which translates to "whitehat hacker" in Swedish, reflecting the project's ethos: a tool built by whitehat hackers, for whitehat hackers. The tagline "Free, open, för hackare, av hackare" translates to "free, open, for whitehat hackers, by whitehat hackers."

## Key Features

- **Multiple Provider Support**: Compatible with Groq, OpenAI, Azure OpenAI, Ollama, and custom endpoints
  - **Azure OpenAI Integration**: Full support for Azure OpenAI API with custom endpoints, API versions, and deployment names
- **Privacy-Focused & Serverless**: Your API key and conversations stay in your browser; no backend server involved
- **Context Window Visualization**: Real-time display of token usage within model's context limit
- **Markdown Support**: Rich formatting for AI responses including code blocks with syntax highlighting
- **Persistent History**: Conversation history is saved locally between sessions
- **Function Calling**: Create JavaScript functions that can be called by AI models through the OpenAI-compatible API
- **Secure Sharing**: Create encrypted, password-protected shareable links to securely share your API key, system prompt, active model, and conversation data with trusted individuals
- **Customizable System Prompts**: Configure system prompts to control AI behavior
- **Theme Options**: Multiple visual themes to customize your experience
- **Mobile Responsive**: Optimized for both desktop and mobile devices

## Privacy and Security

Privacy is a core principle of hacka.re:

- Your API key is stored encrypted in your browser's localStorage
- Conversation history is kept encrypted locally on your device
- All chat content is sent directly from your browser to your configured API provider's servers for processing
- No analytics, tracking, or telemetry
- Serverless: No custom backend server that could log your data
- All external JS libraries are hosted locally to prevent third-party CDN connections

While this approach gives you more control over your data than many commercial alternatives, please be aware that your conversation content is processed by your API provider's cloud services. Never share sensitive personal information, credentials, or confidential data in your conversations with not fully trusted API endpoints.

## Secure Sharing Mechanism

hacka.re includes a feature to securely share various aspects of your configuration with others through session key-protected URL-based sharing. Not even the encrypted blob in the link containing a complete GPT configuration touches any web servers. This allows for secure sharing of strongly encrypted GenAI provider credentials, system prompts, model choice, and conversation history over less secure communication channels.

Sharing options include:
- API Provider: Any OpenAI-compatible API works
- API Key: Share your API key for access to models
- Active Model: Share your selected model preference with automatic fallback if unavailable
- System Prompt: Share your custom system prompt for consistent AI behavior
- Function Library: Share your custom JavaScript functions
- Conversation Data: Share recent conversation history with configurable message count

## Architecture

hacka.re is built as a pure client-side application using vanilla JavaScript, HTML, and CSS with no server-side rendering or processing. This static approach eliminates the need for a backend server, ensuring that your data remains on your device. All code is interpreted and executed entirely in your browser.

The application communicates directly with the configured OpenAI-compatible API using your corresponding API key stored in your browser's localStorage. All message processing, including markdown rendering and syntax highlighting, happens locally in your browser.

### Project Structure

The project is organized as follows:

- `index.html`: Main application page
- `css/`: Stylesheets
- `js/`: JavaScript files
  - `app.js`: Application initialization
  - `components/`: UI components
  - `services/`: Service modules
  - `utils/`: Utility functions
  - `default-prompts/`: System prompt components
- `lib/`: Third-party libraries (hosted locally)
- `about/`: Information pages about the project
- `_tests/`: Comprehensive test suite (not served on GitHub Pages)

## Getting Started

To use hacka.re, you'll need an API key from a compatible provider.

1. Visit [hacka.re](https://hacka.re/)
2. Open settings
3. Select your API provider
4. Paste your API key
5. Select your preferred model
6. Start chatting with state-of-the-art AI models

Your API key and conversations will be saved locally in your browser for future sessions.

## Development

hacka.re is designed to be easily extensible and modifiable. The codebase is structured to be maintainable and follows modern web development practices.

### Function Calling

The function calling feature allows you to create JavaScript functions that can be called by AI models through the OpenAI-compatible API. By default, all functions are callable. If any function is tagged with `@callable` or `@tool`, then only tagged functions will be callable.

### Azure OpenAI Integration

The Azure OpenAI integration allows you to use Azure OpenAI API endpoints with hacka.re. The integration supports:

- Custom API base URLs (e.g., `https://your-resource-name.openai.azure.com`)
- API versions (e.g., `2024-03-01-preview`)
- Deployment names
- Model names

To use Azure OpenAI:

1. Open settings
2. Select "Azure OpenAI" from the provider dropdown
3. Enter your Azure OpenAI settings:
   - API Base URL
   - API Version
   - Deployment Name
   - Model Name
4. Enter your API key
5. Save settings

For debugging Azure OpenAI integration issues, you can use the debug test page at `_tests/azure-openai-debug.html`.

### Testing

The project includes a comprehensive test suite using Playwright and pytest. The tests are designed to verify the functionality of the application and ensure that it works correctly with actual LLM providers.

To run the tests:

```bash
cd _tests/playwright
./run_tests.sh
```

For more information about the test suite, see the [Playwright Tests README](_tests/playwright/README.md).

## License

MIT
