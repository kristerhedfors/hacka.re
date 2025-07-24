# Multi-Agent System Demo

## Overview

The new multi-agent system allows multiple agents to respond to queries in sequence, providing diverse perspectives and specialized responses.

## How to Use

### 1. Create and Save Agents

First, create different specialized agents:

1. **Research Agent**: Configure with research-focused prompts and tools
2. **Coding Agent**: Set up with development tools and coding prompts  
3. **Analysis Agent**: Configure with analytical prompts and data tools

Save each configuration as a named agent using the "Save Current" button.

### 2. Enable Agents for Multi-Agent Queries

In the Agent Management modal:

1. Open the Agent Management modal (robot icon in header)
2. You'll see your saved agents with new layout:
   - **Agent name and details at the top** (full width)
   - **Enable checkbox and buttons at the bottom**
3. Check the **"Enable for queries"** checkbox for agents you want to participate
4. Enable 2 or more agents to activate multi-agent mode

### 3. Send Multi-Agent Queries

When 2+ agents are enabled:

1. Type your question in the chat input
2. Press Enter or click Send
3. The system will:
   - Add your message to chat
   - Show "🎭 Multi-Agent Mode: Querying X agents: [names]"
   - Switch to each agent in sequence
   - Display "🤖 **AgentName** responding..." before each response
   - Each agent responds with their specialized configuration

## Example Multi-Agent Workflow

```
User: "Analyze the pros and cons of using React vs Vue for a new project"

🎭 Multi-Agent Mode: Querying 3 agents: researcher, developer, analyst

🤖 researcher responding...
[Research-focused response with latest trends, studies, market data]

🤖 developer responding...  
[Development-focused response with technical implementation details, performance comparisons]

🤖 analyst responding...
[Analysis-focused response with decision matrix, risk assessment, recommendations]
```

## Agent Card Layout

### Before (horizontal layout):
```
[Agent Name] [Description...] [Load] [Delete]
```

### After (vertical layout):
```
┌─────────────────────────────────────────┐
│ Agent Name                              │
│ Provider: OpenAI                        │
│ Model: gpt-4o-mini                      │
│ MCP Servers: 2                          │
│ Tools: 5 available                      │
│ Description: Research specialist        │
├─────────────────────────────────────────┤
│ ☑ Enable for queries    [Load] [Delete] │
└─────────────────────────────────────────┘
```

## Benefits

### 1. Diverse Perspectives
Each agent can have different:
- System prompts
- Available functions/tools
- MCP server connections
- Model configurations

### 2. Specialized Responses
- **Research Agent**: Focus on gathering information
- **Technical Agent**: Focus on implementation details  
- **Creative Agent**: Focus on innovative solutions
- **Analysis Agent**: Focus on evaluation and comparison

### 3. Comprehensive Coverage
Multi-agent queries provide:
- Multiple viewpoints on complex topics
- Specialized expertise per domain
- More thorough analysis
- Better decision support

## Technical Implementation

### Performance Optimizations
- Uses `AgentOrchestrator.switchToAgent()` for fast switching
- Leverages `AgentCache` for instant agent loading
- Background preloading of enabled agents
- Differential loading (only changed configurations)

### Agent State Management
- Enabled agents stored in `localStorage` as `enabled_agents`
- Checkbox states synchronized with storage
- Original agent restored after multi-agent query completes

### Error Handling
- Graceful handling of agent loading failures
- Continuation to next agent if one fails
- Clear error messages in chat
- Automatic fallback mechanisms

## Browser Console Testing

Open browser console and try these commands:

```javascript
// Check enabled agents
window.aiHackare.getEnabledAgents()

// Enable specific agents
window.aiHackare.setEnabledAgents(['researcher', 'coder'])

// Toggle agent manually
window.aiHackare.toggleAgentEnabled('analyst', true)

// Test agent switching
await window.AgentOrchestrator.switchToAgent('researcher')

// Check orchestrator metrics
window.AgentOrchestrator.getMetrics()
```

## Configuration Tips

### Creating Effective Agent Teams

1. **Complementary Specializations**: Ensure agents have different strengths
2. **Clear Role Definition**: Use descriptive names and system prompts
3. **Balanced Team Size**: 2-4 agents work best for most queries
4. **Tool Diversity**: Distribute different tools across agents

### Example Agent Configurations

**Research Agent:**
- System Prompt: "You are a research specialist focused on finding accurate, up-to-date information..."
- Tools: Web search, data analysis functions
- MCP: GitHub for accessing repositories

**Development Agent:**  
- System Prompt: "You are a senior software developer focused on practical implementation..."
- Tools: Code generation, testing, debugging functions
- MCP: GitHub for code operations

**Strategy Agent:**
- System Prompt: "You are a strategic advisor focused on high-level planning and decision making..."
- Tools: Analysis and planning functions
- MCP: Project management integrations

## Troubleshooting

### Multi-Agent Mode Not Activating
- Ensure 2+ agents are enabled (checked)
- Refresh the agent list if needed
- Check browser console for errors

### Agent Switching Failures
- Verify agents exist and are properly saved
- Check that agent configurations are valid
- Ensure required services are loaded

### Performance Issues
- Reduce number of enabled agents
- Use agent preloading: `AgentOrchestrator.prepareAgents(['agent1', 'agent2'])`
- Check cache performance: `AgentCache.getMetrics()`

The multi-agent system transforms hacka.re from a single-agent interface into a powerful multi-perspective AI consultation platform! 🎭✨