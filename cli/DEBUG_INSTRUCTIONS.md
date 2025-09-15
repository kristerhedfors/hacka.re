# Debug Instructions for hacka.re CLI

## Fixed Log Path System

The debug log is now **ALWAYS** written to:
```
/tmp/hacka_debug.log
```

## How to Use:

### 1. Enable Debug Logging
```bash
export HACKARE_LOG_LEVEL=DEBUG
```

### 2. Run the CLI
```bash
./hacka.re
```

### 3. When Done Testing
Tell me "I'm done" or "check the log" and I'll read it using:
```bash
./show_log.sh
```

Or you can manually show me the log with:
```bash
cat /tmp/hacka_debug.log | tail -100
```

## What Gets Logged:

- Session start markers (════════)
- All key events ([KEY])
- State changes ([STATE])
- Arrow movements ([ARROW-UP/DOWN])
- Modal transitions
- ESC handling
- Any errors or issues

## Quick Test:

1. Start the CLI with debug:
   ```bash
   export HACKARE_LOG_LEVEL=DEBUG
   ./hacka.re
   ```

2. Do your test:
   - Press 0 to open settings
   - Try arrow keys
   - Press ESC to return
   - Try ESC again to exit

3. If it freezes, press Ctrl+C to force quit

4. Show me the log:
   ```bash
   ./show_log.sh
   ```

## The Log is Cumulative

Each session adds to the same file with a clear separator:
```
════════════════════════════════════════
NEW SESSION STARTED: 2025-09-15 22:35:00
Debug log: /tmp/hacka_debug.log
════════════════════════════════════════
```

This makes it easy to see multiple attempts and compare behavior.