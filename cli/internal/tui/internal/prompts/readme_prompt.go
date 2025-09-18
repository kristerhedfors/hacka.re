package prompts

// ReadmePromptContent contains the README.md default prompt
const ReadmePromptContent = `# hacka.re - The Privacy-First AI Chat Interface

<div align="center">

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Tests](https://img.shields.io/badge/Tests-377+-blue.svg)](_tests/playwright/)
[![Privacy](https://img.shields.io/badge/Privacy-First-purple.svg)](about/)

*Free, open, för hackare, av hackare*

</div>

## Table of Contents

1. [Introduction & Philosophy](#introduction--philosophy)
2. [Quick Start](#quick-start)
3. [Core Features](#core-features)
4. [Modal Windows & UI Components](#modal-windows--ui-components)
5. [Technical Architecture](#technical-architecture)
6. [Security & Privacy Architecture](#security--privacy-architecture)
7. [Advanced Systems](#advanced-systems)
8. [Development Environment](#development-environment)
9. [Testing Infrastructure](#testing-infrastructure)
10. [Integration Guides](#integration-guides)
11. [API Provider Support](#api-provider-support)
12. [Performance & Optimization](#performance--optimization)
13. [Troubleshooting](#troubleshooting)
14. [Contributing](#contributing)
15. [License](#license)

---

## Introduction & Philosophy

### The Name and Heritage

**hacka.re** derives from "hackare" - Swedish for "whitehat hacker". This name embodies our philosophy: a tool built *för hackare, av hackare* (for whitehats, by whitehats). We believe in empowering security researchers, developers, and privacy-conscious users with a transparent and fully controllable AI interface.

### Core Principles

1. **Privacy First**: Your data never touches our servers because we don't have any
2. **Zero Trust**: All sensitive data is encrypted client-side, no external services trusted
3. **Zero Dependencies**: Minimal third-party libraries (only essential ones), all hosted locally - no CDN dependencies
4. **Zero Infrastructure**: Pure static site, no backend servers required other than OpenAI-compatible LLM API
5. **Transparency**: 100% open source, auditable code
6. **No Telemetry**: Zero analytics, tracking, or phone-home functionality
7. **Direct Communication**: Your browser talks directly to AI provider APIs
8. **Local Interface**: The UI runs in your browser, AI models run on provider servers (unless using local LLMs)
9. **Serverless**: Can be hosted anywhere or run locally

### What Makes hacka.re Different

Unlike commercial AI interfaces that route your conversations through their servers, hacka.re is a **pure client-side application**. This means:

- **Your API keys** stay encrypted in your browser
- **Your conversations** go directly to your chosen AI provider's servers
- **Your configuration** stays on your device
- **No intermediary servers** between you and the AI provider

### Target Audience

hacka.re is designed for:

- 🔒 **Security Researchers**: Analyze AI behavior without corporate oversight
- 💻 **Developers**: Test AI integrations with complete control
- 🛡️ **Privacy Advocates**: Use AI without sacrificing privacy
- 🎓 **Students & Educators**: Learn AI interaction in a transparent environment
- 🏢 **Enterprises**: Deploy a controllable, auditable AI interface`