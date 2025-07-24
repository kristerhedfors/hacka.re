/**
 * Agent Loader Demonstration Script
 * 
 * Demonstrates the state-preserving agent loading system
 * This script can be used for testing and showcasing the agent functionality
 */

window.AgentLoaderDemo = (function() {
    'use strict';
    
    const Logger = window.FunctionToolsLogger || {
        log: console.log.bind(console),
        error: console.error.bind(console),
        warn: console.warn.bind(console)
    };
    
    /**
     * Run a demonstration of the agent loading system
     */
    async function runDemo() {
        if (!window.AgentLoader) {
            Logger.error('AgentLoaderDemo: AgentLoader not available');
            return;
        }
        
        Logger.log('🚀 Starting Agent Loader Demonstration');
        
        // Show current state
        showCurrentState();
        
        // Show available agents
        showAvailableAgents();
        
        // Demonstrate loading different agents
        await demonstrateAgentSwitching();
        
        Logger.log('✅ Agent Loader Demonstration Complete');
    }
    
    /**
     * Show current system state
     */
    function showCurrentState() {
        Logger.log('📊 Current System State:');
        
        const currentState = window.AgentLoader.getCurrentState();
        Logger.log('- MCP Services:', currentState.mcpServices);
        Logger.log('- Available Functions:', currentState.functions);
        Logger.log('- Enabled Functions:', currentState.enabledFunctions);
        
        const currentAgent = window.AgentLoader.getCurrentAgent();
        if (currentAgent) {
            Logger.log('- Current Agent:', currentAgent.name);
        } else {
            Logger.log('- Current Agent: None');
        }
    }
    
    /**
     * Show available agents
     */
    function showAvailableAgents() {
        Logger.log('🤖 Available Agents:');
        
        const agents = window.AgentLoader.getAvailableAgents();
        agents.forEach(agent => {
            Logger.log(`- ${agent.name} (${agent.id}):`, agent.description);
            Logger.log(`  Requires ${agent.requirements.mcpServices.length} MCP services, ${agent.requirements.functions.length} functions`);
        });
    }
    
    /**
     * Demonstrate agent switching with state preservation
     */
    async function demonstrateAgentSwitching() {
        Logger.log('🔄 Demonstrating Agent Switching:');
        
        const agents = window.AgentLoader.getAvailableAgents();
        
        // Try loading different agents to show state preservation
        for (const agent of agents.slice(0, 3)) { // Limit to first 3 agents
            Logger.log(`📝 Loading agent: ${agent.name}`);
            
            const messages = [];
            const addSystemMessage = (message) => {
                messages.push(message);
                Logger.log(`   💬 ${message}`);
            };
            
            const success = await window.AgentLoader.loadAgent(agent.id, addSystemMessage);
            
            if (success) {
                Logger.log(`   ✅ Successfully loaded ${agent.name}`);
                
                // Show the current state after loading
                const newState = window.AgentLoader.getCurrentState();
                Logger.log('   📊 New state:', {
                    mcpServices: newState.mcpServices.length,
                    enabledFunctions: newState.enabledFunctions.length
                });
            } else {
                Logger.log(`   ❌ Failed to load ${agent.name}`);
            }
            
            // Wait a bit between agent switches
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    /**
     * Create a custom demo agent
     */
    function createDemoAgent() {
        if (!window.AgentLoader) return false;
        
        const demoAgent = {
            id: 'demo_agent',
            name: 'Demo Agent',
            description: 'A demonstration agent showing state preservation capabilities',
            version: '1.0.0',
            requirements: {
                mcpServices: ['github'], // Requires GitHub MCP
                functions: ['rc4_encrypt', 'rc4_decrypt'], // Requires RC4 functions
                functionCollections: {
                    'demo_tools': ['rc4_encrypt', 'rc4_decrypt']
                }
            },
            settings: {
                systemPrompt: 'You are a demo agent showcasing the state-preserving agent loading system. You have access to GitHub tools and RC4 encryption functions.',
                model: 'gpt-4o-mini',
                provider: 'openai'
            },
            metadata: {
                createdAt: Date.now(),
                lastUsed: 0,
                author: 'demo'
            }
        };
        
        const registered = window.AgentLoader.registerAgent(demoAgent);
        if (registered) {
            Logger.log('✅ Demo agent registered successfully');
        } else {
            Logger.log('❌ Failed to register demo agent');
        }
        
        return registered;
    }
    
    /**
     * Test state comparison functionality
     */
    function testStateComparison() {
        if (!window.AgentLoader) return;
        
        Logger.log('🔍 Testing State Comparison:');
        
        const agents = window.AgentLoader.getAvailableAgents();
        const currentState = window.AgentLoader.getCurrentState();
        
        agents.forEach(agent => {
            const comparison = window.AgentLoader.compareStateWithRequirements(agent, currentState);
            
            Logger.log(`Agent: ${agent.name}`);
            Logger.log('- Changes required:', comparison.requiresChanges);
            if (comparison.requiresChanges) {
                Logger.log('- MCP to connect:', comparison.mcpChanges.toConnect);
                Logger.log('- MCP to disconnect:', comparison.mcpChanges.toDisconnect);
                Logger.log('- Functions to enable:', comparison.functionChanges.toEnable);
                Logger.log('- Functions to disable:', comparison.functionChanges.toDisable);
            }
        });
    }
    
    /**
     * Performance test of agent loading
     */
    async function performanceTest() {
        if (!window.AgentLoader) return;
        
        Logger.log('⚡ Performance Test: Agent Loading Speed');
        
        const agents = window.AgentLoader.getAvailableAgents();
        
        for (const agent of agents) {
            const startTime = performance.now();
            
            const success = await window.AgentLoader.loadAgent(agent.id);
            
            const endTime = performance.now();
            const loadTime = endTime - startTime;
            
            Logger.log(`${agent.name}: ${loadTime.toFixed(2)}ms ${success ? '✅' : '❌'}`);
        }
    }
    
    /**
     * Add demo controls to the page
     */
    function addDemoControls() {
        // Check if controls already exist
        if (document.getElementById('agent-demo-controls')) return;
        
        const controls = document.createElement('div');
        controls.id = 'agent-demo-controls';
        controls.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: var(--surface-color);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 1rem;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            min-width: 200px;
        `;
        
        controls.innerHTML = `
            <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem;">Agent Demo Controls</h4>
            <button id="demo-run-full" class="btn secondary-btn" style="width: 100%; margin-bottom: 0.5rem;">
                Run Full Demo
            </button>
            <button id="demo-show-state" class="btn secondary-btn" style="width: 100%; margin-bottom: 0.5rem;">
                Show Current State
            </button>
            <button id="demo-test-comparison" class="btn secondary-btn" style="width: 100%; margin-bottom: 0.5rem;">
                Test State Comparison
            </button>
            <button id="demo-performance" class="btn secondary-btn" style="width: 100%; margin-bottom: 0.5rem;">
                Performance Test
            </button>
            <button id="demo-create-agent" class="btn secondary-btn" style="width: 100%; margin-bottom: 0.5rem;">
                Create Demo Agent
            </button>
            <button id="demo-close" class="btn secondary-btn" style="width: 100%;">
                Close
            </button>
        `;
        
        // Add event listeners
        controls.querySelector('#demo-run-full').addEventListener('click', runDemo);
        controls.querySelector('#demo-show-state').addEventListener('click', showCurrentState);
        controls.querySelector('#demo-test-comparison').addEventListener('click', testStateComparison);
        controls.querySelector('#demo-performance').addEventListener('click', performanceTest);
        controls.querySelector('#demo-create-agent').addEventListener('click', createDemoAgent);
        controls.querySelector('#demo-close').addEventListener('click', () => controls.remove());
        
        document.body.appendChild(controls);
        
        Logger.log('🎮 Demo controls added to page');
    }
    
    // Public interface
    return {
        runDemo,
        showCurrentState,
        showAvailableAgents,
        testStateComparison,
        performanceTest,
        createDemoAgent,
        addDemoControls
    };
})();

// Auto-add demo controls in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.AgentLoaderDemo.addDemoControls();
        }, 2000);
    });
}