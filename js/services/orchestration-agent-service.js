/**
 * Orchestration Agent Service
 * Manages the built-in orchestration agent that appears in the Agent modal
 */

window.OrchestrationAgentService = (function() {
    'use strict';

    const ORCHESTRATION_AGENT_ID = '__orchestration_agent';
    let isEnabled = false;

    /**
     * Get the orchestration agent definition
     */
    function getOrchestrationAgent() {
        return {
            id: ORCHESTRATION_AGENT_ID,
            name: 'Orchestration Agent',
            description: 'Coordinates and manages multiple specialized agents for complex tasks',
            isBuiltIn: true,
            isOrchestrator: true,
            agentType: 'orchestrator',
            config: {
                llm: {
                    provider: 'current', // Use current provider settings
                    model: 'current'     // Use current model settings
                },
                prompts: {
                    systemPrompt: () => window.OrchestrationMCPServer.getOrchestrationPrompt()
                },
                mcp: {
                    connections: {
                        orchestration: {
                            name: 'orchestration',
                            description: 'Dynamic agent orchestration tools',
                            enabled: true,
                            provider: 'orchestration-mcp-server'
                        }
                    }
                },
                functionCalling: {
                    enabled: true,
                    functions: [] // Will be populated by MCP server
                }
            },
            capabilities: [
                'Multi-agent coordination',
                'Task decomposition',
                'Dynamic agent invocation',
                'Response synthesis'
            ],
            metadata: {
                version: '1.0.0',
                createdAt: new Date().toISOString(),
                builtIn: true,
                category: 'orchestration'
            }
        };
    }

    /**
     * Enable the orchestration agent
     */
    function enable() {
        if (isEnabled) {
            console.log('Orchestration agent is already enabled');
            return;
        }

        console.log('Enabling orchestration agent...');
        
        // Start the MCP server
        if (window.OrchestrationMCPServer) {
            window.OrchestrationMCPServer.start();
        }
        
        isEnabled = true;
        
        // Dispatch event for UI updates
        document.dispatchEvent(new CustomEvent('orchestrationAgentEnabled', {
            detail: { enabled: true }
        }));
        
        console.log('Orchestration agent enabled successfully');
    }

    /**
     * Disable the orchestration agent
     */
    function disable() {
        if (!isEnabled) {
            console.log('Orchestration agent is already disabled');
            return;
        }

        console.log('Disabling orchestration agent...');
        
        // Stop the MCP server
        if (window.OrchestrationMCPServer) {
            window.OrchestrationMCPServer.stop();
        }
        
        isEnabled = false;
        
        // Dispatch event for UI updates
        document.dispatchEvent(new CustomEvent('orchestrationAgentEnabled', {
            detail: { enabled: false }
        }));
        
        console.log('Orchestration agent disabled');
    }

    /**
     * Check if orchestration agent is enabled
     */
    function isOrchestrationEnabled() {
        return isEnabled;
    }

    /**
     * Load orchestration agent configuration
     */
    async function loadOrchestrationAgent() {
        try {
            console.log('Loading orchestration agent configuration...');
            
            const orchestrationAgent = getOrchestrationAgent();
            
            // Enable if not already enabled
            if (!isEnabled) {
                enable();
            }
            
            // Apply the configuration
            if (window.ConfigurationService) {
                // Get current configuration as base
                const currentConfig = window.ConfigurationService.getConfiguration();
                
                // Merge orchestration config
                const orchestrationConfig = {
                    ...currentConfig,
                    prompts: {
                        ...currentConfig.prompts,
                        systemPrompt: window.OrchestrationMCPServer.getOrchestrationPrompt()
                    },
                    mcp: {
                        ...currentConfig.mcp,
                        connections: {
                            ...currentConfig.mcp?.connections,
                            ...orchestrationAgent.config.mcp.connections
                        }
                    }
                };
                
                // Load the merged configuration
                await window.ConfigurationService.loadConfiguration(orchestrationConfig);
            }
            
            console.log('Orchestration agent configuration loaded successfully');
            return true;
            
        } catch (error) {
            console.error('Error loading orchestration agent:', error);
            return false;
        }
    }

    /**
     * Get orchestration agent status info
     */
    function getStatus() {
        return {
            enabled: isEnabled,
            serverActive: window.OrchestrationMCPServer ? window.OrchestrationMCPServer.isActive() : false,
            activeAgents: window.OrchestrationMCPServer ? window.OrchestrationMCPServer.getActiveAgents().length : 0,
            availableTools: window.OrchestrationMCPServer ? window.OrchestrationMCPServer.getDynamicTools().length : 0
        };
    }

    /**
     * Toggle orchestration agent state
     */
    function toggleOrchestration() {
        if (isEnabled) {
            disable();
        } else {
            enable();
        }
        return isEnabled;
    }

    /**
     * Initialize orchestration agent service
     */
    function init() {
        console.log('Initializing Orchestration Agent Service...');
        
        // Listen for agent state changes to refresh orchestration
        document.addEventListener('agentStateChanged', () => {
            if (isEnabled && window.OrchestrationMCPServer) {
                window.OrchestrationMCPServer.refreshActiveAgents();
            }
        });
        
        console.log('Orchestration Agent Service initialized');
    }

    // Auto-initialize when the page loads
    document.addEventListener('DOMContentLoaded', init);

    // Public API
    return {
        getOrchestrationAgent: getOrchestrationAgent,
        enable: enable,
        disable: disable,
        isEnabled: isOrchestrationEnabled,
        loadOrchestrationAgent: loadOrchestrationAgent,
        getStatus: getStatus,
        toggleOrchestration: toggleOrchestration,
        init: init,
        ORCHESTRATION_AGENT_ID: ORCHESTRATION_AGENT_ID
    };
})();