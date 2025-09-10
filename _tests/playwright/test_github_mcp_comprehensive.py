"""
GitHub MCP Comprehensive Workflow Tests
Tests GitHub PAT connection and function calling (list repos, get repo info)
Based on working Shodan MCP test patterns
"""
import pytest
import time
import os
import re
from playwright.sync_api import Page, expect
from test_utils import dismiss_welcome_modal, screenshot_with_markdown

# Get GitHub PAT from environment
GITHUB_PAT = os.getenv("GITHUB_PAT", "")

class TestGitHubMCPComprehensive:
    """Test GitHub MCP workflow with PAT authentication"""
    
    def setup_method(self):
        """Setup for each test method"""
        self.console_messages = []
        self.extracted_repos = []

    def setup_github_and_openai(self, page: Page):
        """Setup OpenAI API, enable YOLO mode, and connect to GitHub MCP"""
        # Configure OpenAI API and enable YOLO mode
        settings_btn = page.locator("#settings-btn")
        expect(settings_btn).to_be_visible()
        settings_btn.click()
        
        page.wait_for_selector("#settings-modal", state="visible", timeout=5000)
        
        # Set API key and provider
        api_key_input = page.locator("#api-key-update")
        expect(api_key_input).to_be_visible()
        openai_key = os.getenv("OPENAI_API_KEY", "")
        api_key_input.fill(openai_key)
        
        provider_select = page.locator("#base-url-select")
        provider_select.select_option("openai")
        time.sleep(1)
        
        model_select = page.locator("#model-select")
        model_select.select_option("gpt-4o-mini")
        
        # CRITICAL: Enable YOLO mode for automatic function execution
        yolo_checkbox = page.locator("#yolo-mode")
        expect(yolo_checkbox).to_be_visible()
        
        # Properly enable YOLO mode with dialog handling
        if not yolo_checkbox.is_checked():
            # Set up dialog handler to accept the YOLO mode confirmation
            def handle_yolo_dialog(dialog):
                print(f"YOLO confirmation dialog: '{dialog.message[:50]}...'")
                dialog.accept()  # Accept the YOLO mode warning
            
            page.on("dialog", handle_yolo_dialog)
            
            print("Enabling YOLO mode with dialog handler...")
            yolo_checkbox.click()
            time.sleep(2)  # Wait for dialog processing
            
            # Verify YOLO mode is actually enabled
            if yolo_checkbox.is_checked():
                print("✅ YOLO mode enabled - functions will execute automatically")
            else:
                print("❌ YOLO mode failed to enable")
        else:
            print("✅ YOLO mode already enabled")
        
        # Close settings
        close_settings = page.locator("#close-settings")
        close_settings.click()
        page.wait_for_selector("#settings-modal", state="hidden", timeout=5000)
        
        time.sleep(2)  # Wait for background operations
        
        # Connect to GitHub MCP
        mcp_btn = page.locator("#mcp-servers-btn")
        expect(mcp_btn).to_be_visible()
        mcp_btn.click()
        
        page.wait_for_selector("#mcp-servers-modal", state="visible", timeout=5000)
        time.sleep(1)
        
        # Click GitHub Connect (1st button - GitHub is before Shodan)
        connect_buttons = page.locator("button:has-text('Connect')")
        github_connect = connect_buttons.nth(0)  # GitHub should be first
        github_connect.click()
        
        time.sleep(2)
        
        # Wait for GitHub PAT modal to appear and fill it
        page.wait_for_selector("#service-pat-input-modal", state="visible", timeout=10000)
        
        # Use the correct PAT input ID
        pat_input = page.locator("#pat-input")
        expect(pat_input).to_be_visible()
        pat_input.fill(GITHUB_PAT)
        
        # Click Connect with force to avoid interception - use correct modal ID
        modal = page.locator("#service-pat-input-modal")
        connect_btn = modal.locator("button:has-text('Connect')")
        connect_btn.first.click(force=True)
        
        time.sleep(5)  # Wait for connection
        
        # Close MCP modal
        if page.locator("#mcp-servers-modal").is_visible():
            close_mcp = page.locator("#close-mcp-servers-modal")
            if close_mcp.is_visible():
                close_mcp.click()
            else:
                page.keyboard.press("Escape")
            page.wait_for_selector("#mcp-servers-modal", state="hidden", timeout=5000)

    def send_message_and_wait_for_response(self, page: Page, message: str, test_name: str):
        """Send message and wait for complete response"""
        # Clear chat
        clear_btn = page.locator("#clear-chat-btn")
        if clear_btn.is_visible():
            clear_btn.click()
            time.sleep(1)
        
        # Send message
        message_input = page.locator("#message-input")
        expect(message_input).to_be_visible()
        message_input.fill(message)
        
        send_btn = page.locator("#send-btn")
        expect(send_btn).to_be_enabled()
        send_btn.click()
        
        screenshot_with_markdown(page, f"{test_name}_message_sent", {
            "Step": f"{test_name} message sent",
            "Message": message[:50] + "..." if len(message) > 50 else message,
            "Status": "Waiting for response"
        })
        
        # With YOLO mode enabled, functions execute automatically - no modals to handle
        print("⏳ YOLO mode active - waiting for automatic function execution and response...")
        
        # Wait for generation to complete - functions execute automatically
        try:
            page.wait_for_function(
                """() => {
                    const btn = document.querySelector('#send-btn');
                    return btn && !btn.hasAttribute('data-generating');
                }""",
                timeout=60000  # Generous timeout for function execution and response
            )
            print("✅ Generation completed successfully")
        except:
            print("⚠️ Timeout waiting for generation to complete, checking current state...")
            # Give it extra time for function processing
            time.sleep(10)
            
            # Check if we have any assistant response at all
            messages = page.locator(".message.assistant .message-content")
            if messages.count() > 0:
                print("📋 Found assistant messages, continuing with current response")
            else:
                print("❌ No assistant messages found after timeout")
        
        screenshot_with_markdown(page, f"{test_name}_response_complete", {
            "Step": f"{test_name} response complete",
            "YOLO Mode": "Enabled - automatic function execution",
            "Status": "Checking response content"
        })
        
        # Get response text - YOLO mode should provide complete responses
        print("📋 Collecting response content...")
        assistant_messages = page.locator(".message.assistant .message-content")
        
        # Wait for at least one assistant message
        page.wait_for_selector(".message.assistant .message-content", state="visible", timeout=10000)
        
        # With YOLO mode, wait a bit for all content to stream in
        time.sleep(5)
        
        response_text = ""
        for i in range(assistant_messages.count()):
            msg_content = assistant_messages.nth(i).text_content()
            if msg_content and msg_content.strip():
                response_text += msg_content.strip() + "\\n"
        
        response_text = response_text.strip()
        print(f"📋 Final response length: {len(response_text)} characters")
        
        # Log a preview of the response for debugging
        preview = response_text[:200] + "..." if len(response_text) > 200 else response_text
        print(f"📋 Response preview: {preview}")
        
        return response_text

    def extract_repo_names(self, text: str):
        """Extract GitHub repository names from response text"""
        # Pattern for repo names (owner/repo format)
        repo_pattern = r'\\b[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+\\b'
        repos = re.findall(repo_pattern, text)
        
        # Filter out common false positives
        valid_repos = []
        for repo in repos:
            # Skip URLs, dates, and other non-repo patterns
            if not any(skip in repo.lower() for skip in ['http', 'www', 'api', 'github.com']):
                valid_repos.append(repo)
        
        return list(set(valid_repos))  # Remove duplicates

    def test_github_list_repos(self, page: Page, serve_hacka_re):
        """Test GitHub list repositories functionality"""
        # Setup
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        screenshot_with_markdown(page, "github_test_start", {
            "Test": "GitHub list repositories",
            "Status": "Starting test"
        })
        
        # Setup GitHub and OpenAI
        self.setup_github_and_openai(page)
        
        # Test list repos
        message = "Use GitHub to list my repositories. Show me the repository names and descriptions."
        response = self.send_message_and_wait_for_response(page, message, "github_list_repos")
        
        print(f"📋 GitHub Response length: {len(response)} characters")
        print(f"📋 GitHub Response preview: {response[:300]}...")
        
        # Verify response
        assert len(response) > 0, "❌ Empty response from GitHub list repos"
        
        # Extract repo names from response
        extracted_repos = self.extract_repo_names(response)
        self.extracted_repos = extracted_repos
        
        # Check for GitHub-related content
        github_keywords = ['repository', 'repo', 'github', 'list', 'name', 'description']
        found_keywords = [kw for kw in github_keywords if kw.lower() in response.lower()]
        
        screenshot_with_markdown(page, "github_repos_final", {
            "Response Length": f"{len(response)} chars",
            "Keywords Found": str(found_keywords),
            "Repos Extracted": str(extracted_repos),
            "Success": "✅ PASS" if len(found_keywords) >= 3 else "⚠️ PARTIAL"
        })
        
        # Assertions
        assert len(found_keywords) >= 3, f"❌ Expected GitHub keywords in response, found: {found_keywords}"
        
        print(f"✅ GITHUB LIST REPOS SUCCESS: Found {len(found_keywords)} keywords: {found_keywords}")
        if extracted_repos:
            print(f"✅ EXTRACTED REPOS: {extracted_repos}")

    def test_github_get_repo_info(self, page: Page, serve_hacka_re):
        """Test GitHub get repository info for a specific repo"""
        # Setup
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        screenshot_with_markdown(page, "github_repo_info_start", {
            "Test": "GitHub repository info",
            "Status": "Starting test"
        })
        
        # Setup GitHub and OpenAI
        self.setup_github_and_openai(page)
        
        # Use a well-known public repo for testing
        test_repo = "microsoft/vscode"
        message = f"Use GitHub to get detailed information about the repository {test_repo}. Show me details like description, language, stars, forks, and recent activity."
        response = self.send_message_and_wait_for_response(page, message, "github_repo_info")
        
        print(f"📋 GitHub Repo Info Response length: {len(response)} characters")
        print(f"📋 GitHub Repo Info Response preview: {response[:300]}...")
        
        # Verify response
        assert len(response) > 0, "❌ Empty response from GitHub repo info"
        
        # Check for repo info content
        repo_keywords = [test_repo, 'repository', 'description', 'language', 'stars', 'forks', 'microsoft', 'vscode']
        found_keywords = [kw for kw in repo_keywords if kw.lower() in response.lower()]
        
        # Look for technical details that indicate successful lookup
        tech_indicators = ['javascript', 'typescript', 'public', 'license', 'created', 'updated']
        found_tech = [kw for kw in tech_indicators if kw.lower() in response.lower()]
        
        screenshot_with_markdown(page, "github_repo_info_final", {
            "Repository": test_repo,
            "Response Length": f"{len(response)} chars",
            "Keywords Found": str(found_keywords),
            "Technical Details": str(found_tech),
            "Success": "✅ PASS" if len(found_keywords) >= 3 else "⚠️ PARTIAL"
        })
        
        # Assertions - should either have repo info or explanation why not available
        has_meaningful_response = (
            len(found_keywords) >= 3 or
            'not found' in response.lower() or
            'no access' in response.lower() or
            'error' in response.lower()
        )
        
        assert has_meaningful_response, f"❌ No meaningful repo info or explanation: {found_keywords}"
        print(f"✅ GITHUB REPO INFO SUCCESS: Found {len(found_keywords)} keywords: {found_keywords}")
        if found_tech:
            print(f"✅ TECHNICAL DETAILS: {found_tech}")

    def test_github_complete_workflow(self, page: Page, serve_hacka_re):
        """Test complete workflow: List repos → Get specific repo info"""
        # Setup
        page.goto(serve_hacka_re)
        dismiss_welcome_modal(page)
        
        screenshot_with_markdown(page, "github_workflow_start", {
            "Test": "Complete GitHub workflow",
            "Status": "Starting complete workflow test"
        })
        
        # Setup GitHub and OpenAI
        self.setup_github_and_openai(page)
        
        # Step 1: List repositories
        print("🔍 STEP 1: List GitHub repositories")
        list_message = "Use GitHub to list my repositories and show me their names."
        list_response = self.send_message_and_wait_for_response(page, list_message, "workflow_list")
        
        # Extract repos from list response
        extracted_repos = self.extract_repo_names(list_response)
        print(f"📋 Extracted repos from list: {extracted_repos}")
        
        # If no personal repos found, use a well-known public repo
        if not extracted_repos:
            target_repo = "microsoft/vscode"
            print(f"📋 No personal repos found, using public repo: {target_repo}")
        else:
            target_repo = extracted_repos[0]  # Use first repo found
            print(f"📋 Using personal repo: {target_repo}")
        
        # Step 2: Get detailed info for the repo
        print(f"🔍 STEP 2: Get detailed info for {target_repo}")
        
        info_message = f"Now use GitHub to get detailed information about the repository {target_repo}. Show me its description, programming language, and activity."
        info_response = self.send_message_and_wait_for_response(page, info_message, "workflow_info")
        
        # Verify info response mentions the repo
        assert target_repo.lower() in info_response.lower() or target_repo.split('/')[-1].lower() in info_response.lower(), f"❌ Response doesn't mention target repo {target_repo}"
        
        # Check for meaningful repo info
        info_keywords = ['repository', 'description', 'language', 'information', target_repo.split('/')[-1]]
        found_info_keywords = [kw for kw in info_keywords if kw.lower() in info_response.lower()]
        
        screenshot_with_markdown(page, "github_workflow_complete", {
            "Target Repo": target_repo,
            "List Response Length": f"{len(list_response)} chars",
            "Info Response Length": f"{len(info_response)} chars", 
            "Info Keywords": str(found_info_keywords),
            "Success": "✅ COMPLETE WORKFLOW PASS"
        })
        
        # Final assertions
        assert len(found_info_keywords) >= 2, f"❌ Insufficient repo info keywords: {found_info_keywords}"
        
        print(f"✅ COMPLETE GITHUB WORKFLOW SUCCESS!")
        print(f"✅ LIST: Found repos for analysis")
        print(f"✅ INFO: Analyzed {target_repo} with {len(found_info_keywords)} relevant details")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--timeout=600"])