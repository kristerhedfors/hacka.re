"""
Tests for the CLI interface
"""

import pytest
from click.testing import CliRunner
from hackare.cli import cli


def test_cli_help():
    """Test that CLI help works"""
    runner = CliRunner()
    result = runner.invoke(cli, ['--help'])
    assert result.exit_code == 0
    assert 'hackare' in result.output


def test_bundle_command_help():
    """Test bundle command help"""
    runner = CliRunner()
    result = runner.invoke(cli, ['bundle', '--help'])
    assert result.exit_code == 0
    assert 'bundle' in result.output


def test_link_command_help():
    """Test link command help"""
    runner = CliRunner()
    result = runner.invoke(cli, ['link', '--help'])
    assert result.exit_code == 0
    assert 'link' in result.output


def test_index_command_help():
    """Test index command help"""
    runner = CliRunner()
    result = runner.invoke(cli, ['index', '--help'])
    assert result.exit_code == 0
    assert 'index' in result.output


def test_search_command_help():
    """Test search command help"""
    runner = CliRunner()
    result = runner.invoke(cli, ['search', '--help'])
    assert result.exit_code == 0
    assert 'search' in result.output