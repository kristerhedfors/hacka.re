"""
Test agent system prompt isolation in multi-agent mode
"""
import pytest
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown
import time


def test_multi_agent_prompt_isolation(page: Page, serve_hacka_re, api_key):
    """Test that each agent uses its own system prompt in multi-agent queries"""
    
    # Navigate to the app
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Close any open modals by pressing Escape
    page.keyboard.press("Escape")
    page.wait_for_timeout(500)
    
    # Set up console logging to debug issues
    console_messages = []
    def log_console_message(msg):
        console_messages.append({
            'type': msg.type,
            'text': msg.text,
            'timestamp': time.time()
        })
        if 'agent' in msg.text.lower() or 'prompt' in msg.text.lower():
            print(f"Console {msg.type}: {msg.text}")
    page.on("console", log_console_message)
    
    # Create two agents with very distinct prompts
    agents_created = page.evaluate("""() => {
        if (!window.AgentService) return 0;
        
        // Create "yesno" agent - only answers with yes or no
        const yesnoConfig = {
            llm: {
                model: localStorage.getItem('selected_model') || 'moonshotai/kimi-k2-instruct',
                apiKey: localStorage.getItem('openai_api_key')
            },
            systemPrompt: 'You can ONLY respond with the word "yes" or "no". No other words are allowed.',
            prompts: {
                selectedIds: [],
                selectedDefaultIds: []
            }
        };
        
        // Create "pirate" agent - speaks like a pirate
        const pirateConfig = {
            llm: {
                model: localStorage.getItem('selected_model') || 'moonshotai/kimi-k2-instruct', 
                apiKey: localStorage.getItem('openai_api_key')
            },
            systemPrompt: 'You are a pirate. Always speak like a pirate using words like "ahoy", "matey", "arr", "ye", etc. Never break character.',
            prompts: {
                selectedIds: [],
                selectedDefaultIds: []
            }
        };
        
        let created = 0;
        if (window.AgentService.saveAgent('yesno', yesnoConfig)) created++;
        if (window.AgentService.saveAgent('pirate', pirateConfig)) created++;
        
        return created;
    }""")
    
    assert agents_created == 2, f"Expected to create 2 agents, but created {agents_created}"
    
    screenshot_with_markdown(page, "agents_created", {
        "Status": "Test agents created",
        "Agents": "yesno (yes/no only), pirate (pirate speak)"
    })
    
    # Open agent configuration modal and enable both agents
    agent_button = page.locator("#agent-config-btn")
    agent_button.click()
    page.wait_for_selector("#agent-config-modal", state="visible", timeout=5000)
    
    # Enable both agents for multi-agent query
    # Look for checkboxes in agent cards
    yesno_checkbox = page.locator('[data-agent="yesno"] .agent-enable-checkbox')
    pirate_checkbox = page.locator('[data-agent="pirate"] .agent-enable-checkbox')
    
    if not yesno_checkbox.is_checked():
        yesno_checkbox.click()
    if not pirate_checkbox.is_checked():
        pirate_checkbox.click()
    
    # Close the modal
    close_button = page.locator("#close-agent-config-modal")
    close_button.click()
    page.wait_for_selector("#agent-config-modal", state="hidden", timeout=5000)
    
    screenshot_with_markdown(page, "agents_enabled", {
        "Status": "Both agents enabled for multi-agent query",
        "Agents": "yesno, pirate"
    })
    
    # Send a test message
    message_input = page.locator("#message-input")
    send_button = page.locator("#send-btn")
    
    test_message = "Do you like treasure?"
    message_input.fill(test_message)
    send_button.click()
    
    # Wait for both agents to respond
    # Look for responses from both agents by checking for assistant messages after agent headers
    page.wait_for_function("""() => {
        const messages = document.querySelectorAll('.message');
        let foundYesno = false;
        let foundPirate = false;
        
        for (let i = 0; i < messages.length - 1; i++) {
            const currentMsg = messages[i].querySelector('.message-content');
            const nextMsg = messages[i + 1];
            
            if (currentMsg && nextMsg) {
                const currentText = currentMsg.textContent;
                const nextRole = nextMsg.querySelector('.message-role');
                
                if (currentText.includes('yesno') && currentText.includes('responding') && 
                    nextRole && nextRole.textContent.includes('Assistant')) {
                    foundYesno = true;
                }
                if (currentText.includes('pirate') && currentText.includes('responding') &&
                    nextRole && nextRole.textContent.includes('Assistant')) {
                    foundPirate = true;
                }
            }
        }
        
        return foundYesno && foundPirate;
    }""", timeout=20000)
    
    # Get all chat messages
    chat_messages = page.evaluate("""() => {
        const messages = [];
        const chatContainer = document.getElementById('chat');
        if (!chatContainer) return messages;
        
        const messageElements = chatContainer.querySelectorAll('.message');
        for (const elem of messageElements) {
            const roleElem = elem.querySelector('.message-role');
            const contentElem = elem.querySelector('.message-content');
            if (roleElem && contentElem) {
                messages.push({
                    role: roleElem.textContent.trim(),
                    content: contentElem.textContent.trim()
                });
            }
        }
        return messages;
    }""")
    
    screenshot_with_markdown(page, "agent_responses", {
        "Status": "Multi-agent responses received",
        "Message Count": str(len(chat_messages)),
        "Test Question": test_message
    })
    
    # Find the agent responses
    yesno_response = None
    pirate_response = None
    
    for i, msg in enumerate(chat_messages):
        # Look for agent headers followed by assistant responses
        if 'yesno' in msg['content'].lower() and 'responding' in msg['content'].lower():
            # Next assistant message should be yesno's response
            for j in range(i+1, len(chat_messages)):
                if chat_messages[j]['role'].lower() == 'assistant':
                    yesno_response = chat_messages[j]['content']
                    break
        elif 'pirate' in msg['content'].lower() and 'responding' in msg['content'].lower():
            # Next assistant message should be pirate's response
            for j in range(i+1, len(chat_messages)):
                if chat_messages[j]['role'].lower() == 'assistant':
                    pirate_response = chat_messages[j]['content']
                    break
    
    print(f"YesNo response: {yesno_response}")
    print(f"Pirate response: {pirate_response}")
    
    # Verify responses match expected agent behavior
    assert yesno_response is not None, "No response found from yesno agent"
    assert pirate_response is not None, "No response found from pirate agent"
    
    # Check if yesno agent only said "yes" or "no"
    yesno_words = yesno_response.lower().strip().split()
    # Remove any punctuation and check if it's just yes or no
    yesno_clean = ''.join(c for c in yesno_response.lower() if c.isalpha())
    is_yesno_valid = yesno_clean in ['yes', 'no']
    
    # Check if pirate agent used pirate language
    pirate_keywords = ['ahoy', 'matey', 'arr', 'ye', 'treasure', 'aye', 'savvy', 'shiver', 'timbers']
    has_pirate_speak = any(keyword in pirate_response.lower() for keyword in pirate_keywords)
    
    screenshot_with_markdown(page, "response_analysis", {
        "YesNo Valid": str(is_yesno_valid),
        "YesNo Response": yesno_response[:100],
        "Has Pirate Speak": str(has_pirate_speak), 
        "Pirate Response": pirate_response[:100]
    })
    
    # Clean up test agents
    page.evaluate("""() => {
        if (window.AgentService) {
            window.AgentService.deleteAgent('yesno');
            window.AgentService.deleteAgent('pirate');
        }
    }""")
    
    # Check for critical errors
    error_messages = [msg for msg in console_messages if msg['type'] == 'error']
    critical_errors = [msg for msg in error_messages if 'agent' in msg['text'].lower() or 'prompt' in msg['text'].lower()]
    
    # Assertions
    assert is_yesno_valid, f"YesNo agent should only respond with 'yes' or 'no', but said: {yesno_response}"
    assert has_pirate_speak, f"Pirate agent should use pirate language, but said: {pirate_response}"
    assert len(critical_errors) == 0, f"Critical errors detected: {critical_errors}"


