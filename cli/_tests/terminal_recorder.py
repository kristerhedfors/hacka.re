#!/usr/bin/env python3
"""
Terminal Recorder for hacka.re CLI Testing
Records terminal sessions with asciinema-style output for playback
"""

import subprocess
import sys
import time
import os
import json
import tempfile
from pathlib import Path
from datetime import datetime
import pty
import select
import termios
import tty
import fcntl
import struct
import shutil
from port_utils import get_random_port

class TerminalRecorder:
    """Records terminal sessions for later playback"""

    def __init__(self, output_dir: str = "recordings"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.recording = []
        self.start_time = None
        self.terminal_size = self._get_terminal_size()

    def _get_terminal_size(self):
        """Get current terminal size"""
        try:
            size = os.get_terminal_size()
            return {"cols": size.columns, "rows": size.lines}
        except:
            return {"cols": 80, "rows": 24}

    def record_command(self, cmd: list, max_duration: float = 10.0, test_name: str = "test"):
        """Record a command execution with PTY"""
        self.recording = []
        self.start_time = time.time()

        # Create header for asciinema format
        header = {
            "version": 2,
            "width": self.terminal_size["cols"],
            "height": self.terminal_size["rows"],
            "timestamp": int(self.start_time),
            "title": f"hacka.re CLI - {test_name}",
            "env": {"TERM": os.environ.get("TERM", "xterm-256color"), "SHELL": "/bin/bash"}
        }

        # Use PTY for proper terminal emulation
        master_fd, slave_fd = pty.openpty()

        # Set terminal size
        try:
            fcntl.ioctl(slave_fd, termios.TIOCSWINSZ,
                       struct.pack('HHHH', self.terminal_size["rows"], self.terminal_size["cols"], 0, 0))
        except:
            pass

        # Start process
        process = subprocess.Popen(
            cmd,
            stdin=slave_fd,
            stdout=slave_fd,
            stderr=slave_fd,
            preexec_fn=os.setsid
        )

        os.close(slave_fd)

        # Make master_fd non-blocking
        flags = fcntl.fcntl(master_fd, fcntl.F_GETFL)
        fcntl.fcntl(master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

        output_buffer = []
        last_output_time = self.start_time

        try:
            while time.time() - self.start_time < max_duration:
                # Check if process has finished
                if process.poll() is not None:
                    # Read any remaining output
                    try:
                        while True:
                            data = os.read(master_fd, 1024)
                            if data:
                                current_time = time.time()
                                self.recording.append([current_time - self.start_time, "o", data.decode('utf-8', errors='replace')])
                                output_buffer.append(data.decode('utf-8', errors='replace'))
                            else:
                                break
                    except:
                        pass
                    break

                # Check for output
                ready, _, _ = select.select([master_fd], [], [], 0.01)
                if ready:
                    try:
                        data = os.read(master_fd, 1024)
                        if data:
                            current_time = time.time()
                            self.recording.append([current_time - self.start_time, "o", data.decode('utf-8', errors='replace')])
                            output_buffer.append(data.decode('utf-8', errors='replace'))
                            last_output_time = current_time
                    except OSError:
                        break

                # Add periodic timestamps for long-running commands
                if time.time() - last_output_time > 1.0 and len(output_buffer) > 0:
                    self.recording.append([time.time() - self.start_time, "o", ""])

        except KeyboardInterrupt:
            process.terminate()
        finally:
            os.close(master_fd)
            if process.poll() is None:
                process.terminate()
                time.sleep(0.5)
                if process.poll() is None:
                    process.kill()

        # Save recording
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = self.output_dir / f"{test_name}_{timestamp}.cast"

        with open(filename, 'w') as f:
            # Write header
            json.dump(header, f)
            f.write('\n')
            # Write events
            for event in self.recording:
                json.dump(event, f)
                f.write('\n')

        return {
            'filename': str(filename),
            'duration': time.time() - self.start_time,
            'output': ''.join(output_buffer),
            'events': len(self.recording),
            'exit_code': process.returncode
        }

    def create_animated_svg(self, cast_file: str, svg_file: str = None):
        """Convert asciinema cast file to animated SVG (requires svg-term)"""
        if svg_file is None:
            svg_file = cast_file.replace('.cast', '.svg')

        # Check if svg-term is installed
        if shutil.which('svg-term') is None:
            return None

        try:
            subprocess.run(['svg-term', '--in', cast_file, '--out', svg_file], check=True)
            return svg_file
        except:
            return None

    def play_recording(self, cast_file: str):
        """Play back a recording in the terminal"""
        if not Path(cast_file).exists():
            print(f"Recording not found: {cast_file}")
            return

        with open(cast_file, 'r') as f:
            header = json.loads(f.readline())
            print(f"\n📼 Playing: {header.get('title', 'Recording')}")
            print(f"Size: {header['width']}x{header['height']}")
            print("-" * 40)

            # Clear screen for playback
            print("\033[2J\033[H", end='')

            events = []
            for line in f:
                events.append(json.loads(line))

            # Playback events with timing
            for i, event in enumerate(events):
                timestamp, event_type, data = event

                # Wait for the appropriate time
                if i > 0:
                    delay = timestamp - events[i-1][0]
                    if delay > 0:
                        time.sleep(min(delay, 1.0))  # Cap delays at 1 second for better playback

                # Output the data
                if event_type == "o":
                    sys.stdout.write(data)
                    sys.stdout.flush()

            print("\n" + "-" * 40)
            print("📼 Playback complete")

def main():
    """Demo the terminal recorder"""
    recorder = TerminalRecorder()

    # Check if CLI exists
    cli_path = Path("../hacka.re")
    if not cli_path.exists():
        print("Error: CLI binary not found. Please build first.")
        sys.exit(1)

    print("🎬 Terminal Recorder for hacka.re CLI")
    print("=" * 50)

    # Get a random port for testing
    test_port = get_random_port()

    tests = [
        ("help", [str(cli_path), "--help"], 2),
        ("browse_help", [str(cli_path), "browse", "--help"], 2),
        ("serve_verbose", [str(cli_path), "serve", "-v", "-p", str(test_port)], 3),
        ("chat_help", [str(cli_path), "chat", "--help"], 2),
    ]

    recordings = []

    for test_name, cmd, duration in tests:
        print(f"\n🎬 Recording: {test_name}")
        print(f"Command: {' '.join(cmd)}")

        result = recorder.record_command(cmd, duration, test_name)

        print(f"✅ Recorded: {result['filename']}")
        print(f"   Duration: {result['duration']:.2f}s")
        print(f"   Events: {result['events']}")
        print(f"   Exit code: {result['exit_code']}")

        recordings.append(result['filename'])

        # Try to create SVG
        svg = recorder.create_animated_svg(result['filename'])
        if svg:
            print(f"   SVG: {svg}")

    print("\n" + "=" * 50)
    print("🎬 All recordings complete!")
    print("\nRecordings saved in:", recorder.output_dir)

    # Offer to play back a recording
    print("\nWould you like to play back a recording? (y/n): ", end='')
    if input().lower() == 'y':
        print("\nAvailable recordings:")
        for i, rec in enumerate(recordings, 1):
            print(f"  {i}. {Path(rec).name}")

        print("\nEnter number to play (or 0 to skip): ", end='')
        choice = input()
        if choice.isdigit() and 0 < int(choice) <= len(recordings):
            recorder.play_recording(recordings[int(choice) - 1])

if __name__ == "__main__":
    main()