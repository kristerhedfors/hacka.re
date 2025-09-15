#!/bin/bash

# Quick test runner for CLI functionality
# Runs tests without Playwright browser tests for faster execution

set -e

echo "=== Quick CLI Test Suite ==="
echo ""

# Activate virtual environment
source .venv/bin/activate

# Run non-browser tests only
echo "Running test_cli_browse_command (non-browser tests)..."
python -m pytest test_cli_browse_command.py::TestCliBrowseCommand::test_browse_help -v
python -m pytest test_cli_browse_command.py::TestCliBrowseCommand::test_browse_custom_port -v
python -m pytest test_cli_browse_command.py::TestCliBrowseCommand::test_browse_with_shared_config -v
python -m pytest test_cli_browse_command.py::TestCliBrowseCommand::test_browse_port_environment_variable -v

echo ""
echo "Running test_cli_serve_command tests..."
python -m pytest test_cli_serve_command.py::TestCliServeCommand::test_serve_help -v
python -m pytest test_cli_serve_command.py::TestCliServeCommand::test_serve_no_browser -v
python -m pytest test_cli_serve_command.py::TestCliServeCommand::test_serve_verbose_logging -v
python -m pytest test_cli_serve_command.py::TestCliServeCommand::test_serve_api_subcommand -v

echo ""
echo "Running test_cli_chat_command tests..."
python -m pytest test_cli_chat_command.py::TestCliChatCommand::test_chat_help -v
python -m pytest test_cli_chat_command.py::TestCliChatCommand::test_chat_subcommand_exists -v

echo ""
echo "Running test_cli_shared_links tests..."
python -m pytest test_cli_shared_links.py::TestCliSharedLinks::test_browse_accepts_url_format -v
python -m pytest test_cli_shared_links.py::TestCliSharedLinks::test_serve_accepts_shared_links -v
python -m pytest test_cli_shared_links.py::TestCliSharedLinks::test_chat_accepts_shared_links -v

echo ""
echo "Running test_cli_zip_serving tests..."
python -m pytest test_cli_zip_serving.py::TestCliZipServing::test_zip_embedded_in_binary -v
python -m pytest test_cli_zip_serving.py::TestCliZipServing::test_serves_from_memory_not_disk -v

echo ""
echo "Running test_cli_port_configuration tests..."
python -m pytest test_cli_port_configuration.py::TestCliPortConfiguration::test_default_port_8080 -v
python -m pytest test_cli_port_configuration.py::TestCliPortConfiguration::test_short_flag_port -v

echo ""
echo "=== Test Summary ==="
echo "Tests completed. Check output above for results."