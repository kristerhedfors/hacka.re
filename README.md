# hacka.re

A simple chat interface for GroqCloud's OpenAI API.

## Features

- Access to GroqCloud's ultra-fast inference for models like Llama 3.1, Mixtral, and more
- Privacy-focused: Your API key and conversations stay in your browser
- Context window visualization: Real-time display of token usage within model's context limit
- Markdown support: Rich formatting for AI responses
- Persistent history: Conversation history is saved locally
- Session key sharing: Securely share your API key, system prompt, active model, and conversation data with lockable session keys for team collaboration

## Getting Started

To use hacka.re, you'll need a GroqCloud API key, which you can obtain from [GroqCloud's console](https://console.groq.com/).

1. Visit [hacka.re](https://hacka.re/)
2. Enter your API key when prompted
3. Select your preferred model
4. Start chatting with state-of-the-art AI models

## Development

### Project Structure

The project is organized as follows:

- `index.html`: Main application page
- `css/`: Stylesheets
- `js/`: JavaScript files
  - `app.js`: Application initialization
  - `components/`: UI components
  - `services/`: Service modules
  - `utils/`: Utility functions
- `lib/`: Third-party libraries
- `_tests/`: Unit tests (not served on GitHub Pages)

### Crypto and Link Sharing

The application includes secure sharing functionality:

- `js/utils/crypto-utils.js`: Cryptographic utilities using TweetNaCl
- `js/services/link-sharing-service.js`: Link sharing functionality
- `js/services/share-service.js`: Backward-compatible wrapper

### Testing

Unit tests are available in the `_tests` directory:

```
npm test          # Shows instructions for running tests
npm run test:setup # Installs Puppeteer for headless testing
npm run test:headless # Runs tests in headless mode (requires setup)
```

Alternatively, open `_tests/test-runner.html` in a browser to run the tests.

## Privacy

Privacy is a core principle of hacka.re:

- Your API key is stored only in your browser's localStorage
- Conversation history is kept locally on your device
- All chat content is sent to Groq's API servers for processing
- No analytics, tracking, or telemetry
- No custom backend server that could log your data

## License

MIT
