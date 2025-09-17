# Test Comparison: Latest vs Previous

**Latest**: 20250917_093012
**Previous**: previous

## Summary Changes

| Metric | Previous | Latest | Change |
|--------|----------|--------|--------|
| Total Tests | 6 | 71 | +65 |
| Passed | 6 | 68 | +62 |
| Failed | 0 | 3 | +3 |
| Duration | 10.50s | 80.35s | +69.85s |

## 🆕 New Tests

- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_chat_with_session_env_var
- ✅ test_cli_port_configuration.py::TestCliPortConfiguration::test_multiple_servers_different_ports
- ❌ test_cli_chat_command.py::TestCliChatCommand::test_chat_with_config
- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_env_var_priority_hackare_config
- ❌ test_cli_simplified_commands.py::TestCliSimplifiedCommands::test_chat_help_shows_simplified_commands
- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_env_var_priority_hackare_link
- ✅ test_cli_port_configuration.py::TestCliPortConfiguration::test_long_flag_port
- ✅ test_cli_port_configuration.py::TestCliPortConfiguration::test_environment_variable_port
- ✅ test_cli_serve_command.py::TestCliServeCommand::test_serve_performance[chromium]
- ✅ test_cli_zip_serving.py::TestCliZipServing::test_hacka_re_app_loads[chromium]
- ✅ test_cli_chat_command.py::TestCliChatCommand::test_chat_accepts_shared_link
- ✅ test_cli_serve_command.py::TestCliServeCommand::test_serve_shows_url
- ✅ test_cli_zip_serving.py::TestCliZipServing::test_404_for_nonexistent_files
- ✅ test_cli_shared_links.py::TestCliSharedLinks::test_chat_accepts_shared_links
- ✅ test_cli_chat_command.py::TestCliChatCommand::test_chat_no_config_prompt
- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_multiple_env_vars_causes_error
- ✅ test_cli_shared_links.py::TestCliSharedLinks::test_shared_link_password_prompt
- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_hackare_session_env_var
- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_browse_with_session_env_var
- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_env_var_full_url_format
- ✅ test_cli_zip_serving.py::TestCliZipServing::test_zip_embedded_in_binary
- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_hackare_config_env_var
- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_env_var_fragment_format
- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_empty_env_var_ignored
- ✅ test_cli_serve_command.py::TestCliServeCommand::test_serve_no_browser
- ✅ test_cli_simplified_commands.py::TestCliSimplifiedCommands::test_menu_command_autocomplete
- ✅ test_cli_port_configuration.py::TestCliPortConfiguration::test_flag_overrides_env
- ✅ test_cli_port_configuration.py::TestCliPortConfiguration::test_port_already_in_use
- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_serve_help_mentions_env_vars
- ✅ test_cli_shared_links.py::TestCliSharedLinks::test_main_help_shows_examples
- ✅ test_cli_chat_command.py::TestCliChatCommand::test_legacy_chat_flag_deprecated
- ✅ test_cli_zip_serving.py::TestCliZipServing::test_serves_from_memory_not_disk
- ✅ test_cli_chat_command.py::TestCliChatCommand::test_chat_subcommand_exists
- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_chat_help_mentions_env_vars
- ✅ test_cli_port_configuration.py::TestCliPortConfiguration::test_short_flag_port
- ❌ test_cli_chat_command.py::TestCliChatCommand::test_chat_terminal_interaction
- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_serve_with_session_env_var
- ✅ test_cli_serve_command.py::TestCliServeCommand::test_serve_help
- ✅ test_cli_chat_command.py::TestCliChatCommand::test_chat_help
- ✅ test_cli_serve_command.py::TestCliServeCommand::test_serve_web_subcommand
- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_browse_help_mentions_env_vars
- ✅ test_cli_shared_links.py::TestCliSharedLinks::test_json_dump_with_shared_link
- ✅ test_cli_serve_command.py::TestCliServeCommand::test_serve_api_subcommand
- ✅ test_cli_simplified_commands.py::TestCliSimplifiedCommands::test_only_four_commands_available
- ✅ test_cli_serve_command.py::TestCliServeCommand::test_serve_with_shared_config
- ✅ test_cli_shared_links.py::TestCliSharedLinks::test_serve_accepts_shared_links
- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_all_three_env_vars_causes_error
- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_env_var_priority_hackare_session
- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_session_with_welcome_message
- ✅ test_cli_shared_links.py::TestCliSharedLinks::test_browse_accepts_fragment_format
- ✅ test_cli_zip_serving.py::TestCliZipServing::test_all_file_types_served
- ✅ test_cli_zip_serving.py::TestCliZipServing::test_concurrent_requests_from_zip
- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_hackare_link_env_var
- ✅ test_cli_shared_links.py::TestCliSharedLinks::test_all_three_formats_documented
- ✅ test_cli_shared_links.py::TestCliSharedLinks::test_browse_accepts_data_format
- ✅ test_cli_shared_links.py::TestCliSharedLinks::test_browse_accepts_url_format
- ✅ test_cli_port_configuration.py::TestCliPortConfiguration::test_default_port_8080
- ✅ test_cli_port_configuration.py::TestCliPortConfiguration::test_invalid_port_numbers
- ✅ test_cli_serve_command.py::TestCliServeCommand::test_serve_verbose_logging
- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_command_line_overrides_env_var
- ✅ test_cli_simplified_commands.py::TestCliSimplifiedCommands::test_menu_command_launches_tui
- ✅ test_cli_serve_command.py::TestCliServeCommand::test_serve_very_verbose_logging
- ✅ test_cli_session_env_vars.py::TestCliSessionEnvVars::test_env_var_raw_data_format
- ✅ test_cli_zip_serving.py::TestCliZipServing::test_no_directory_listing
- ✅ test_cli_port_configuration.py::TestCliPortConfiguration::test_port_range_boundaries

