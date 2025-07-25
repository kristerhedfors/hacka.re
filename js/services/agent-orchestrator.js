/**
 * Agent Orchestrator Service
 * High-level service for managing multiple agents simultaneously
 * Enables rapid agent switching and multi-agent coordination
 */

window.AgentOrchestrator = (function() {
    
    // Active agent sessions
    const activeSessions = new Map();
    
    // Currently loaded agent
    let currentAgent = null;
    
    // Background preload scheduler
    let preloadScheduler = null;
    
    // Performance metrics
    const metrics = {
        totalSwitches: 0,
        avgSwitchTime: 0,
        preloadedAgents: 0,
        sessionCount: 0
    };
    
    /**
     * Initialize the orchestrator
     */
    function initialize() {
        console.log('🎼 AgentOrchestrator: Initializing multi-agent orchestration system');
        
        // Start background preload scheduler
        if (!preloadScheduler) {
            preloadScheduler = setInterval(processPreloadQueue, 1000);
        }
        
        // Set up cache metrics monitoring
        if (window.AgentCache) {
            console.log('🎼 AgentOrchestrator: AgentCache integration enabled');
        } else {
            console.warn('🎼 AgentOrchestrator: AgentCache not available - performance will be reduced');
        }
    }
    
    /**
     * Quickly switch to an agent with optimized loading
     * @param {string} agentName - Name of the agent to switch to
     * @param {Object} options - Switch options
     * @param {boolean} options.preloadNext - Preload next likely agents (default: true)
     * @param {Array<string>} options.preloadList - Specific agents to preload
     * @param {Function} options.onProgress - Progress callback
     * @param {boolean} options.skipIfSame - Skip if already current agent (default: true)
     * @returns {Promise<boolean>} True if successful
     */
    async function switchToAgent(agentName, options = {}) {
        const startTime = performance.now();
        const opts = {
            preloadNext: true,
            preloadList: [],
            onProgress: null,
            skipIfSame: true,
            ...options
        };
        
        try {
            // Skip if already current agent
            if (opts.skipIfSame && currentAgent === agentName) {
                console.log(`🎼 AgentOrchestrator: Already using agent "${agentName}"`);
                opts.onProgress?.('completed', `Agent "${agentName}" already active`);
                return true;
            }
            
            console.log(`🎼 AgentOrchestrator: Switching to agent "${agentName}"`);
            opts.onProgress?.('switching', `Switching to ${agentName}...`);
            
            // Use fast agent loading
            const success = await AgentService.applyAgentFast(agentName, {
                useCache: true,
                differential: true,
                silent: false,
                onProgress: opts.onProgress
            });
            
            if (success) {
                const switchTime = performance.now() - startTime;
                
                // Update current agent
                const previousAgent = currentAgent;
                currentAgent = agentName;
                
                // Update metrics
                metrics.totalSwitches++;
                metrics.avgSwitchTime = (metrics.avgSwitchTime + switchTime) / 2;
                
                console.log(`✅ AgentOrchestrator: Switched to "${agentName}" in ${switchTime.toFixed(2)}ms (from: ${previousAgent || 'none'})`);
                
                // Preload next likely agents in background
                if (opts.preloadNext) {
                    schedulePreloads(agentName, opts.preloadList);
                }
                
                // Create or update session
                updateAgentSession(agentName);
                
                opts.onProgress?.('completed', `Switched to ${agentName} in ${switchTime.toFixed(0)}ms`);
                return true;
                
            } else {
                console.error(`❌ AgentOrchestrator: Failed to switch to agent "${agentName}"`);
                opts.onProgress?.('error', `Failed to switch to ${agentName}`);
                return false;
            }
            
        } catch (error) {
            console.error(`❌ AgentOrchestrator: Error switching to agent "${agentName}":`, error);
            opts.onProgress?.('error', `Error switching to ${agentName}: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Prepare multiple agents for rapid switching
     * @param {Array<string>} agentNames - Names of agents to prepare
     * @param {Object} options - Preparation options
     * @param {boolean} options.background - Load in background (default: true)
     * @param {Function} options.onProgress - Progress callback
     * @returns {Promise<Object>} Results with success/failure counts
     */
    async function prepareAgents(agentNames, options = {}) {
        const opts = {
            background: true,
            onProgress: null,
            ...options
        };
        
        console.log(`🎼 AgentOrchestrator: Preparing ${agentNames.length} agents for rapid switching`);
        
        const results = {
            successful: [],
            failed: [],
            alreadyCached: []
        };
        
        try {
            for (let i = 0; i < agentNames.length; i++) {
                const agentName = agentNames[i];
                opts.onProgress?.('preparing', `Preparing ${agentName} (${i + 1}/${agentNames.length})`);
                
                // Check if already cached
                if (window.AgentCache?.getCachedConfiguration(agentName)) {
                    results.alreadyCached.push(agentName);
                    console.log(`✅ AgentOrchestrator: "${agentName}" already prepared`);
                    continue;
                }
                
                // Preload the agent
                const success = await AgentService.preloadAgent(agentName, 1);
                if (success) {
                    results.successful.push(agentName);
                    console.log(`✅ AgentOrchestrator: "${agentName}" prepared successfully`);
                } else {
                    results.failed.push(agentName);
                    console.warn(`⚠️ AgentOrchestrator: Failed to prepare "${agentName}"`);
                }
                
                // Yield control to prevent blocking
                if (opts.background) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
            
            metrics.preloadedAgents = results.successful.length + results.alreadyCached.length;
            
            console.log(`✅ AgentOrchestrator: Agent preparation completed:`, {
                successful: results.successful.length,
                failed: results.failed.length,
                alreadyCached: results.alreadyCached.length
            });
            
            opts.onProgress?.('completed', `Prepared ${results.successful.length + results.alreadyCached.length}/${agentNames.length} agents`);
            return results;
            
        } catch (error) {
            console.error('❌ AgentOrchestrator: Error preparing agents:', error);
            opts.onProgress?.('error', `Error preparing agents: ${error.message}`);
            return results;
        }
    }
    
    /**
     * Get the currently active agent
     * @returns {string|null} Current agent name or null
     */
    function getCurrentAgent() {
        return currentAgent;
    }
    
    /**
     * Get all prepared (cached) agents ready for instant switching
     * @returns {Array<string>} Array of prepared agent names
     */
    function getPreparedAgents() {
        if (window.AgentCache) {
            return window.AgentCache.getCachedAgentNames();
        }
        return [];
    }
    
    /**
     * Create an isolated agent session without affecting UI
     * @param {string} agentName - Name of the agent
     * @param {Object} options - Session options
     * @returns {Promise<Object>} Agent session object
     */
    async function createAgentSession(agentName, options = {}) {
        try {
            const sessionId = `session_${agentName}_${Date.now()}`;
            
            // Load agent configuration
            const agent = AgentService.loadAgent(agentName);
            if (!agent) {
                throw new Error(`Agent "${agentName}" not found`);
            }
            
            // Create isolated session
            const session = {
                id: sessionId,
                agentName: agentName,
                config: structuredClone(agent.config), // Deep clone for isolation
                created: new Date().toISOString(),
                lastAccessed: new Date().toISOString(),
                isolated: true,
                ...options
            };
            
            activeSessions.set(sessionId, session);
            metrics.sessionCount = activeSessions.size;
            
            console.log(`🎼 AgentOrchestrator: Created isolated session "${sessionId}" for agent "${agentName}"`);
            return session;
            
        } catch (error) {
            console.error(`❌ AgentOrchestrator: Error creating session for "${agentName}":`, error);
            throw error;
        }
    }
    
    /**
     * Update or create agent session
     * @param {string} agentName - Name of the agent
     * @private
     */
    function updateAgentSession(agentName) {
        const sessionId = `current_${agentName}`;
        const session = {
            id: sessionId,
            agentName: agentName,
            current: true,
            lastAccessed: new Date().toISOString()
        };
        
        activeSessions.set(sessionId, session);
        metrics.sessionCount = activeSessions.size;
    }
    
    /**
     * Schedule background preloading of related agents
     * @param {string} currentAgentName - Currently active agent
     * @param {Array<string>} preloadList - Specific agents to preload
     * @private
     */
    function schedulePreloads(currentAgentName, preloadList = []) {
        try {
            const agentsToPreload = new Set(preloadList);
            
            // Add intelligent preload suggestions based on agent usage patterns
            const allAgents = AgentService.listAgents();
            const recentAgents = allAgents
                .filter(agent => agent.name !== currentAgentName)
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                .slice(0, 3)
                .map(agent => agent.name);
            
            recentAgents.forEach(name => agentsToPreload.add(name));
            
            // Schedule preloads
            for (const agentName of agentsToPreload) {
                if (window.AgentCache && !window.AgentCache.getCachedConfiguration(agentName)) {
                    AgentService.preloadAgent(agentName, 1);
                }
            }
            
            if (agentsToPreload.size > 0) {
                console.log(`🎼 AgentOrchestrator: Scheduled preload for ${agentsToPreload.size} agents:`, Array.from(agentsToPreload));
            }
            
        } catch (error) {
            console.warn('AgentOrchestrator: Error scheduling preloads:', error);
        }
    }
    
    /**
     * Process background preload queue
     * @private
     */
    function processPreloadQueue() {
        if (window.AgentCache?.processPreloadQueue) {
            window.AgentCache.processPreloadQueue().catch(error => {
                console.warn('AgentOrchestrator: Error processing preload queue:', error);
            });
        }
    }
    
    /**
     * Get orchestrator performance metrics
     * @returns {Object} Performance metrics
     */
    function getMetrics() {
        const cacheMetrics = window.AgentCache?.getMetrics() || {};
        
        return {
            orchestrator: {
                ...metrics,
                currentAgent: currentAgent,
                activeSessions: activeSessions.size
            },
            cache: cacheMetrics,
            combined: {
                totalPreparedAgents: getPreparedAgents().length,
                avgSwitchTime: metrics.avgSwitchTime,
                cacheEfficiency: cacheMetrics.hitRate || '0.00%'
            }
        };
    }
    
    /**
     * Clear all agent sessions and cache
     */
    function cleanup() {
        console.log('🎼 AgentOrchestrator: Performing cleanup');
        
        // Clear active sessions
        activeSessions.clear();
        
        // Clear cache
        if (window.AgentCache) {
            window.AgentCache.clearAll();
        }
        
        // Reset state
        currentAgent = null;
        
        // Reset metrics
        metrics.totalSwitches = 0;
        metrics.avgSwitchTime = 0;
        metrics.preloadedAgents = 0;
        metrics.sessionCount = 0;
        
        console.log('✅ AgentOrchestrator: Cleanup completed');
    }
    
    /**
     * Exit agent mode and restore global configuration
     */
    function exitAgentMode() {
        console.log('🎼 AgentOrchestrator: Exiting agent mode, restoring global configuration');
        
        try {
            // Restore global configuration
            const restored = AgentService.restoreGlobalConfiguration();
            
            if (restored) {
                currentAgent = null;
                console.log('✅ AgentOrchestrator: Global configuration restored');
                return true;
            } else {
                console.log('⚠️ AgentOrchestrator: No agent context to restore');
                return false;
            }
        } catch (error) {
            console.error('❌ AgentOrchestrator: Error exiting agent mode:', error);
            return false;
        }
    }

    /**
     * Check if currently in agent mode
     */
    function isInAgentMode() {
        return AgentService.isInAgentContext();
    }

    /**
     * Stop the orchestrator and cleanup resources
     */
    function shutdown() {
        console.log('🎼 AgentOrchestrator: Shutting down');
        
        // Exit agent mode if active
        if (isInAgentMode()) {
            exitAgentMode();
        }
        
        // Stop preload scheduler
        if (preloadScheduler) {
            clearInterval(preloadScheduler);
            preloadScheduler = null;
        }
        
        // Cleanup resources
        cleanup();
        
        console.log('✅ AgentOrchestrator: Shutdown completed');
    }
    
    // Initialize when loaded
    initialize();
    
    // Public API
    return {
        switchToAgent,
        prepareAgents,
        getCurrentAgent,
        getPreparedAgents,
        createAgentSession,
        getMetrics,
        cleanup,
        shutdown,
        exitAgentMode,
        isInAgentMode
    };
})();