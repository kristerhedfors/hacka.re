/**
 * Orchestration MCP Server
 * Provides dynamic agent invocation tools for orchestrating multi-agent workflows
 */

window.OrchestrationMCPServer = (function() {
    'use strict';

    let isActive = false;
    let activeAgents = new Map();
    let dynamicTools = new Map();
    let orchestrationPrompt = '';

    /**
     * Agent invocation result
     * @typedef {Object} AgentInvocationResult
     * @property {boolean} success - Whether invocation was successful
     * @property {string} response - Agent response or error message
     * @property {string} agentName - Name of the invoked agent
     * @property {Object} metadata - Additional metadata about the invocation
     */

    /**
     * Start the orchestration MCP server
     */
    function start() {
        if (isActive) {
            return;
        }

        console.log('Starting Orchestration MCP Server...');
        isActive = true;
        
        // Initialize with currently active agents
        refreshActiveAgents();
        generateDynamicTools();
        updateOrchestrationPrompt();
        
        // Listen for agent state changes
        document.addEventListener('agentStateChanged', handleAgentStateChange);
        
        console.log('Orchestration MCP Server started successfully');
    }

    /**
     * Stop the orchestration MCP server
     */
    function stop() {
        if (!isActive) {
            return;
        }

        console.log('Stopping Orchestration MCP Server...');
        isActive = false;
        
        // Clear all dynamic tools and state
        activeAgents.clear();
        dynamicTools.clear();
        orchestrationPrompt = '';
        
        // Remove event listeners
        document.removeEventListener('agentStateChanged', handleAgentStateChange);
        
        console.log('Orchestration MCP Server stopped');
    }

    /**
     * Check if server is active
     */
    function isServerActive() {
        return isActive;
    }

    /**
     * Handle agent state changes
     */
    function handleAgentStateChange(event) {
        if (!isActive) return;
        
        console.log('Agent state changed, refreshing orchestration tools...', event.detail);
        refreshActiveAgents();
        generateDynamicTools();
        updateOrchestrationPrompt();
    }

    /**
     * Refresh the list of active agents
     */
    function refreshActiveAgents() {
        if (!window.AgentService) {
            console.warn('AgentService not available');
            return;
        }

        const allAgents = window.AgentService.getAllAgents();
        activeAgents.clear();

        Object.values(allAgents).forEach(agent => {
            // Check if agent is enabled for queries (active)
            if (window.aiHackare && window.aiHackare.isAgentEnabled(agent.name)) {
                activeAgents.set(agent.name, {
                    name: agent.name,
                    description: agent.description || 'No description provided',
                    config: agent.config,
                    capabilities: extractAgentCapabilities(agent)
                });
            }
        });

        console.log(`Refreshed active agents: ${activeAgents.size} agents active`);
    }

    /**
     * Extract capabilities from agent configuration
     */
    function extractAgentCapabilities(agent) {
        const capabilities = [];
        
        if (agent.config?.prompts?.systemPrompt) {
            capabilities.push('Custom system prompt');
        }
        
        if (agent.config?.mcp?.connections && Object.keys(agent.config.mcp.connections).length > 0) {
            capabilities.push(`MCP tools (${Object.keys(agent.config.mcp.connections).length} servers)`);
        }
        
        if (agent.config?.functionCalling?.functions && agent.config.functionCalling.functions.length > 0) {
            capabilities.push(`Custom functions (${agent.config.functionCalling.functions.length})`);
        }
        
        if (agent.config?.llm?.model) {
            capabilities.push(`Model: ${agent.config.llm.model}`);
        }
        
        return capabilities;
    }

    /**
     * Generate dynamic tools for each active agent
     */
    function generateDynamicTools() {
        dynamicTools.clear();

        activeAgents.forEach(agent => {
            const toolName = `invoke_${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_agent`;
            
            const toolDefinition = {
                name: toolName,
                displayName: `Invoke ${agent.name}`,
                description: `Invoke the ${agent.name} agent to handle specific tasks. ${agent.description}`,
                category: 'orchestration',
                parameters: {
                    type: 'object',
                    properties: {
                        task: {
                            type: 'string',
                            description: 'The task or query to send to the agent'
                        },
                        context: {
                            type: 'string',
                            description: 'Optional additional context for the task'
                        }
                    },
                    required: ['task']
                },
                handler: (params) => invokeAgent(agent.name, params),
                requiredScopes: [],
                tags: ['agent', 'orchestration', agent.name.toLowerCase()],
                provider: 'orchestration',
                examples: [
                    {
                        description: `Ask ${agent.name} to handle a task`,
                        parameters: {
                            task: 'Example task for this agent',
                            context: 'Additional context if needed'
                        }
                    }
                ],
                enabled: true,
                priority: 1,
                capabilities: agent.capabilities
            };

            dynamicTools.set(toolName, toolDefinition);
        });

        console.log(`Generated ${dynamicTools.size} dynamic agent tools`);
    }

    /**
     * Invoke a specific agent with a task
     */
    async function invokeAgent(agentName, params) {
        try {
            if (!activeAgents.has(agentName)) {
                return {
                    success: false,
                    response: `Agent '${agentName}' is not currently active`,
                    agentName: agentName,
                    metadata: { error: 'agent_not_active' }
                };
            }

            const agent = activeAgents.get(agentName);
            console.log(`Invoking agent: ${agentName}`, params);

            // Load the agent configuration temporarily
            const currentConfig = window.ConfigurationService ? window.ConfigurationService.getConfiguration() : null;
            
            // Apply agent configuration
            if (window.aiHackare && agent.config) {
                await window.aiHackare.loadAgentConfiguration(agent.config);
            }

            // Create the invocation prompt
            const invocationPrompt = createInvocationPrompt(agent, params.task, params.context);

            // Use the chat manager to get response from the agent
            const response = await getAgentResponse(invocationPrompt);

            // Restore original configuration if we had one
            if (currentConfig && window.aiHackare) {
                await window.aiHackare.loadAgentConfiguration(currentConfig);
            }

            return {
                success: true,
                response: response,
                agentName: agentName,
                metadata: {
                    task: params.task,
                    context: params.context,
                    capabilities: agent.capabilities
                }
            };

        } catch (error) {
            console.error(`Error invoking agent ${agentName}:`, error);
            return {
                success: false,
                response: `Error invoking agent: ${error.message}`,
                agentName: agentName,
                metadata: { error: error.message }
            };
        }
    }

    /**
     * Create invocation prompt for agent
     */
    function createInvocationPrompt(agent, task, context) {
        let prompt = `Task: ${task}`;
        
        if (context) {
            prompt += `\n\nAdditional Context: ${context}`;
        }
        
        // Add agent-specific context if available
        if (agent.description) {
            prompt += `\n\nNote: You are specialized in: ${agent.description}`;
        }
        
        return prompt;
    }

    /**
     * Get response from agent using chat manager
     */
    async function getAgentResponse(prompt) {
        return new Promise((resolve, reject) => {
            if (!window.aiHackare || !window.aiHackare.chatManager) {
                reject(new Error('Chat manager not available'));
                return;
            }

            // Create a temporary response handler
            const originalHandler = window.aiHackare.chatManager.onMessageComplete;
            let responseText = '';

            window.aiHackare.chatManager.onMessageComplete = (response) => {
                responseText = response;
                // Restore original handler
                window.aiHackare.chatManager.onMessageComplete = originalHandler;
                resolve(responseText);
            };

            // Send the message to the agent
            window.aiHackare.chatManager.sendMessage(prompt);
        });
    }

    /**
     * Update orchestration prompt with current agent capabilities
     */
    function updateOrchestrationPrompt() {
        if (activeAgents.size === 0) {
            orchestrationPrompt = 'No active agents available for orchestration.';
            return;
        }

        let prompt = '# Agent Orchestration System\n\n';
        prompt += 'You are an orchestration agent with access to the following specialized agents:\n\n';

        activeAgents.forEach(agent => {
            prompt += `## ${agent.name}\n`;
            prompt += `**Description:** ${agent.description}\n`;
            
            if (agent.capabilities.length > 0) {
                prompt += `**Capabilities:** ${agent.capabilities.join(', ')}\n`;
            }
            
            const toolName = `invoke_${agent.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_agent`;
            prompt += `**Tool:** Use \`${toolName}(task, context?)\` to invoke this agent\n\n`;
        });

        prompt += '## Your Role\n';
        prompt += 'Coordinate these agents to handle complex tasks that require multiple specializations. ';
        prompt += 'Break down user requests into appropriate subtasks and route them to the most suitable agents. ';
        prompt += 'Synthesize their responses into a coherent final answer.';

        orchestrationPrompt = prompt;
        console.log('Updated orchestration prompt for', activeAgents.size, 'agents');
    }

    /**
     * Get current orchestration prompt
     */
    function getOrchestrationPrompt() {
        return orchestrationPrompt;
    }

    /**
     * Get all dynamic tools
     */
    function getDynamicTools() {
        return Array.from(dynamicTools.values());
    }

    /**
     * Get active agents info
     */
    function getActiveAgents() {
        return Array.from(activeAgents.values());
    }

    // Public API
    return {
        start: start,
        stop: stop,
        isActive: isServerActive,
        getOrchestrationPrompt: getOrchestrationPrompt,
        getDynamicTools: getDynamicTools,
        getActiveAgents: getActiveAgents,
        refreshActiveAgents: refreshActiveAgents
    };
})();