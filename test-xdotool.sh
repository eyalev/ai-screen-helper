#!/bin/bash

# Test script to verify xdotool functionality
echo "Testing xdotool integration..."

# Check if xdotool is installed
if ! command -v xdotool &> /dev/null; then
    echo "❌ xdotool is not installed"
    echo "Install with: sudo apt install xdotool"
    exit 1
fi

echo "✅ xdotool is available"

# Test basic xdotool commands
echo "Current mouse position:"
xdotool getmouselocation

echo "✅ xdotool test completed"
echo "Ready to use AI Screen Helper!"