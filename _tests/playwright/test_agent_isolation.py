"""
Test agent configuration isolation to ensure agents don't affect global settings
"""
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown


def test_agent_configuration_isolation(page: Page, serve_hacka_re, api_key):
    """Test that agents maintain separate configurations without affecting global state"""
    
    # Navigate to the app
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Set up console logging to track configuration changes
    console_messages = []
    def log_console_message(msg):
        console_messages.append({
            'type': msg.type,
            'text': msg.text
        })
    page.on("console", log_console_message)
    
    # Store original global configuration
    original_config = page.evaluate("""() => {
        return {
            model: localStorage.getItem('selected_model'),
            functionToolsEnabled: localStorage.getItem('function_tools_enabled'),
            systemPrompt: localStorage.getItem('system_prompt')
        };
    }""")
    
    screenshot_with_markdown(page, "original_config", {
        "Status": "Captured original global configuration",
        "Model": str(original_config.get('model', 'None')),
        "Function Tools": str(original_config.get('functionToolsEnabled', 'None')),
        "System Prompt Length": str(len(original_config.get('systemPrompt', '') or ''))
    })
    
    # Create and load first test agent
    page.evaluate("""() => {
        // Create a test agent with specific configuration
        const testAgentConfig = {
            llm: {
                model: 'test-model-1',
                temperature: 0.5
            },
            functionCalling: {
                enabled: true,
                functions: ['test_function_1']
            },
            systemPrompt: 'You are test agent 1'
        };
        
        // Save the agent
        if (window.AgentService) {
            window.AgentService.saveAgent('test_agent_1', testAgentConfig, {
                description: 'Test agent for isolation testing'
            });
        }
    }""")
    
    # Apply the first agent
    agent1_applied = page.evaluate("""async () => {
        if (!window.AgentService) return false;
        return await window.AgentService.applyAgentFast('test_agent_1');
    }""")
    
    assert agent1_applied == True, "Agent 1 should be applied successfully"
    
    # Check that agent 1 configuration is applied
    agent1_config = page.evaluate("""async () => {
        return {
            model: localStorage.getItem('selected_model'),
            functionToolsEnabled: localStorage.getItem('function_tools_enabled'),
            systemPrompt: localStorage.getItem('system_prompt'),
            isInAgentContext: window.AgentService ? await window.AgentService.isInAgentContext() : false
        };
    }""")
    
    screenshot_with_markdown(page, "agent1_applied", {
        "Status": "Agent 1 configuration applied",
        "Model": str(agent1_config.get('model', 'None')),
        "Function Tools": str(agent1_config.get('functionToolsEnabled', 'None')),
        "In Agent Context": str(agent1_config.get('isInAgentContext', False)),
        "System Prompt": str(agent1_config.get('systemPrompt', 'None'))[:50] + "..."
    })
    
    # Verify agent context is active
    assert agent1_config['isInAgentContext'] == True, "Should be in agent context"
    assert agent1_config['model'] == 'test-model-1', "Should have agent's model"
    
    # Create and apply second test agent with different configuration
    page.evaluate("""() => {
        const testAgentConfig2 = {
            llm: {
                model: 'test-model-2',
                temperature: 0.8
            },
            functionCalling: {
                enabled: false,
                functions: []
            },
            systemPrompt: 'You are test agent 2'
        };
        
        if (window.AgentService) {
            window.AgentService.saveAgent('test_agent_2', testAgentConfig2, {
                description: 'Second test agent for isolation testing'
            });
        }
    }""")
    
    # Switch to agent 2
    agent2_applied = page.evaluate("""async () => {
        if (!window.AgentOrchestrator) return false;
        return await window.AgentOrchestrator.switchToAgent('test_agent_2');
    }""")
    
    assert agent2_applied == True, "Agent 2 should be applied successfully"
    
    # Check that agent 2 configuration is now applied
    agent2_config = page.evaluate("""() => {
        return {
            model: localStorage.getItem('selected_model'),
            functionToolsEnabled: localStorage.getItem('function_tools_enabled'),
            systemPrompt: localStorage.getItem('system_prompt'),
            currentAgent: window.AgentOrchestrator ? window.AgentOrchestrator.getCurrentAgent() : null
        };
    }""")
    
    screenshot_with_markdown(page, "agent2_applied", {
        "Status": "Agent 2 configuration applied",
        "Model": str(agent2_config.get('model', 'None')),
        "Function Tools": str(agent2_config.get('functionToolsEnabled', 'None')),
        "Current Agent": str(agent2_config.get('currentAgent', 'None')),
        "System Prompt": str(agent2_config.get('systemPrompt', 'None'))[:50] + "..."
    })
    
    # Verify agent 2 configuration is active
    assert agent2_config['model'] == 'test-model-2', "Should have agent 2's model"
    assert agent2_config['functionToolsEnabled'] == 'false', "Should have agent 2's function tools setting"
    assert 'test agent 2' in (agent2_config.get('systemPrompt', '') or ''), "Should have agent 2's system prompt"
    
    # Exit agent mode and restore global configuration
    restored = page.evaluate("""async () => {
        if (!window.AgentOrchestrator) return false;
        return await window.AgentOrchestrator.exitAgentMode();
    }""")
    
    assert restored == True, "Global configuration should be restored successfully"
    
    # Check that original configuration is restored
    final_config = page.evaluate("""async () => {
        return {
            model: localStorage.getItem('selected_model'),
            functionToolsEnabled: localStorage.getItem('function_tools_enabled'),
            systemPrompt: localStorage.getItem('system_prompt'),
            isInAgentContext: window.AgentService ? await window.AgentService.isInAgentContext() : true
        };
    }""")
    
    screenshot_with_markdown(page, "global_restored", {
        "Status": "Global configuration restored",
        "Model": str(final_config.get('model', 'None')),
        "Function Tools": str(final_config.get('functionToolsEnabled', 'None')),
        "In Agent Context": str(final_config.get('isInAgentContext', True)),
        "Original Model": str(original_config.get('model', 'None'))
    })
    
    # Verify global configuration is restored
    assert final_config['isInAgentContext'] == False, "Should not be in agent context"
    assert final_config['model'] == original_config['model'], "Original model should be restored"
    assert final_config['functionToolsEnabled'] == original_config['functionToolsEnabled'], "Original function tools setting should be restored"
    
    # Clean up test agents
    page.evaluate("""() => {
        if (window.AgentService) {
            window.AgentService.deleteAgent('test_agent_1');
            window.AgentService.deleteAgent('test_agent_2');
        }
    }""")
    
    # Check console messages for any errors
    error_messages = [msg for msg in console_messages if msg['type'] == 'error']
    if error_messages:
        print("Console errors detected:")
        for error in error_messages:
            print(f"  - {error['text']}")
    
    # Should have no critical errors
    critical_errors = [msg for msg in error_messages if 'AgentContextManager' in msg['text'] or 'Configuration' in msg['text']]
    assert len(critical_errors) == 0, f"Critical configuration errors detected: {critical_errors}"


