# Modal System Documentation

This document provides an overview of the modal documentation structure in the hacka.re testing framework.

## Documentation Structure

### Core Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| **[TESTING_GUIDE.md](TESTING_GUIDE.md)** | Common testing patterns, utilities, and best practices | All developers |
| **[MODAL_SYSTEM_OVERVIEW.md](MODAL_SYSTEM_OVERVIEW.md)** | Modal architecture, relationships, and lifecycle | Developers, testers |
| **[FUNCTION_SYSTEM_OVERVIEW.md](FUNCTION_SYSTEM_OVERVIEW.md)** | Function calling system architecture and testing | Function developers |

### Modal-Specific Documentation

| Modal | Description | Documentation |
|-------|-------------|---------------|
| **Settings Modal** | API configuration, model selection, base URL management | [SETTINGS_MODAL_README.md](SETTINGS_MODAL_README.md) |
| **Prompts Modal** | System prompt management, default prompts, token usage | [PROMPTS_MODAL_README.md](PROMPTS_MODAL_README.md) |
| **Share Modal** | Shareable links, encryption, QR codes, password protection | [SHARE_MODAL_README.md](SHARE_MODAL_README.md) |
| **Welcome Modal** | First-time user onboarding, localStorage detection | [WELCOME_MODAL_README.md](WELCOME_MODAL_README.md) |

### Specialized Feature Documentation

| Feature | Description | Documentation |
|---------|-------------|---------------|
| **Default Functions** | Built-in function testing and management | [DEFAULT_FUNCTIONS_README.md](DEFAULT_FUNCTIONS_README.md) |
| **Default Prompts** | System prompts and nested sections | [DEFAULT_PROMPTS_README.md](DEFAULT_PROMPTS_README.md) |
| **Namespace Management** | Settings isolation and cleanup | [CLEAR_NAMESPACE_SETTINGS_README.md](CLEAR_NAMESPACE_SETTINGS_README.md) |
| **Crypto Testing** | Deterministic encryption testing | [DETERMINISTIC_CRYPTO_TEST_README.md](DETERMINISTIC_CRYPTO_TEST_README.md) |
| **API Integration** | OpenAI API proxy and authentication | [OPENAI_API_PROXY_README.md](OPENAI_API_PROXY_README.md) |

## Quick Reference

### Getting Started
1. **Read [TESTING_GUIDE.md](TESTING_GUIDE.md)** for common patterns and utilities
2. **Review [MODAL_SYSTEM_OVERVIEW.md](MODAL_SYSTEM_OVERVIEW.md)** for architecture understanding  
3. **Consult specific modal documentation** for detailed implementation guidance

### Modal Testing Flow
```
Welcome Modal → Settings Modal → Prompts Modal → Function Modal → Chat → Share Modal
```

### Common Patterns
All common testing patterns (modal operations, dialog handling, form submissions) are documented in [TESTING_GUIDE.md](TESTING_GUIDE.md) to avoid duplication across modal-specific documentation.

### Modal Relationships
Detailed modal interactions and dependencies are covered in [MODAL_SYSTEM_OVERVIEW.md](MODAL_SYSTEM_OVERVIEW.md).

## Legacy Documentation

The following files contain historical documentation that has been consolidated:
- `FUNCTION_CALLING_README_LEGACY.md` - Merged into `FUNCTION_SYSTEM_OVERVIEW.md`
- `FUNCTION_MODAL_README_LEGACY.md` - Merged into `FUNCTION_SYSTEM_OVERVIEW.md`
- `MCP_UNIT_TESTS_FIXED_LEGACY.md` - Historical MCP test fixes
- `API_KEY_MODAL_README.md` - Legacy modal (rarely used)

## Documentation Maintenance

This new structure eliminates content duplication while maintaining comprehensive coverage. Each file has a specific purpose:

- **Core guides** provide shared knowledge and patterns
- **Modal-specific docs** focus on unique features and implementation details  
- **Specialized features** document complex subsystems

For questions or improvements to this documentation structure, refer to the individual files or update this overview accordingly.
