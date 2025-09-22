#!/usr/bin/env python3
"""
User Story Video Recorder
Command-line tool to easily record user story videos with different configurations.
"""

import os
import sys
import argparse
import subprocess
from datetime import datetime
from pathlib import Path

# Available user stories
STORIES = {
    'rebel_mission': {
        'module': 'test_rebel_mission_story',
        'class': 'RebelMissionStory',
        'description': 'Rebel mission to blow up the Death Star'
    },
    'customer_support': {
        'module': 'test_customer_support_story',
        'class': 'CustomerSupportStory',
        'description': 'Customer support bot with escalation'
    },
    'code_review': {
        'module': 'test_code_review_story',
        'class': 'CodeReviewStory',
        'description': 'Code review assistant with analysis functions'
    },
    'data_analysis': {
        'module': 'test_data_analysis_story',
        'class': 'DataAnalysisStory',
        'description': 'Data processing pipeline with multiple functions'
    },
    'security_audit': {
        'module': 'test_security_audit_story',
        'class': 'SecurityAuditStory',
        'description': 'Security scanning with MCP integration'
    }
}

def list_stories():
    """List all available user stories"""
    print("\n📚 Available User Stories:\n")
    for key, info in STORIES.items():
        print(f"  • {key:20} - {info['description']}")
    print("\nUsage: python record_user_story.py --story <story_name> [options]")
    print()

def record_story(story_name, **kwargs):
    """Record a specific user story"""

    if story_name not in STORIES:
        print(f"❌ Unknown story: {story_name}")
        list_stories()
        return 1

    story_info = STORIES[story_name]

    # Build the Python command to run the story
    cmd = [
        sys.executable,
        "-c",
        f"""
import sys
import os
sys.path.insert(0, '{os.path.dirname(__file__)}')
sys.path.insert(0, '{os.path.dirname(os.path.dirname(__file__))}')

from {story_info['module']} import {story_info['class']}

story = {story_info['class']}(
    headless={kwargs.get('headless', False)},
    slowmo={kwargs.get('slowmo', 100)},
    video_size={{
        'width': {kwargs.get('width', 1280)},
        'height': {kwargs.get('height', 720)}
    }}
)

story.run_story()
"""
    ]

    # Ensure server is running
    if not kwargs.get('skip_server'):
        if not check_server():
            print("📡 Starting local server...")
            start_server()

    print(f"\n🎬 Recording: {story_info['description']}")
    print(f"📹 Video settings: {kwargs.get('width', 1280)}x{kwargs.get('height', 720)}")
    print(f"🐌 Slow motion: {kwargs.get('slowmo', 100)}ms")
    print(f"👁️ Headless: {kwargs.get('headless', False)}")
    print()

    # Run the story
    result = subprocess.run(cmd, cwd=os.path.dirname(os.path.dirname(__file__)))

    if result.returncode == 0:
        print(f"\n✅ Story recorded successfully!")

        # Find and display the video path (now looking for MP4)
        video_dir = Path("../../videos/user_stories")
        # Look for presentation MP4 files first
        latest_videos = sorted(video_dir.glob(f"{story_name}_*_presentation.mp4"), key=os.path.getmtime)

        # Fallback to WebM if MP4 not found (ffmpeg might not be installed)
        if not latest_videos:
            latest_videos = sorted(video_dir.glob(f"{story_name}_*.webm"), key=os.path.getmtime)

        if latest_videos:
            latest_video = latest_videos[-1]
            print(f"📹 Video saved: {latest_video}")

            # Show file size
            size_mb = os.path.getsize(latest_video) / (1024 * 1024)
            print(f"📦 Size: {size_mb:.1f}MB")

            # Optionally open the video
            if kwargs.get('open'):
                open_video(str(latest_video))
    else:
        print(f"\n❌ Story recording failed!")
        return 1

    return 0

def check_server():
    """Check if the local server is running"""
    try:
        import urllib.request
        response = urllib.request.urlopen('http://localhost:8000', timeout=1)
        return response.status == 200
    except:
        return False

def start_server():
    """Start the local development server"""
    script_path = Path(__file__).parent.parent.parent / "scripts" / "start_server.sh"
    if script_path.exists():
        subprocess.Popen([str(script_path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        import time
        time.sleep(2)  # Give server time to start
    else:
        print("⚠️ Could not find server start script. Please start manually.")

def open_video(video_path):
    """Open the video file in the default player"""
    import platform

    if platform.system() == 'Darwin':  # macOS
        subprocess.run(['open', video_path])
    elif platform.system() == 'Linux':
        subprocess.run(['xdg-open', video_path])
    elif platform.system() == 'Windows':
        subprocess.run(['start', video_path], shell=True)

def batch_record(stories, **kwargs):
    """Record multiple stories in sequence"""
    results = []

    print(f"\n📚 Recording {len(stories)} stories in batch mode\n")

    for i, story in enumerate(stories, 1):
        print(f"\n[{i}/{len(stories)}] Recording: {story}")
        print("-" * 60)

        result = record_story(story, **kwargs)
        results.append((story, result == 0))

        if result != 0 and not kwargs.get('continue_on_error'):
            print(f"\n❌ Batch recording stopped due to error in: {story}")
            break

    # Print summary
    print("\n" + "=" * 60)
    print("📊 BATCH RECORDING SUMMARY")
    print("=" * 60)

    for story, success in results:
        status = "✅" if success else "❌"
        print(f"{status} {story}")

    success_count = sum(1 for _, s in results if s)
    print(f"\nTotal: {success_count}/{len(results)} successful")

def main():
    parser = argparse.ArgumentParser(
        description="Record user story videos for hacka.re",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Record a single story with default settings
  python record_user_story.py --story rebel_mission

  # Record in visible browser with HD video
  python record_user_story.py --story rebel_mission --visible --width 1920 --height 1080

  # Record with extra slow motion for presentations
  python record_user_story.py --story rebel_mission --slowmo 500

  # Record all stories in batch
  python record_user_story.py --batch all

  # List available stories
  python record_user_story.py --list
        """
    )

    parser.add_argument('--story', type=str, help='Name of the story to record')
    parser.add_argument('--list', action='store_true', help='List available stories')
    parser.add_argument('--batch', nargs='+', help='Record multiple stories (use "all" for all stories)')

    # Video settings
    parser.add_argument('--width', type=int, default=1280, help='Video width (default: 1280)')
    parser.add_argument('--height', type=int, default=720, help='Video height (default: 720)')
    parser.add_argument('--visible', dest='headless', action='store_false', help='Run in visible browser mode')
    parser.add_argument('--headless', action='store_true', default=False, help='Run in headless mode (default)')
    parser.add_argument('--slowmo', type=int, default=100, help='Slow motion delay in ms (default: 100)')

    # Other options
    parser.add_argument('--open', action='store_true', help='Open video after recording')
    parser.add_argument('--skip-server', action='store_true', help='Skip server check/start')
    parser.add_argument('--continue-on-error', action='store_true', help='Continue batch even if a story fails')

    args = parser.parse_args()

    # Handle list command
    if args.list:
        list_stories()
        return 0

    # Handle batch recording
    if args.batch:
        if 'all' in args.batch:
            stories = list(STORIES.keys())
        else:
            stories = args.batch

        batch_record(stories, **vars(args))
        return 0

    # Handle single story recording
    if args.story:
        return record_story(args.story, **vars(args))

    # No action specified
    parser.print_help()
    print()
    list_stories()
    return 1

if __name__ == "__main__":
    sys.exit(main())