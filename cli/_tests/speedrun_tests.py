#!/usr/bin/env python3
"""
Speedrun Test Visualizer for hacka.re CLI
Shows all tests running in parallel terminals with live output
"""

import subprocess
import sys
import time
import os
import threading
import queue
from pathlib import Path
from datetime import datetime
import curses
import asyncio
import concurrent.futures
from typing import List, Dict, Tuple
import signal

class SpeedrunVisualizer:
    """Runs tests with ncurses visualization showing multiple terminal windows"""

    def __init__(self):
        self.cli_path = Path("../hacka.re").resolve()
        self.test_queue = queue.Queue()
        self.results = {}
        self.active_tests = {}
        self.completed_tests = []
        self.failed_tests = []
        self.start_time = None
        self.stop_flag = False

    def run_test_async(self, name: str, cmd: List[str], timeout: int = 5) -> Dict:
        """Run a single test and capture output"""
        result = {
            'name': name,
            'command': ' '.join(cmd),
            'output': [],
            'start_time': time.time(),
            'success': False
        }

        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True
            )

            # Capture output line by line
            deadline = time.time() + timeout
            while time.time() < deadline:
                try:
                    line = process.stdout.readline()
                    if line:
                        result['output'].append({
                            'time': time.time() - result['start_time'],
                            'text': line.rstrip()
                        })
                    elif process.poll() is not None:
                        break
                    time.sleep(0.01)
                except:
                    break

            # Terminate if still running
            if process.poll() is None:
                process.terminate()
                time.sleep(0.5)
                if process.poll() is None:
                    process.kill()

            result['exit_code'] = process.returncode
            result['success'] = process.returncode == 0

        except Exception as e:
            result['error'] = str(e)

        result['duration'] = time.time() - result['start_time']
        return result

    def draw_interface(self, stdscr):
        """Draw the speedrun interface with ncurses"""
        curses.curs_set(0)  # Hide cursor
        stdscr.nodelay(1)   # Non-blocking input
        stdscr.timeout(100) # Refresh rate

        # Color pairs
        curses.init_pair(1, curses.COLOR_GREEN, curses.COLOR_BLACK)   # Success
        curses.init_pair(2, curses.COLOR_RED, curses.COLOR_BLACK)     # Failure
        curses.init_pair(3, curses.COLOR_YELLOW, curses.COLOR_BLACK)  # Running
        curses.init_pair(4, curses.COLOR_CYAN, curses.COLOR_BLACK)    # Header
        curses.init_pair(5, curses.COLOR_MAGENTA, curses.COLOR_BLACK) # Stats

        height, width = stdscr.getmaxyx()

        # Define all tests
        test_definitions = [
            # Core functionality
            ("Help", [str(self.cli_path), "--help"], 2),
            ("Version", [str(self.cli_path), "--version"], 2),

            # Browse command tests
            ("Browse Help", [str(self.cli_path), "browse", "--help"], 2),
            ("Serve NoOpen", [str(self.cli_path), "serve", "-p", "9991"], 3),
            ("Serve Port Test", [str(self.cli_path), "serve", "-p", "9992"], 3),

            # Serve command tests
            ("Serve Help", [str(self.cli_path), "serve", "--help"], 2),
            ("Serve Basic", [str(self.cli_path), "serve", "-p", "9993"], 3),
            ("Serve Verbose", [str(self.cli_path), "serve", "-v", "-p", "9994"], 3),
            ("Serve VeryVerbose", [str(self.cli_path), "serve", "-vv", "-p", "9995"], 3),

            # Chat command tests
            ("Chat Help", [str(self.cli_path), "chat", "--help"], 2),

            # Port configuration tests
            ("Port Short", [str(self.cli_path), "serve", "-p", "8888"], 3),
            ("Port Long", [str(self.cli_path), "serve", "--port", "8889"], 3),

            # Session/Link tests (if environment configured)
            ("Session Help", [str(self.cli_path), "browse", "--help"], 2),
        ]

        # Start all tests in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = {
                executor.submit(self.run_test_async, name, cmd, timeout): name
                for name, cmd, timeout in test_definitions
            }

            self.start_time = time.time()
            last_update = 0

            while futures:
                # Clear screen
                stdscr.clear()

                # Header
                elapsed = time.time() - self.start_time
                header = f"🏃 hacka.re CLI SPEEDRUN - {elapsed:.1f}s elapsed"
                stdscr.addstr(0, (width - len(header)) // 2, header, curses.color_pair(4) | curses.A_BOLD)

                # Stats line
                completed = len(self.completed_tests)
                total = len(test_definitions)
                failed = len(self.failed_tests)
                stats = f"Completed: {completed}/{total} | Failed: {failed} | Running: {total - completed}"
                stdscr.addstr(1, (width - len(stats)) // 2, stats, curses.color_pair(5))

                # Divider
                stdscr.addstr(2, 0, "─" * width)

                # Test grid layout (multiple columns)
                cols = 3 if width > 120 else 2 if width > 80 else 1
                col_width = width // cols
                tests_per_col = (len(test_definitions) + cols - 1) // cols

                row_offset = 4
                for i, (name, cmd, timeout) in enumerate(test_definitions):
                    col = i // tests_per_col
                    row = i % tests_per_col + row_offset

                    if row >= height - 2:
                        continue

                    x_offset = col * col_width

                    # Determine status
                    if name in [r['name'] for r in self.completed_tests]:
                        # Completed test
                        result = next(r for r in self.completed_tests if r['name'] == name)
                        if result.get('success'):
                            status_char = "✓"
                            color = curses.color_pair(1)
                        else:
                            status_char = "✗"
                            color = curses.color_pair(2)
                        time_str = f"{result.get('duration', 0):.2f}s"
                    else:
                        # Running test
                        status_char = "⟳"
                        color = curses.color_pair(3)
                        time_str = f"{time.time() - self.start_time:.1f}s"

                    # Draw test line
                    test_line = f"{status_char} {name[:20]:20} {time_str:>7}"

                    if x_offset + len(test_line) < width:
                        stdscr.addstr(row, x_offset, test_line, color)

                    # Show last output line for running tests
                    if name in self.active_tests and col == 0:  # Only show for first column
                        output = self.active_tests[name].get('output', [])
                        if output and row + 1 < height - 2:
                            last_line = output[-1].get('text', '')[:col_width - 4]
                            stdscr.addstr(row + 1, x_offset + 2, f"  {last_line}", curses.A_DIM)

                # Progress bar
                if height > 20:
                    bar_row = height - 3
                    progress = completed / total
                    bar_width = width - 20
                    filled = int(bar_width * progress)
                    bar = f"[{'█' * filled}{' ' * (bar_width - filled)}] {progress*100:.1f}%"
                    stdscr.addstr(bar_row, 10, bar)

                # Footer
                footer = "Press 'q' to quit | 's' to save results | 'r' to rerun"
                stdscr.addstr(height - 1, (width - len(footer)) // 2, footer, curses.A_DIM)

                # Check for completed futures
                done_futures = []
                for future in futures:
                    if future.done():
                        try:
                            result = future.result()
                            self.completed_tests.append(result)
                            if not result.get('success'):
                                self.failed_tests.append(result['name'])
                            if result['name'] in self.active_tests:
                                del self.active_tests[result['name']]
                            done_futures.append(future)
                        except Exception as e:
                            pass

                # Remove completed futures
                for future in done_futures:
                    del futures[future]

                # Update active tests
                for future in futures:
                    name = futures[future]
                    if name not in self.active_tests:
                        self.active_tests[name] = {'output': []}

                # Handle input
                key = stdscr.getch()
                if key == ord('q'):
                    break
                elif key == ord('s'):
                    self.save_results()
                elif key == ord('r'):
                    # Restart tests
                    self.completed_tests.clear()
                    self.failed_tests.clear()
                    futures.clear()
                    break

                stdscr.refresh()
                time.sleep(0.1)

            # Cancel remaining futures
            for future in futures:
                future.cancel()

        # Show final results
        self.show_final_results(stdscr)

    def show_final_results(self, stdscr):
        """Display final test results"""
        stdscr.clear()
        height, width = stdscr.getmaxyx()

        # Summary
        total_time = time.time() - self.start_time
        passed = len([t for t in self.completed_tests if t.get('success')])
        failed = len(self.failed_tests)
        total = len(self.completed_tests)

        lines = [
            "=" * 60,
            "SPEEDRUN COMPLETE!",
            "=" * 60,
            f"Total Time: {total_time:.2f} seconds",
            f"Tests Run: {total}",
            f"Passed: {passed}",
            f"Failed: {failed}",
            f"Success Rate: {(passed/total*100) if total > 0 else 0:.1f}%",
            "",
            "Failed Tests:" if failed > 0 else "All tests passed!",
        ]

        if failed > 0:
            for test in self.failed_tests:
                lines.append(f"  - {test}")

        lines.extend([
            "",
            "Press any key to exit...",
        ])

        # Display centered
        start_row = max(0, (height - len(lines)) // 2)
        for i, line in enumerate(lines):
            if start_row + i < height:
                x = max(0, (width - len(line)) // 2)
                try:
                    if "COMPLETE" in line:
                        stdscr.addstr(start_row + i, x, line, curses.color_pair(1) | curses.A_BOLD)
                    elif "Failed" in line and failed > 0:
                        stdscr.addstr(start_row + i, x, line, curses.color_pair(2))
                    elif "All tests passed" in line:
                        stdscr.addstr(start_row + i, x, line, curses.color_pair(1))
                    else:
                        stdscr.addstr(start_row + i, x, line)
                except:
                    pass

        stdscr.refresh()
        stdscr.nodelay(0)
        stdscr.getch()

    def save_results(self):
        """Save test results to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"speedrun_results_{timestamp}.json"

        import json
        with open(filename, 'w') as f:
            json.dump({
                'timestamp': timestamp,
                'total_time': time.time() - self.start_time if self.start_time else 0,
                'completed': len(self.completed_tests),
                'failed': len(self.failed_tests),
                'tests': [
                    {
                        'name': t['name'],
                        'success': t.get('success', False),
                        'duration': t.get('duration', 0),
                        'command': t.get('command', ''),
                        'exit_code': t.get('exit_code', -1)
                    }
                    for t in self.completed_tests
                ]
            }, f, indent=2)

        return filename

def main():
    """Main entry point"""
    # Check CLI binary
    cli_path = Path("../hacka.re")
    if not cli_path.exists():
        print("Error: CLI binary not found!")
        print("Please build the CLI first: ./build-with-assets.sh")
        sys.exit(1)

    # Check size
    size_mb = cli_path.stat().st_size / (1024 * 1024)
    print(f"CLI binary: {cli_path} ({size_mb:.1f}MB)")

    if size_mb < 10:
        print("Warning: Binary seems small. May not have embedded assets.")
        print("Continue anyway? (y/n): ", end='')
        if input().lower() != 'y':
            sys.exit(0)

    print("\n🏃 Starting hacka.re CLI SPEEDRUN Test Visualizer...")
    print("This will run all CLI tests in parallel with live visualization.")
    print("Press ENTER to start or Ctrl+C to cancel...")
    input()

    # Run with curses
    visualizer = SpeedrunVisualizer()

    try:
        curses.wrapper(visualizer.draw_interface)
    except KeyboardInterrupt:
        print("\nSpeedrun interrupted!")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()

    # Save results
    if visualizer.completed_tests:
        filename = visualizer.save_results()
        print(f"\nResults saved to: {filename}")

if __name__ == "__main__":
    main()