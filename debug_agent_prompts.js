/**
 * Debug script to investigate agent system prompt configurations
 */

console.log('🔍 DEBUG: Starting agent system prompt investigation...');

// Function to safely get agent data
function debugAgentData(agentName) {
    console.log(`\n=== DEBUG: Investigating agent "${agentName}" ===`);
    
    try {
        // 1. Check if AgentService exists
        if (!window.AgentService) {
            console.error('❌ AgentService not available');
            return;
        }
        
        // 2. Load the agent
        const agent = window.AgentService.loadAgent(agentName);
        console.log(`🔍 Raw agent data for "${agentName}":`, agent);
        
        if (!agent) {
            console.warn(`⚠️ Agent "${agentName}" not found`);
            return;
        }
        
        // 3. Check the structure
        console.log(`📋 Agent structure:`);
        console.log(`  - name: ${agent.name}`);
        console.log(`  - description: ${agent.description}`);
        console.log(`  - agentType: ${agent.agentType}`);
        console.log(`  - createdAt: ${agent.createdAt}`);
        console.log(`  - has config: ${!!agent.config}`);
        
        if (agent.config) {
            console.log(`📋 Config structure:`);
            console.log(`  - llm: ${!!agent.config.llm}`);
            console.log(`  - chat: ${!!agent.config.chat}`);
            console.log(`  - prompts: ${!!agent.config.prompts}`);
            console.log(`  - systemPrompt: ${!!agent.config.systemPrompt}`);
            console.log(`  - functions: ${!!agent.config.functions}`);
            console.log(`  - mcp: ${!!agent.config.mcp}`);
            
            // 4. Check for system prompt in different locations
            console.log(`🎯 System prompt locations:`);
            
            if (agent.config.systemPrompt) {
                console.log(`  - config.systemPrompt: "${agent.config.systemPrompt}"`);
            } else {
                console.log(`  - config.systemPrompt: NOT SET`);
            }
            
            if (agent.config.chat && agent.config.chat.systemPrompt) {
                console.log(`  - config.chat.systemPrompt: "${agent.config.chat.systemPrompt}"`);
            } else {
                console.log(`  - config.chat.systemPrompt: NOT SET`);
            }
            
            if (agent.config.prompts && agent.config.prompts.systemPrompt) {
                console.log(`  - config.prompts.systemPrompt: "${agent.config.prompts.systemPrompt}"`);
            } else {
                console.log(`  - config.prompts.systemPrompt: NOT SET`);
            }
        }
        
        // 5. Check AgentContextManager
        if (window.AgentContextManager) {
            console.log(`🔄 Testing AgentContextManager.getCurrentSystemPrompt():`);
            
            // Switch to this agent context
            window.AgentContextManager.switchToAgent(agentName, agent.config);
            const contextPrompt = window.AgentContextManager.getCurrentSystemPrompt();
            console.log(`  - AgentContextManager system prompt: "${contextPrompt}"`);
            
            // Check if in agent context
            const isInContext = window.AgentContextManager.isInAgentContext();
            console.log(`  - Is in agent context: ${isInContext}`);
            
            const currentContext = window.AgentContextManager.getCurrentContext();
            console.log(`  - Current context:`, currentContext);
        } else {
            console.error('❌ AgentContextManager not available');
        }
        
        // 6. Check localStorage after context switch
        console.log(`💾 localStorage after context switch:`);
        console.log(`  - system_prompt: "${localStorage.getItem('system_prompt')}"`);
        
    } catch (error) {
        console.error(`❌ Error debugging agent "${agentName}":`, error);
    }
}

// Function to debug all agents
function debugAllAgents() {
    console.log('\n🔍 DEBUG: Investigating all agents...');
    
    if (!window.AgentService) {
        console.error('❌ AgentService not available');
        return;
    }
    
    const allAgents = window.AgentService.getAllAgents();
    console.log(`📊 Total agents found: ${Object.keys(allAgents).length}`);
    
    Object.keys(allAgents).forEach(agentName => {
        debugAgentData(agentName);
    });
}

// Function to check specific agent system prompt storage
function checkAgentSystemPrompts() {
    console.log('\n🎯 DEBUG: Checking agent system prompt configurations...');
    
    const testAgents = ['yesno', 'lemmethink'];
    
    testAgents.forEach(agentName => {
        console.log(`\n--- Checking ${agentName} ---`);
        
        if (window.AgentService && window.AgentService.agentExists(agentName)) {
            const agent = window.AgentService.loadAgent(agentName);
            console.log(`Agent loaded:`, !!agent);
            
            if (agent && agent.config) {
                // Look for system prompt in various locations
                const locations = [
                    { path: 'config.systemPrompt', value: agent.config.systemPrompt },
                    { path: 'config.chat.systemPrompt', value: agent.config.chat?.systemPrompt },
                    { path: 'config.prompts.systemPrompt', value: agent.config.prompts?.systemPrompt }
                ];
                
                locations.forEach(location => {
                    if (location.value) {
                        console.log(`✅ Found system prompt at ${location.path}: "${location.value.substring(0, 100)}..."`);
                    } else {
                        console.log(`❌ No system prompt at ${location.path}`);
                    }
                });
                
                // Test context manager
                if (window.AgentContextManager) {
                    window.AgentContextManager.switchToAgent(agentName, agent.config);
                    const contextPrompt = window.AgentContextManager.getCurrentSystemPrompt();
                    console.log(`🔄 Context manager prompt: "${contextPrompt ? contextPrompt.substring(0, 100) + '...' : 'EMPTY'}"`);
                }
            }
        } else {
            console.log(`❌ Agent ${agentName} does not exist`);
        }
    });
}

// Run the debug functions
debugAllAgents();
checkAgentSystemPrompts();

// Export functions for manual testing
window.debugAgentData = debugAgentData;
window.debugAllAgents = debugAllAgents;
window.checkAgentSystemPrompts = checkAgentSystemPrompts;

console.log('\n✅ DEBUG: Agent system prompt investigation complete. Functions available: debugAgentData(), debugAllAgents(), checkAgentSystemPrompts()');