# Test Organization Report

Generated: Wed Aug 27 13:46:19 CEST 2025

## Test Categories

### Ucore Tests

- test_api
- test_chat
- test_page

**Total: 3 tests**

### Umodal Tests

- test_heart_modal_info_icon
- test_info_modal_click
- test_share_modal_duplicate_fix
- test_share_modal_info_icon
- test_agent_modal
- test_execute_modal_regression
- test_function_execute_modal
- test_function_modal
- test_mcp_expandable_modal
- test_modals
- test_rag_modal
- test_welcome_modal_new_logic

**Total: 12 tests**

### Usharing Tests

- test_shared_link_decryption_only
- test_shared_link_fixes_realistic
- test_shared_link_fixes
- test_shodan_share_debug
- test_shodan_sharing
- test_complete_mcp_share_flow
- test_default_functions_shared_link_integration
- test_default_functions_sharing
- test_function_library_sharing
- test_github_token_sharing
- test_mcp_share_link_creation
- test_mcp_share_link
- test_mcp_shared_link_loading
- test_shared_link_conversation_continuity
- test_sharing
- test_theme_sharing
- test_welcome_message_link_length

**Total: 17 tests**

### Umcp Tests

- test_shodan_mcp_prompts
- test_agent_mcp_config
- test_github_mcp_agent_persistence
- test_github_mcp_connection_after_auth
- test_github_mcp_oauth
- test_github_real_mcp_server
- test_mcp_checkbox_event
- test_mcp_form_corrected
- test_mcp_function_calls
- test_mcp_integration_simple
- test_mcp_integration
- test_mcp_oauth_client_registration
- test_mcp_oauth_enhanced_service
- test_mcp_oauth_enhanced_transport
- test_mcp_oauth_integration
- test_mcp_oauth_metadata_discovery
- test_mcp_reconnection
- test_mcp_simple_form
- test_mcp_simple
- test_mcp_status_display
- test_mcp_stdio_oauth_middleware
- test_mcp_unit

**Total: 22 tests**

### Ufunction Tests

- test_agent_function_config
- test_agent_load_functionality
- test_default_functions_config_service
- test_function_bundle_preservation
- test_function_collection_preservation
- test_function_copy_buttons
- test_function_deletion
- test_function_editing
- test_function_group_colors
- test_function_icons
- test_function_library_copy
- test_function_library_multi
- test_function_parsing_logic
- test_function_tooltip
- test_gmail_function_registration
- test_prompt_order_and_function_library_prompt

**Total: 16 tests**

### Urag Tests

- test_agent_load_sessionStorage
- test_rag_bundles
- test_rag_indexing
- test_rag_integration
- test_rag_search

**Total: 5 tests**

### Uapi Tests

- test_shodan_account_apis
- test_shodan_dns_apis
- test_shodan_search_apis
- test_agent_api_config
- test_api_key_detection_simple
- test_debug_provider_persistence
- test_github_provider_cors_fix
- test_provider_save_verification
- test_simple_provider_debug

**Total: 9 tests**

### Uother Tests

- test_contextvars
- test_cpp
- test_extension_interface
- test_gc
- test_generator_nested
- test_generator
- test_greenlet_trash
- test_greenlet
- test_leaks
- test_stack_saved
- test_throw
- test_tracing
- test_version
- test_weakref
- test_agent_context_debug
- test_cross_tab_fix
- test_info_popup_click
- test_model_selection_fix
- test_model_selection_minimal
- test_model_selection_mouse_click
- test_tooltip_positioning
- test_basic
- test_multiple
- test_rc4
- test_validation
- test_shodan_enrichment_workflows
- test_shodan_prompt_integration
- test_shodan_prompt_simple
- test_shodan_simple
- test_shodan_working
- test_agent_comprehensive
- test_agent_config
- test_agent_conversation_config
- test_agent_conversation_history
- test_agent_default_prompts_config
- test_agent_isolation
- test_agent_load_complete
- test_agent_load_simple
- test_agent_load_with_message
- test_agent_master_suite
- test_agent_prompt_isolation
- test_agent_prompts_config
- test_agent_timestamp_fix
- test_button_tooltips
- test_chat_no_mock
- test_clear_chat
- test_clear_namespace_settings
- test_complete_shodan_integration
- test_context_window_scaling
- test_copy_chat
- test_cross_tab_loop_fix
- test_cross_tab_sync_optimization
- test_cross_tab_sync
- test_debug_mode
- test_default_prompts
- test_github_connection_fix
- test_github_device_flow
- test_github_manual_device_flow_complete
- test_github_manual_token_entry
- test_github_shodan_dual_validation
- test_input_field_scroll
- test_logo_tooltip
- test_model_context_window
- test_model_selection_context_window
- test_model_selection_o4_mini
- test_models_context_simple
- test_models_dev_integration
- test_namespace_conversation_persistence
- test_orchestration_dropdown
- test_pattern_extraction
- test_shodan_final_validation
- test_shodan_integration
- test_stop_generation_debug
- test_stop_generation_fixed
- test_stop_generation_no_error
- test_stop_generation_simple
- test_stop_generation
- test_template
- test_themes
- test_token_counter_debounce
- test_welcome_message_fixes
- test_welcome_message_performance
- test_welcome_message_prepopulation
- test_welcome_timing

**Total: 84 tests**

## Summary Statistics

- **Core**: 3 tests
- **Modal**: 12 tests
- **Sharing**: 17 tests
- **MCP**: 22 tests
- **Function**: 16 tests
- **RAG**: 5 tests
- **API**: 9 tests
- **Other**: 84 tests
- **Total**: 168 tests

## Recommended Test Runners

Based on the categorization, use these scripts to run specific test groups:

```bash
# Run core tests (quick validation)
./run_core_tests.sh

# Run modal-specific tests
./run_modal_tests.sh

# Run sharing tests
./run_sharing_tests.sh

# Run MCP tests
./run_mcp_tests.sh

# Run function calling tests
./run_function_tests.sh

# Run RAG tests
./run_rag_tests.sh

# Run test audit to identify failing tests
./run_test_audit.sh

# Run smart test runner with retry logic
./run_tests_smart.sh --mode core
./run_tests_smart.sh --mode modal --max-retries 3
```
