#!/bin/bash

echo "Clearing old trace..."
> /tmp/hacka_trace.txt

echo "Watching /tmp/hacka_trace.txt"
echo "================================"
echo ""
echo "1. Run ./hacka.re in another terminal"
echo "2. Press 0 for settings"
echo "3. Press arrow keys"
echo ""
echo "Trace will appear below:"
echo "--------------------------------"

tail -f /tmp/hacka_trace.txt