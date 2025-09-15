#!/usr/bin/env python3
"""
Real-time log monitor for hacka.re CLI
Provides structured output for Claude to analyze and guide users
"""

import os
import re
import sys
import time
import glob
import json
from datetime import datetime
from pathlib import Path
import subprocess

class RealTimeMonitor:
    def __init__(self):
        self.log_dir = "/tmp"
        self.current_state = {
            "modal": "unknown",
            "selected_field": 0,
            "editing": False,
            "model_dropdown": False,
            "expanded_field": -1,
            "last_key": None,
            "key_press_count": 0,
            "arrow_movements": [],
            "issues": []
        }
        self.field_names = [
            "API Provider",
            "Base URL",
            "API Key",
            "Model",
            "Max Tokens",
            "Temperature",
            "System Prompt",
            "Stream Response",
            "YOLO Mode",
            "Voice Control"
        ]

    def find_latest_log(self):
        """Find the most recent debug log file"""
        pattern = os.path.join(self.log_dir, "debug_*.log")
        files = glob.glob(pattern)
        if not files:
            return None
        return max(files, key=os.path.getctime)

    def parse_log_line(self, line):
        """Parse a log line and extract structured information"""
        # Pattern: [timestamp] LEVEL [file:line] message
        match = re.match(r'\[([^\]]+)\]\s+(\w+)\s+\[([^:]+):(\d+)\]\s+(.+)', line)
        if not match:
            return None

        return {
            "timestamp": match.group(1),
            "level": match.group(2),
            "file": match.group(3),
            "line": int(match.group(4)),
            "message": match.group(5)
        }

    def analyze_message(self, parsed):
        """Analyze a parsed log message and update state"""
        if not parsed:
            return None

        msg = parsed["message"]
        analysis = {"type": "info", "content": ""}

        # State tracking
        if "[STATE]" in msg:
            state_match = re.search(r'modelDropdown=(\w+), modelMenu=(\w+), selected=(\d+), editing=(\w+), expanded=(-?\d+)', msg)
            if state_match:
                self.current_state["model_dropdown"] = state_match.group(1) == "true"
                self.current_state["selected_field"] = int(state_match.group(3))
                self.current_state["editing"] = state_match.group(4) == "true"
                self.current_state["expanded_field"] = int(state_match.group(5))

                field_name = self.field_names[self.current_state["selected_field"]] if self.current_state["selected_field"] < len(self.field_names) else "Unknown"
                analysis = {
                    "type": "state",
                    "content": f"On field #{self.current_state['selected_field']}: {field_name}",
                    "details": self.current_state
                }

        # Key events
        elif "[KEY]" in msg:
            key_match = re.search(r'Key=(\d+)', msg)
            if key_match:
                key_code = int(key_match.group(1))
                key_name = {
                    257: "ARROW_UP",
                    258: "ARROW_DOWN",
                    27: "ESC",
                    13: "ENTER",
                    9: "TAB"
                }.get(key_code, f"KEY_{key_code}")

                self.current_state["last_key"] = key_name
                self.current_state["key_press_count"] += 1

        # Arrow movement tracking
        elif "[ARROW-UP] Moving selection:" in msg or "[ARROW-DOWN] Moving selection:" in msg:
            move_match = re.search(r'(\d+) -> (\d+)', msg)
            if move_match:
                from_field = int(move_match.group(1))
                to_field = int(move_match.group(2))
                direction = "UP" if "ARROW-UP" in msg else "DOWN"

                self.arrow_movements.append({
                    "time": datetime.now().isoformat(),
                    "direction": direction,
                    "from": from_field,
                    "to": to_field
                })

                field_name = self.field_names[to_field] if to_field < len(self.field_names) else "Unknown"
                analysis = {
                    "type": "movement",
                    "content": f"✓ Moved {direction} to field #{to_field}: {field_name}",
                    "success": True
                }

        # No action warnings
        elif "No action:" in msg:
            if "ARROW-UP" in msg:
                analysis = {
                    "type": "warning",
                    "content": "⚠ Arrow UP at boundary (field 0) - no movement",
                    "issue": "at_top"
                }
            elif "ARROW-DOWN" in msg:
                analysis = {
                    "type": "warning",
                    "content": f"⚠ Arrow DOWN at boundary (field {self.current_state['selected_field']}) - no movement",
                    "issue": "at_bottom"
                }

        # Modal changes
        elif "modal opened" in msg:
            if "Settings" in msg:
                self.current_state["modal"] = "settings"
                analysis = {
                    "type": "modal",
                    "content": "📋 Settings modal opened - Arrow keys should work for navigation"
                }
            elif "Main menu" in msg:
                self.current_state["modal"] = "main_menu"
                analysis = {
                    "type": "modal",
                    "content": "📋 Main menu opened - Use numbers or arrows to select"
                }

        # Model dropdown interference
        elif "[MODEL-DROPDOWN] Active" in msg:
            analysis = {
                "type": "issue",
                "content": "⚠ MODEL DROPDOWN IS ACTIVE - This may interfere with arrow keys!",
                "severity": "high"
            }

        return analysis

    def print_status_summary(self):
        """Print a summary of the current state"""
        print("\n" + "="*60)
        print("CURRENT STATUS SUMMARY")
        print("="*60)
        print(f"Modal: {self.current_state['modal']}")
        print(f"Selected Field: #{self.current_state['selected_field']}", end="")
        if self.current_state['selected_field'] < len(self.field_names):
            print(f" ({self.field_names[self.current_state['selected_field']]})")
        else:
            print()
        print(f"Editing: {self.current_state['editing']}")
        print(f"Model Dropdown: {self.current_state['model_dropdown']}")
        print(f"Last Key: {self.current_state['last_key']}")
        print(f"Total Key Presses: {self.current_state['key_press_count']}")

        if len(self.arrow_movements) > 0:
            print(f"\nRecent Movements:")
            for move in self.arrow_movements[-5:]:
                print(f"  {move['direction']}: {move['from']} → {move['to']}")
        print("="*60)

    def monitor(self):
        """Main monitoring loop"""
        print("="*60)
        print("REAL-TIME MONITOR FOR HACKA.RE CLI")
        print("="*60)
        print("\nWaiting for log file...")
        print("Start './hacka.re' with HACKARE_LOG_LEVEL=DEBUG")
        print()

        # Wait for log file
        log_file = None
        while not log_file:
            log_file = self.find_latest_log()
            if not log_file:
                time.sleep(0.5)
                continue

        print(f"📁 Monitoring: {log_file}\n")
        print("-"*60)
        print("REAL-TIME ANALYSIS:")
        print("-"*60 + "\n")

        # Open and tail the log file
        with subprocess.Popen(['tail', '-f', log_file],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            universal_newlines=True) as proc:
            try:
                for line in proc.stdout:
                    line = line.strip()
                    if not line:
                        continue

                    # Parse and analyze
                    parsed = self.parse_log_line(line)
                    if parsed:
                        analysis = self.analyze_message(parsed)

                        if analysis:
                            # Format output based on type
                            if analysis["type"] == "state":
                                print(f"[STATE] {analysis['content']}")
                            elif analysis["type"] == "movement":
                                print(f"[MOVE] {analysis['content']}")
                            elif analysis["type"] == "warning":
                                print(f"[WARN] {analysis['content']}")
                            elif analysis["type"] == "issue":
                                print(f"[ISSUE] {analysis['content']}")
                            elif analysis["type"] == "modal":
                                print(f"[MODAL] {analysis['content']}")

                            # Print detailed guidance for issues
                            if analysis["type"] in ["warning", "issue"]:
                                if "issue" in analysis:
                                    if analysis["issue"] == "at_top":
                                        print("  → Already at the first field, can't go up")
                                    elif analysis["issue"] == "at_bottom":
                                        print("  → Already at the last field, can't go down")

                                if "severity" in analysis and analysis["severity"] == "high":
                                    print("  → ACTION NEEDED: Press ESC to close dropdown")

                        # Periodically print summary
                        if self.current_state["key_press_count"] % 10 == 0 and self.current_state["key_press_count"] > 0:
                            self.print_status_summary()

            except KeyboardInterrupt:
                print("\n\nMonitoring stopped.")
                self.print_status_summary()

if __name__ == "__main__":
    # Set environment variable
    os.environ["HACKARE_LOG_LEVEL"] = "DEBUG"

    monitor = RealTimeMonitor()
    monitor.monitor()