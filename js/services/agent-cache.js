/**
 * Agent Cache Service
 * High-performance in-memory caching for agent configurations
 * Enables rapid agent switching and multi-agent orchestration
 */

window.AgentCache = (function() {
    
    // In-memory cache for agent configurations
    const agentConfigCache = new Map();
    
    // Cache for parsed agent states to avoid reprocessing
    const agentStateCache = new Map();
    
    // Background preload queue
    const preloadQueue = new Set();
    
    // Performance metrics
    const metrics = {
        cacheHits: 0,
        cacheMisses: 0,
        preloadCount: 0,
        avgLoadTime: 0
    };
    
    // Cache configuration
    const CACHE_CONFIG = {
        MAX_CACHED_AGENTS: 10,
        PRELOAD_TIMEOUT: 30000, // 30 seconds
        STATE_COMPARISON_DEPTH: 3
    };
    
    /**
     * Get cached agent configuration
     * @param {string} agentName - Name of the agent
     * @returns {Object|null} Cached configuration or null if not found
     */
    function getCachedConfiguration(agentName) {
        const startTime = performance.now();
        
        if (agentConfigCache.has(agentName)) {
            const cached = agentConfigCache.get(agentName);
            
            // Check if cache is still valid (not expired)
            const now = Date.now();
            if (cached.expiresAt > now) {
                metrics.cacheHits++;
                console.log(`🚀 AgentCache: Cache HIT for "${agentName}" (${(performance.now() - startTime).toFixed(2)}ms)`);
                return cached.config;
            } else {
                // Cache expired, remove it
                agentConfigCache.delete(agentName);
                agentStateCache.delete(agentName);
                console.log(`⏰ AgentCache: Cache EXPIRED for "${agentName}"`);
            }
        }
        
        metrics.cacheMisses++;
        console.log(`❌ AgentCache: Cache MISS for "${agentName}" (${(performance.now() - startTime).toFixed(2)}ms)`);
        return null;
    }
    
    /**
     * Store agent configuration in cache
     * @param {string} agentName - Name of the agent
     * @param {Object} config - Agent configuration to cache
     * @param {number} ttl - Time to live in milliseconds (default: 10 minutes)
     */
    function cacheConfiguration(agentName, config, ttl = 600000) {
        const startTime = performance.now();
        
        // Enforce cache size limit
        if (agentConfigCache.size >= CACHE_CONFIG.MAX_CACHED_AGENTS) {
            // Remove oldest cached agent
            const oldestKey = agentConfigCache.keys().next().value;
            agentConfigCache.delete(oldestKey);
            agentStateCache.delete(oldestKey);
            console.log(`🗑️ AgentCache: Evicted oldest cache entry "${oldestKey}"`);
        }
        
        const cachedEntry = {
            config: structuredClone(config), // Deep clone to prevent mutations
            cachedAt: Date.now(),
            expiresAt: Date.now() + ttl,
            accessCount: 0
        };
        
        agentConfigCache.set(agentName, cachedEntry);
        
        console.log(`💾 AgentCache: Cached "${agentName}" (${(performance.now() - startTime).toFixed(2)}ms, TTL: ${ttl/1000}s)`);
        
        // Update access count for LRU tracking
        cachedEntry.accessCount++;
    }
    
    /**
     * Get current application state for comparison
     * @returns {Object} Current state snapshot
     */
    function getCurrentStateSnapshot() {
        const state = {};
        
        try {
            // LLM state
            if (DataService) {
                state.llm = {
                    apiKey: DataService.getApiKey?.() || null,
                    model: DataService.getModel?.() || null,
                    baseUrl: DataService.getBaseUrl?.() || null,
                    provider: DataService.getBaseUrlProvider?.() || null
                };
            }
            
            // Function state
            if (window.FunctionToolsService) {
                state.functions = {
                    enabled: window.FunctionToolsService.getEnabledFunctionNames?.() || [],
                    toolsEnabled: window.FunctionToolsService.isFunctionToolsEnabled?.() || false,
                    library: Object.keys(window.FunctionToolsService.getJsFunctions?.() || {})
                };
            }
            
            // MCP state
            if (window.MCPServiceConnectors) {
                try {
                    const services = window.MCPServiceConnectors.getConnectedServices?.() || [];
                    state.mcp = {
                        connectedServices: services.map(s => s.key)
                    };
                } catch (error) {
                    state.mcp = { connectedServices: [] };
                }
            }
            
            // Prompt state
            if (PromptsService) {
                state.prompts = {
                    selectedIds: PromptsService.getSelectedPromptIds?.() || [],
                    librarySize: Object.keys(PromptsService.getPrompts?.() || {}).length
                };
            }
            
        } catch (error) {
            console.warn('AgentCache: Error getting current state snapshot:', error);
        }
        
        return state;
    }
    
    /**
     * Compare two states and return differences
     * @param {Object} currentState - Current application state
     * @param {Object} targetState - Target agent state
     * @returns {Object} Differences object with sections that need updating
     */
    function compareStates(currentState, targetState) {
        const differences = {
            hasChanges: false,
            sections: {
                llm: false,
                functions: false,
                mcp: false,
                prompts: false
            },
            details: {}
        };
        
        // Compare LLM configuration
        if (targetState.llm && currentState.llm) {
            const llmChanged = 
                currentState.llm.apiKey !== targetState.llm.apiKey ||
                currentState.llm.model !== targetState.llm.model ||
                currentState.llm.baseUrl !== targetState.llm.baseUrl ||
                currentState.llm.provider !== targetState.llm.provider;
                
            if (llmChanged) {
                differences.sections.llm = true;
                differences.hasChanges = true;
                differences.details.llm = {
                    from: currentState.llm,
                    to: targetState.llm
                };
            }
        }
        
        // Compare function configuration
        if (targetState.functions && currentState.functions) {
            const functionsChanged = 
                JSON.stringify(currentState.functions.enabled.sort()) !== 
                JSON.stringify(targetState.functions.enabled.sort()) ||
                currentState.functions.toolsEnabled !== targetState.functions.toolsEnabled;
                
            if (functionsChanged) {
                differences.sections.functions = true;
                differences.hasChanges = true;
                differences.details.functions = {
                    enabledFrom: currentState.functions.enabled,
                    enabledTo: targetState.functions.enabled,
                    toolsEnabledFrom: currentState.functions.toolsEnabled,
                    toolsEnabledTo: targetState.functions.toolsEnabled
                };
            }
        }
        
        // Compare MCP configuration
        if (targetState.mcp && currentState.mcp) {
            const mcpChanged = 
                JSON.stringify(currentState.mcp.connectedServices.sort()) !== 
                JSON.stringify(targetState.mcp.connectedServices.sort());
                
            if (mcpChanged) {
                differences.sections.mcp = true;
                differences.hasChanges = true;
                differences.details.mcp = {
                    from: currentState.mcp.connectedServices,
                    to: targetState.mcp.connectedServices
                };
            }
        }
        
        return differences;
    }
    
    /**
     * Cache the current application state for an agent
     * @param {string} agentName - Name of the agent
     */
    function cacheCurrentState(agentName) {
        const currentState = getCurrentStateSnapshot();
        agentStateCache.set(agentName, {
            state: currentState,
            timestamp: Date.now()
        });
        
        console.log(`📸 AgentCache: Cached current state for "${agentName}"`);
    }
    
    /**
     * Get cached state for an agent
     * @param {string} agentName - Name of the agent
     * @returns {Object|null} Cached state or null if not found
     */
    function getCachedState(agentName) {
        return agentStateCache.get(agentName)?.state || null;
    }
    
    /**
     * Add agent to background preload queue
     * @param {string} agentName - Name of the agent to preload
     * @param {number} priority - Priority level (higher = more important)
     */
    function queueForPreload(agentName, priority = 1) {
        if (!preloadQueue.has(agentName)) {
            preloadQueue.add(agentName);
            console.log(`⏳ AgentCache: Queued "${agentName}" for background preload (priority: ${priority})`);
            
            // Start preloading immediately if queue was empty
            if (preloadQueue.size === 1) {
                processPreloadQueue();
            }
        }
    }
    
    /**
     * Process the background preload queue
     */
    async function processPreloadQueue() {
        if (preloadQueue.size === 0) return;
        
        console.log(`🔄 AgentCache: Processing preload queue (${preloadQueue.size} agents)`);
        
        for (const agentName of preloadQueue) {
            try {
                // Check if already cached
                if (getCachedConfiguration(agentName)) {
                    console.log(`✅ AgentCache: "${agentName}" already cached, skipping preload`);
                    preloadQueue.delete(agentName);
                    continue;
                }
                
                // Load and cache the agent configuration
                const startTime = performance.now();
                const agent = AgentService.loadAgent(agentName);
                
                if (agent && agent.config) {
                    cacheConfiguration(agentName, agent.config);
                    metrics.preloadCount++;
                    
                    const loadTime = performance.now() - startTime;
                    console.log(`🚀 AgentCache: Preloaded "${agentName}" in ${loadTime.toFixed(2)}ms`);
                    
                    // Update average load time
                    metrics.avgLoadTime = (metrics.avgLoadTime + loadTime) / 2;
                } else {
                    console.warn(`⚠️ AgentCache: Failed to preload "${agentName}" - agent not found`);
                }
                
                preloadQueue.delete(agentName);
                
                // Yield control to prevent blocking
                await new Promise(resolve => setTimeout(resolve, 0));
                
            } catch (error) {
                console.error(`❌ AgentCache: Error preloading "${agentName}":`, error);
                preloadQueue.delete(agentName);
            }
        }
        
        console.log(`✅ AgentCache: Preload queue processing completed`);
    }
    
    /**
     * Invalidate cached data for an agent
     * @param {string} agentName - Name of the agent
     */
    function invalidateAgent(agentName) {
        const wasConfigCached = agentConfigCache.has(agentName);
        const wasStateCached = agentStateCache.has(agentName);
        
        agentConfigCache.delete(agentName);
        agentStateCache.delete(agentName);
        preloadQueue.delete(agentName);
        
        if (wasConfigCached || wasStateCached) {
            console.log(`🗑️ AgentCache: Invalidated cache for "${agentName}"`);
        }
    }
    
    /**
     * Clear all cached data
     */
    function clearAll() {
        const configCount = agentConfigCache.size;
        const stateCount = agentStateCache.size;
        
        agentConfigCache.clear();
        agentStateCache.clear();
        preloadQueue.clear();
        
        // Reset metrics
        metrics.cacheHits = 0;
        metrics.cacheMisses = 0;
        metrics.preloadCount = 0;
        metrics.avgLoadTime = 0;
        
        console.log(`🧹 AgentCache: Cleared all cache (${configCount} configs, ${stateCount} states)`);
    }
    
    /**
     * Get cache statistics and performance metrics
     * @returns {Object} Cache metrics and statistics
     */
    function getMetrics() {
        const hitRate = metrics.cacheHits + metrics.cacheMisses > 0 
            ? (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses) * 100).toFixed(2)
            : '0.00';
            
        return {
            ...metrics,
            hitRate: `${hitRate}%`,
            cachedAgents: agentConfigCache.size,
            queuedForPreload: preloadQueue.size,
            memoryUsage: {
                configCache: agentConfigCache.size,
                stateCache: agentStateCache.size
            }
        };
    }
    
    /**
     * Get all cached agent names
     * @returns {Array<string>} Array of cached agent names
     */
    function getCachedAgentNames() {
        return Array.from(agentConfigCache.keys());
    }
    
    // Public API
    return {
        getCachedConfiguration,
        cacheConfiguration,
        getCurrentStateSnapshot,
        compareStates,
        cacheCurrentState,
        getCachedState,
        queueForPreload,
        processPreloadQueue,
        invalidateAgent,
        clearAll,
        getMetrics,
        getCachedAgentNames
    };
})();