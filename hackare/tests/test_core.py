"""
Tests for core functionality
"""

import pytest
import tempfile
from pathlib import Path
from hackare.core import HackaReBuilder


def test_hackare_builder_init():
    """Test HackaReBuilder initialization"""
    builder = HackaReBuilder()
    assert builder.title == "Custom hacka.re"
    assert builder.output_dir is None
    assert builder.verbose is False


def test_hackare_builder_with_params():
    """Test HackaReBuilder with parameters"""
    with tempfile.TemporaryDirectory() as temp_dir:
        output_dir = Path(temp_dir) / "test_output"
        builder = HackaReBuilder(
            output_dir=output_dir,
            title="Test Bundle",
            verbose=True
        )
        assert builder.title == "Test Bundle"
        assert builder.output_dir == output_dir
        assert builder.verbose is True


def test_create_link():
    """Test creating a shareable link"""
    builder = HackaReBuilder()
    content = "This is test content for the link"
    link = builder.create_link(content, title="Test Link")
    
    assert isinstance(link, str)
    assert link.startswith("https://hacka.re")
    assert "data=" in link


def test_create_link_compressed():
    """Test creating a compressed link"""
    builder = HackaReBuilder()
    content = "This is test content for the compressed link" * 10
    link = builder.create_link(content, title="Test Link", compress=True)
    
    assert isinstance(link, str)
    assert "compressed=1" in link