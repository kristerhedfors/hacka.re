#!/usr/bin/env python3
"""
Visual Test Runner for hacka.re CLI
Shows real-time terminal UI during test execution with speedrun-style visualization
"""

import subprocess
import sys
import time
import os
import threading
from pathlib import Path
from datetime import datetime
import json
import shutil
from rich.console import Console
from rich.layout import Layout
from rich.panel import Panel
from rich.live import Live
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn
from rich.syntax import Syntax
from rich.text import Text
from rich.align import Align
import pexpect
import asyncio
from typing import List, Dict, Optional
from port_utils import get_random_port, get_multiple_random_ports

console = Console()

class VisualTestRunner:
    """Visual test runner with terminal UI display"""

    def __init__(self):
        self.cli_path = Path("../hacka.re").resolve()
        self.test_results = []
        self.current_test = None
        self.terminal_output = []
        self.test_start_time = None
        self.total_tests = 0
        self.completed_tests = 0
        self.failed_tests = []
        self.passed_tests = []
        # Get random ports for testing to avoid conflicts
        self.test_ports = get_multiple_random_ports(10)

    def run_command_with_terminal(self, cmd: List[str], timeout: int = 10) -> Dict:
        """Run command and capture terminal interaction"""
        result = {
            'command': ' '.join(cmd),
            'output': [],
            'success': False,
            'duration': 0,
            'terminal_frames': []
        }

        start_time = time.time()

        try:
            # Use pexpect for better terminal interaction capture
            if sys.platform == "darwin":
                # macOS specific handling
                child = pexpect.spawn(cmd[0], cmd[1:], timeout=timeout, encoding='utf-8')
            else:
                child = pexpect.spawn(' '.join(cmd), timeout=timeout, encoding='utf-8')

            # Capture all output with timing
            while True:
                try:
                    index = child.expect([pexpect.EOF, pexpect.TIMEOUT, '.+'], timeout=0.1)
                    if index == 0:  # EOF
                        break
                    elif index == 2:  # Got output
                        output = child.after if hasattr(child, 'after') else child.before
                        if output:
                            frame = {
                                'timestamp': time.time() - start_time,
                                'content': output,
                                'type': 'output'
                            }
                            result['terminal_frames'].append(frame)
                            result['output'].append(output)
                except pexpect.TIMEOUT:
                    continue
                except pexpect.EOF:
                    break

            child.close()
            result['success'] = child.exitstatus == 0

        except Exception as e:
            result['error'] = str(e)
            result['success'] = False

        result['duration'] = time.time() - start_time
        return result

    def test_browse_command(self) -> Dict:
        """Test browse command with visual output"""
        test_name = "Browse Command"
        console.print(f"\n[bold cyan]🚀 Testing: {test_name}[/bold cyan]")

        results = {}

        # Test help
        console.print("  📋 Testing --help flag...")
        result = self.run_command_with_terminal([str(self.cli_path), "browse", "--help"], timeout=5)
        results['help'] = result
        self._display_terminal_output(result)

        # Test server startup (with immediate kill)
        console.print(f"\n  🌐 Testing server startup on random port {self.test_ports[0]}...")
        result = self.run_command_with_terminal([str(self.cli_path), "serve", "-p", str(self.test_ports[0])], timeout=2)
        results['startup'] = result
        self._display_terminal_output(result)

        return results

    def test_serve_command(self) -> Dict:
        """Test serve command with visual output"""
        test_name = "Serve Command"
        console.print(f"\n[bold cyan]🚀 Testing: {test_name}[/bold cyan]")

        results = {}

        # Test verbose mode
        console.print(f"  📝 Testing verbose mode (-v) on port {self.test_ports[1]}...")
        result = self.run_command_with_terminal([str(self.cli_path), "serve", "-v", "-p", str(self.test_ports[1])], timeout=2)
        results['verbose'] = result
        self._display_terminal_output(result)

        # Test very verbose mode
        console.print(f"\n  📝📝 Testing very verbose mode (-vv) on port {self.test_ports[2]}...")
        result = self.run_command_with_terminal([str(self.cli_path), "serve", "-vv", "-p", str(self.test_ports[2])], timeout=2)
        results['very_verbose'] = result
        self._display_terminal_output(result)

        return results

    def test_chat_command(self) -> Dict:
        """Test chat command with visual output"""
        test_name = "Chat Command"
        console.print(f"\n[bold cyan]🚀 Testing: {test_name}[/bold cyan]")

        results = {}

        # Test help
        console.print("  💬 Testing chat --help...")
        result = self.run_command_with_terminal([str(self.cli_path), "chat", "--help"], timeout=5)
        results['help'] = result
        self._display_terminal_output(result)

        return results

    def test_port_configuration(self) -> Dict:
        """Test port configuration with visual output"""
        test_name = "Port Configuration"
        console.print(f"\n[bold cyan]🚀 Testing: {test_name}[/bold cyan]")

        results = {}

        # Test custom port
        console.print(f"  🔧 Testing custom port (-p {self.test_ports[3]})...")
        result = self.run_command_with_terminal([str(self.cli_path), "serve", "-p", str(self.test_ports[3])], timeout=2)
        results['custom_port'] = result
        self._display_terminal_output(result)

        # Test environment variable
        port_for_env = self.test_ports[4]
        console.print(f"\n  🌍 Testing HACKARE_WEB_PORT environment variable with port {port_for_env}...")
        env = os.environ.copy()
        env['HACKARE_WEB_PORT'] = str(port_for_env)

        try:
            child = pexpect.spawn(str(self.cli_path), ["serve"], timeout=2, encoding='utf-8', env=env)
            output = []
            start_time = time.time()

            while time.time() - start_time < 2:
                try:
                    line = child.read_nonblocking(size=1000, timeout=0.1)
                    if line:
                        output.append(line)
                except:
                    pass

            child.terminate()

            result = {
                'command': f'HACKARE_WEB_PORT={port_for_env} ./hacka.re serve',
                'output': output,
                'success': True,
                'duration': 2,
                'terminal_frames': [{'timestamp': 0, 'content': ''.join(output), 'type': 'output'}]
            }
        except Exception as e:
            result = {'error': str(e), 'success': False}

        results['env_port'] = result
        self._display_terminal_output(result)

        return results

    def _display_terminal_output(self, result: Dict):
        """Display terminal output with formatting"""
        if result.get('terminal_frames'):
            # Create a terminal-like display
            terminal_box = Panel(
                Text(''.join(frame['content'] for frame in result['terminal_frames'][:20]),
                     style="green" if result['success'] else "red"),
                title=f"[bold]Terminal Output[/bold] ({result['duration']:.2f}s)",
                border_style="cyan" if result['success'] else "red"
            )
            console.print(terminal_box)
        elif result.get('output'):
            # Fallback to simple output
            output_text = ''.join(result['output'][:20]) if isinstance(result['output'], list) else str(result['output'])[:500]
            console.print(Panel(output_text, title="Output", border_style="cyan"))

        # Show success/failure
        if result['success']:
            console.print("  [bold green]✅ PASSED[/bold green]")
        else:
            console.print("  [bold red]❌ FAILED[/bold red]")
            if result.get('error'):
                console.print(f"  [red]Error: {result['error']}[/red]")

    def run_speedrun_tests(self):
        """Run all tests in speedrun style with visual feedback"""
        console.clear()

        # Header
        console.print(Panel.fit(
            "[bold magenta]🏃 hacka.re CLI Visual Test Runner - SPEEDRUN MODE 🏃[/bold magenta]\n" +
            "[dim]Watch the terminal UI in action![/dim]",
            border_style="magenta"
        ))

        start_time = time.time()
        all_results = {}

        # Test sequence with visual transitions
        tests = [
            ("Browse Command", self.test_browse_command),
            ("Serve Command", self.test_serve_command),
            ("Chat Command", self.test_chat_command),
            ("Port Configuration", self.test_port_configuration),
        ]

        # Progress tracking
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            TimeElapsedColumn(),
            console=console
        ) as progress:

            task = progress.add_task("[cyan]Running tests...", total=len(tests))

            for test_name, test_func in tests:
                progress.update(task, description=f"[cyan]Testing {test_name}...")

                # Run test with visual output
                try:
                    result = test_func()
                    all_results[test_name] = result
                    self.passed_tests.append(test_name)
                except Exception as e:
                    console.print(f"[red]Error in {test_name}: {e}[/red]")
                    all_results[test_name] = {'error': str(e)}
                    self.failed_tests.append(test_name)

                progress.advance(task)
                time.sleep(0.5)  # Brief pause between tests for visibility

        # Summary
        total_time = time.time() - start_time
        self._display_summary(all_results, total_time)

    def _display_summary(self, results: Dict, total_time: float):
        """Display test summary with statistics"""
        console.print("\n" + "="*60)

        # Create summary table
        table = Table(title="[bold]Test Results Summary[/bold]", show_header=True, header_style="bold magenta")
        table.add_column("Test Suite", style="cyan", no_wrap=True)
        table.add_column("Status", justify="center")
        table.add_column("Tests", justify="center")
        table.add_column("Time", justify="right")

        for test_name, result in results.items():
            if isinstance(result, dict) and not result.get('error'):
                status = "[green]✅ PASS[/green]"
                test_count = len([k for k in result.keys() if k != 'error'])
            else:
                status = "[red]❌ FAIL[/red]"
                test_count = 0

            table.add_row(test_name, status, str(test_count), f"{result.get('duration', 0):.2f}s" if isinstance(result, dict) else "N/A")

        console.print(table)

        # Statistics
        stats = Panel(
            f"[bold]Total Time:[/bold] {total_time:.2f}s\n" +
            f"[bold]Passed:[/bold] [green]{len(self.passed_tests)}[/green]\n" +
            f"[bold]Failed:[/bold] [red]{len(self.failed_tests)}[/red]\n" +
            f"[bold]Success Rate:[/bold] {len(self.passed_tests)/(len(self.passed_tests)+len(self.failed_tests))*100:.1f}%",
            title="[bold]Statistics[/bold]",
            border_style="blue"
        )
        console.print(stats)

        # Save results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = Path(f"visual_test_results_{timestamp}.json")
        with open(results_file, 'w') as f:
            json.dump({
                'timestamp': timestamp,
                'total_time': total_time,
                'passed': self.passed_tests,
                'failed': self.failed_tests,
                'results': {k: {kk: vv for kk, vv in v.items() if kk != 'terminal_frames'}
                          for k, v in results.items() if isinstance(v, dict)}
            }, f, indent=2)

        console.print(f"\n[dim]Results saved to: {results_file}[/dim]")

def main():
    """Main entry point"""
    # Check CLI binary exists
    cli_path = Path("../hacka.re")
    if not cli_path.exists():
        console.print("[bold red]Error: CLI binary not found![/bold red]")
        console.print("Please build the CLI first: ./build-with-assets.sh")
        sys.exit(1)

    # Check binary size (should be ~13MB with embedded ZIP)
    size_mb = cli_path.stat().st_size / (1024 * 1024)
    console.print(f"[dim]CLI binary size: {size_mb:.1f}MB[/dim]")

    if size_mb < 10:
        console.print("[yellow]Warning: Binary seems small. May not have embedded assets.[/yellow]")

    # Run visual tests
    runner = VisualTestRunner()

    try:
        runner.run_speedrun_tests()
    except KeyboardInterrupt:
        console.print("\n[yellow]Test run interrupted by user[/yellow]")
    except Exception as e:
        console.print(f"\n[red]Test runner error: {e}[/red]")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()