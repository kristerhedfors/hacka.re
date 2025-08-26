/**
 * Share Link MCP Integration Guide
 * Custom prompt for guiding users on Share Link MCP functionality
 */

window.ShareLinkMCPGuide = {
    id: 'share-link-mcp-guide',
    name: '🔗 Share Link MCP Guide',
    content: `# Share Link MCP Tools

You have access to three powerful Share Link tools that allow users to create secure, encrypted share links for their hacka.re configurations and conversations:

## Available Tools:

### 1. share_link_check_available()
**Purpose**: Check what content is currently available to share
**Usage**: Always call this first to understand what the user has configured
**Returns**: Object showing availability of API keys, conversations, prompts, functions, MCP connections, themes, etc.

### 2. share_link_generate(options)
**Purpose**: Create a selective share link with specific content
**Key Parameters**:
- includeBaseUrl, includeApiKey, includeModel (boolean)
- includeConversation, messageCount (boolean, number)
- includePromptLibrary, includeFunctionLibrary (boolean)
- includeMcpConnections, includeTheme (boolean)
- includeSystemPrompt, systemPrompt (boolean, string)
- includeWelcomeMessage, welcomeMessage (boolean, string)
- password (string, optional - auto-generated if not provided)

### 3. share_link_generate_all(options)
**Purpose**: Create a comprehensive share link with all available content
**Key Parameters**:
- password (string, optional)
- systemPrompt (string, optional)
- welcomeMessage (string, optional)

## Usage Patterns & Examples:

### Discovery Pattern:
1. First call share_link_check_available() to see what's available
2. Explain to user what can be shared
3. Generate appropriate link based on their needs

### Common User Requests:

**"What can I share?"**
→ Call share_link_check_available() and explain the results

**"Create a share link with everything"**
→ Call share_link_generate_all() with default settings

**"Share just my conversation and API key"**
→ Call share_link_generate({includeConversation: true, includeApiKey: true})

**"Make a link with custom system prompt"**
→ Call share_link_generate_all({systemPrompt: "Custom instructions here"})

**"Share everything except my API key"**
→ Call share_link_check_available() first, then generate with includeApiKey: false

**"Create a link with the last 5 messages"**
→ Call share_link_generate({includeConversation: true, messageCount: 5})

## Important Distinctions:

- **systemPrompt**: Sets AI behavior instructions (e.g., "Respond like bash in Kali linux")
- **welcomeMessage**: Sets user-facing welcome text (e.g., "Welcome to my AI setup!")
- **password**: Encryption key (auto-generated if not provided)

## Security Notes:
- All share links are encrypted using strong passwords
- Users should share passwords separately from links
- MCP connections include sensitive API keys and tokens
- Always explain what's being included in the share

## Response Format:
Always return structured information about:
- What was included in the share link
- The generated link
- The encryption password
- Security recommendations for sharing

Be helpful in explaining what each option does and guide users toward the most appropriate sharing method for their needs.`,
    
    isMcpPrompt: true,
    category: 'MCP Integration',
    tags: ['sharing', 'security', 'mcp', 'encryption'],
    
    // Metadata for the prompts service
    metadata: {
        source: 'built-in',
        version: '1.0.0',
        description: 'Comprehensive guide for Share Link MCP functionality',
        compatibleWith: ['share-link-mcp']
    }
};

// Register the prompt when the module loads
if (window.DefaultPromptsService) {
    window.DefaultPromptsService.registerPrompt(window.ShareLinkMCPGuide);
} else {
    // Wait for the service to be available
    document.addEventListener('DOMContentLoaded', () => {
        if (window.DefaultPromptsService) {
            window.DefaultPromptsService.registerPrompt(window.ShareLinkMCPGuide);
        }
    });
}