def test_agent_prompt_persistence(page: Page, serve_hacka_re, api_key):
    """Test that agent prompts don't overwrite global configuration"""
    
    page.goto(serve_hacka_re)
    dismiss_welcome_modal(page)
    
    # Store original global prompt
    original_prompt = page.evaluate("""() => {
        return localStorage.getItem('system_prompt') || '';
    }""")
    
    # Create an agent with a specific prompt
    page.evaluate("""() => {
        const agentConfig = {
            llm: {
                model: localStorage.getItem('selected_model'),
                apiKey: localStorage.getItem('openai_api_key')
            },
            systemPrompt: 'I am a test agent with a unique prompt'
        };
        
        window.AgentService.saveAgent('test_agent', agentConfig);
    }""")
    
    # Apply the agent
    applied = page.evaluate("""async () => {
        return await window.AgentService.applyAgentFast('test_agent');
    }""")
    
    assert applied == True, "Agent should be applied successfully"
    
    # Check that we're in agent context
    in_context = page.evaluate("""async () => {
        return await window.AgentService.isInAgentContext();
    }""")
    
    assert in_context == True, "Should be in agent context"
    
    # Get the current prompt being used
    current_prompt = page.evaluate("""async () => {
        if (window.AgentService.getCurrentAgentSystemPrompt) {
            return await window.AgentService.getCurrentAgentSystemPrompt();
        }
        return null;
    }""")
    
    assert current_prompt == 'I am a test agent with a unique prompt', "Should use agent's prompt"
    
    # Exit agent mode
    exited = page.evaluate("""async () => {
        if (window.AgentOrchestrator && window.AgentOrchestrator.exitAgentMode) {
            return await window.AgentOrchestrator.exitAgentMode();
        }
        return false;
    }""")
    
    assert exited == True, "Should exit agent mode successfully"
    
    # Check that global prompt is restored
    final_prompt = page.evaluate("""() => {
        return localStorage.getItem('system_prompt') || '';
    }""")
    
    assert final_prompt == original_prompt, "Global prompt should be restored"
    
    # Clean up
    page.evaluate("""() => {
        window.AgentService.deleteAgent('test_agent');
    }""")
    
    screenshot_with_markdown(page, "prompt_persistence_test", {
        "Status": "Test completed",
        "Original Prompt": original_prompt[:50] + "..." if len(original_prompt) > 50 else original_prompt,
        "Final Prompt": final_prompt[:50] + "..." if len(final_prompt) > 50 else final_prompt,
        "Match": str(final_prompt == original_prompt)
    })