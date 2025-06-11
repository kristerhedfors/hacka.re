/**
 * About hacka.re Project Default Prompt
 */

window.HackaReProjectPrompt = {
    id: 'hacka-re-project',
    name: 'About hacka.re Project',
    content: `# About hacka.re: Serverless Agency

hacka.re is a highly portable, low-dependency, privacy-first chat interface for Large Language Models. It is a lightweight, static web UI that runs entirely client-side with no server-side rendering, designed by whitehat hackers, for whitehat hackers.

## Core Philosophy

- **Free, open, för hackare av hackare**: The name "hacka.re" comes from "hackare" which translates to "whitehat hacker" in Swedish, reflecting the project's ethos: a tool built by whitehat hackers, for whitehat hackers.
- **Privacy-First Approach**: Your API key and conversations never leave your device except when making direct requests to your configured API provider. Your API key stays encrypted in localStorage, or encrypted in shared links where strong passwords are critical for integrity and security of the API key and all other shared info.
- **True Serverless Architecture**: No backend servers, no tracking, no telemetry - just a static web app that connects directly to your chosen LLM provider.
- **Minimal Dependencies**: Few dependencies limits the attack surface and increases resilience. Only depends on marked, dompurify, tweetnacl, and qrcode.
- **Vibe-Coded Development**: 99%+ of hacka.re's code was created through LLM-assisted development using Claude 3.7 Sonnet.

## Key Features

- **Client-Side Architecture**: A lightweight, static web UI built with pure HTML, CSS, and JavaScript that runs entirely client-side with no server-side rendering.
- **Secure Sharing Mechanism**: Pack an entire self-contained GPT, with API endpoint, API key, system prompts, and conversation history into a strongly encrypted link, and even print this link on paper as a QR code.
- **Portable Deployment**: The entire site can be downloaded and run from disk as static files by opening it in your browser, or extended and re-published freely under the MIT No Attribution license.
- **Function Calling**: Create JavaScript functions that can be called by AI models through the OpenAI-compatible API, enabling the AI to perform actions or retrieve information.
- **Context Window Visualization**: Real-time display of token usage within model's context limit to optimize your conversations.
- **Multi-Provider Support**: Works with any OpenAI-compatible API provider, including OpenAI, Groq Cloud, Ollama (local), or custom endpoints.
- **Markdown Support**: Rich formatting for AI responses including code blocks with syntax highlighting.

## Technical Implementation

The application communicates directly with your configured API provider using your API key, which is stored encrypted in your browser's localStorage. All message processing, including markdown rendering and syntax highlighting, happens locally in your browser.

The modular storage architecture includes components for encryption, namespaces, core storage, and data-type-specific operations, all working together to ensure your data remains private and secure.

## Privacy Considerations

- This is a GitHub Pages site - the application is hosted on GitHub's servers
- Stores your API key encrypted in your browser's localStorage
- Keeps conversation history encrypted locally on your device
- **All chat content is sent to your configured API provider's servers** for processing
- Your conversations are subject to your API provider's privacy policy
- Does not use analytics, tracking, or telemetry
- Has no custom backend server that could potentially log your data
- All external libraries are now hosted locally to prevent third-party CDN connections`
};
