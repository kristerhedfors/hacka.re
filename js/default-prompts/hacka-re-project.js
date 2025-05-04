/**
 * About hacka.re Project Default Prompt
 */

window.HackaReProjectPrompt = {
    id: 'hacka-re-project',
    name: 'About hacka.re Project',
    content: `# About hacka.re Project

hacka.re is a privacy-focused web client for AI models created in early 2025. It provides a streamlined, browser-based interface for interacting with powerful AI models while maintaining a focus on privacy and user control.

## Key Features

- **Privacy-First Design**: All data stays in your browser - your API key and conversations never leave your device except when making direct requests to the AI provider's API.
- **No Server Components**: Pure client-side application using vanilla JavaScript, HTML, and CSS with no backend server.
- **Local Storage**: All settings, conversations, and prompts are stored locally in your browser.
- **Comprehensive Secure Sharing**: Create session key-protected shareable links to securely share configurations.
- **Customizable System Prompts**: Create and manage a library of system prompts to define AI behavior.
- **Context Window Visualization**: Real-time display of token usage within model's context limit.
- **Markdown Support**: Rich formatting for AI responses including code blocks with syntax highlighting.

## Technical Implementation

The application communicates directly with your configured AI provider's API using your personal API key, which is stored securely in your browser's localStorage. All message processing, including markdown rendering and syntax highlighting, happens locally in your browser.

The interface uses server-sent events (SSE) to stream AI responses in real-time, providing a smooth and responsive experience even with longer generations.

## Privacy Considerations

- GitHub Pages hosted site - the application is hosted on GitHub's servers
- Stores your API key only in your browser's localStorage
- Keeps conversation history locally on your device
- All chat content is sent to your configured AI provider's API servers for processing
- Your conversations are subject to your AI provider's privacy policy
- Does not use analytics, tracking, or telemetry
- Has no custom backend server that could potentially log your data
- All external libraries are hosted locally to prevent third-party CDN connections`
};