def test_multi_agent_isolation(page: Page, serve_hacka_re, api_key):
    """Test that multiple agents can be switched between without configuration leaks"""
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Create multiple test agents with distinct configurations
    agents_created = page.evaluate("""() => {
        const agents = {
            'quick_agent': {
                llm: { model: 'quick-model', temperature: 0.1 },
                systemPrompt: 'Be quick and concise'
            },
            'detailed_agent': {
                llm: { model: 'detailed-model', temperature: 0.9 },
                systemPrompt: 'Be detailed and thorough'
            },
            'function_agent': {
                llm: { model: 'function-model', temperature: 0.5 },
                functionCalling: { enabled: true, functions: ['test_func'] },
                systemPrompt: 'Use functions when appropriate'
            }
        };
        
        let created = 0;
        if (window.AgentService) {
            for (const [name, config] of Object.entries(agents)) {
                if (window.AgentService.saveAgent(name, config)) {
                    created++;
                }
            }
        }
        return created;
    }""")
    
    assert agents_created == 3, "All 3 test agents should be created successfully"
    
    # Test rapid switching between agents
    for agent_name in ['quick_agent', 'detailed_agent', 'function_agent', 'quick_agent']:
        switched = page.evaluate(f"""async () => {{
            if (!window.AgentOrchestrator) return false;
            return await window.AgentOrchestrator.switchToAgent('{agent_name}');
        }}""")
        
        assert switched == True, f"Should successfully switch to {agent_name}"
        
        # Verify correct agent is active
        current_agent = page.evaluate("""() => {
            if (!window.AgentOrchestrator) return null;
            return window.AgentOrchestrator.getCurrentAgent();
        }""")
        
        assert current_agent == agent_name, f"Expected {agent_name} to be active, got {current_agent}"
    
    # Exit agent mode
    exited = page.evaluate("""async () => {
        if (!window.AgentOrchestrator) return false;
        return await window.AgentOrchestrator.exitAgentMode();
    }""")
    
    assert exited == True, "Should successfully exit agent mode"
    
    # Clean up
    page.evaluate("""() => {
        if (window.AgentService) {
            ['quick_agent', 'detailed_agent', 'function_agent'].forEach(name => {
                window.AgentService.deleteAgent(name);
            });
        }
    }""")
    
    screenshot_with_markdown(page, "multi_agent_test_complete", {
        "Status": "Multi-agent isolation test completed successfully",
        "Agents Tested": "quick_agent, detailed_agent, function_agent"
    })