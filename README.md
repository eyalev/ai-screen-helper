# AI Screen Helper

A screen grid overlay tool designed to help AI agents perform precise mouse targeting through a hierarchical grid system.

## Features

- **Transparent Grid Overlay**: Shows numbered grid squares over your screen
- **Two-Level Zoom System**: Click a grid square to see a magnified view with fine-grained coordinates
- **Precise Coordinate Output**: Provides exact pixel coordinates for xdotool integration
- **Global Hotkeys**: Easy activation and control
- **Multi-Monitor Support**: Works with different screen sizes

## Usage

### Installation

```bash
npm install
```

### Running the Application

```bash
npm start
```

### Controls

- **Ctrl+Shift+G**: Toggle grid overlay
- **Ctrl+Shift+1**: Switch to display 1 
- **Ctrl+Shift+2**: Switch to display 2
- **Escape**: Hide overlay
- **Click numbered square**: Open zoom window for that area
- **Click grid square in zoom**: Execute mouse click at those coordinates
- **Hover grid squares**: Visual highlight showing clickable areas

### Multi-Monitor Support

The app automatically detects all displays and targets the largest screen by default. Use hotkeys to switch between displays:
- **Ctrl+Shift+1**: Primary display (usually left monitor)
- **Ctrl+Shift+2**: Secondary display (usually right monitor)

### For AI Agents

The tool outputs xdotool-compatible commands to the console:

```bash
xdotool mousemove 850 450
xdotool click 1
```

The zoom window provides:
- **Interactive Grid Squares**: Hover to highlight, click to execute
- **Visual Feedback**: Yellow hover effects, red click confirmation
- **Automatic Execution**: Moves mouse and clicks in one action
- **Precise Targeting**: 20x20 pixel grid squares with center-point clicking
- **Debug Mode**: Toggle checkbox to test coordinate accuracy - clicks will move mouse to target coordinates without clicking

### Grid Configuration

The default grid is 10x6 (10 columns, 6 rows) which works well for most screen sizes. The zoom factor is 3x for detailed targeting.

### Debug Mode

Enable the "Debug Mode" checkbox in the zoom window to test coordinate accuracy:

1. **Check "Debug Mode"** - Orange indicator appears
2. **Click grid squares** - Mouse cursor moves to center of square (no clicking)
3. **Verify position** - Check if the cursor landed where expected
4. **Fine-tune if needed** - Use this to validate coordinate calculations

**Normal Mode** (default):
- Click grid square → Move mouse + execute left click
- Red flash confirms click execution
- Perfect for AI agents to interact with UI elements

**Debug Mode**:
- Click grid square → Move mouse only (no click)
- Safe for testing coordinate accuracy
- Console shows detailed movement logging

## Architecture

- **Main Process**: Handles screen capture, window management, and system integration
- **Overlay Renderer**: Transparent grid display with click handling  
- **Zoom Renderer**: Magnified view with precise coordinate selection

## Development

```bash
npm run dev  # Run with debug logging
npm run build  # Build for distribution
```

## Building Distribution

```bash
npm run dist
```

This creates AppImage and .deb packages in the `dist/` directory.

## System Requirements

- Ubuntu 22.04 or 24.04
- xdotool (for mouse automation)
- X11 display server

## License

MIT