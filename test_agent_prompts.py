#!/usr/bin/env python3
"""
Test script to debug agent system prompt configurations
"""

import asyncio
from playwright.async_api import async_playwright
import json

async def debug_agent_prompts():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        # Setup console logging
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        
        # Navigate to the app
        await page.goto("http://localhost:8000")
        
        # Wait for app to load
        await page.wait_for_selector("body", timeout=10000)
        await asyncio.sleep(2)
        
        # Dismiss welcome modal if present
        try:
            if await page.locator("#welcome-modal").is_visible():
                await page.locator("button:has-text('Get Started')").click()
                await asyncio.sleep(1)
        except:
            pass
        
        # Load the debug script
        with open('/Users/user/dev/hacka.re/debug_agent_prompts.js', 'r') as f:
            debug_script = f.read()
        
        # Execute the debug script
        await page.evaluate(debug_script)
        
        # Wait for debug output
        await asyncio.sleep(3)
        
        # Test specific agent loading functions
        print("\n=== Testing specific agent loading ===")
        
        # Test yesno agent
        yesno_result = await page.evaluate("""
            () => {
                if (window.AgentService && window.AgentService.agentExists('yesno')) {
                    const agent = window.AgentService.loadAgent('yesno');
                    return {
                        exists: true,
                        agent: agent,
                        systemPrompt: agent?.config?.systemPrompt || null,
                        chatSystemPrompt: agent?.config?.chat?.systemPrompt || null,
                        promptsSystemPrompt: agent?.config?.prompts?.systemPrompt || null
                    };
                }
                return { exists: false };
            }
        """)
        
        print("YESNO Agent:")
        print(json.dumps(yesno_result, indent=2, default=str))
        
        # Test lemmethink agent
        lemmethink_result = await page.evaluate("""
            () => {
                if (window.AgentService && window.AgentService.agentExists('lemmethink')) {
                    const agent = window.AgentService.loadAgent('lemmethink');
                    return {
                        exists: true,
                        agent: agent,
                        systemPrompt: agent?.config?.systemPrompt || null,
                        chatSystemPrompt: agent?.config?.chat?.systemPrompt || null,
                        promptsSystemPrompt: agent?.config?.prompts?.systemPrompt || null
                    };
                }
                return { exists: false };
            }
        """)
        
        print("\nLEMMETHINK Agent:")
        print(json.dumps(lemmethink_result, indent=2, default=str))
        
        # Test AgentContextManager system prompt retrieval
        context_test = await page.evaluate("""
            () => {
                if (!window.AgentContextManager || !window.AgentService) {
                    return { available: false };
                }
                
                const results = {};
                
                // Test yesno
                if (window.AgentService.agentExists('yesno')) {
                    const agent = window.AgentService.loadAgent('yesno');
                    window.AgentContextManager.switchToAgent('yesno', agent.config);
                    results.yesno = {
                        contextPrompt: window.AgentContextManager.getCurrentSystemPrompt(),
                        isInContext: window.AgentContextManager.isInAgentContext(),
                        localStorage: localStorage.getItem('system_prompt')
                    };
                }
                
                // Test lemmethink
                if (window.AgentService.agentExists('lemmethink')) {
                    const agent = window.AgentService.loadAgent('lemmethink');
                    window.AgentContextManager.switchToAgent('lemmethink', agent.config);
                    results.lemmethink = {
                        contextPrompt: window.AgentContextManager.getCurrentSystemPrompt(),
                        isInContext: window.AgentContextManager.isInAgentContext(),
                        localStorage: localStorage.getItem('system_prompt')
                    };
                }
                
                return { available: true, results: results };
            }
        """)
        
        print("\nCONTEXT MANAGER TEST:")
        print(json.dumps(context_test, indent=2, default=str))
        
        # Check default prompts service
        default_prompts_test = await page.evaluate("""
            () => {
                if (!window.DefaultPromptsService) {
                    return { available: false };
                }
                
                const allPrompts = window.DefaultPromptsService.getAllPrompts();
                const agentPrompts = {};
                
                // Look for agent-related prompts
                Object.keys(allPrompts).forEach(key => {
                    if (key.includes('yesno') || key.includes('lemmethink') || key.includes('agent')) {
                        agentPrompts[key] = allPrompts[key];
                    }
                });
                
                return {
                    available: true,
                    totalPrompts: Object.keys(allPrompts).length,
                    agentRelatedPrompts: agentPrompts
                };
            }
        """)
        
        print("\nDEFAULT PROMPTS TEST:")
        print(json.dumps(default_prompts_test, indent=2, default=str))
        
        # Keep browser open for manual inspection
        print("\n=== Browser will remain open for manual inspection ===")
        print("Use browser console to run: debugAgentData('yesno') or debugAgentData('lemmethink')")
        await asyncio.sleep(30)  # Keep open for 30 seconds
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(debug_agent_prompts())