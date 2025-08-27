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
- **Click in zoom window**: Select precise coordinates

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
- Exact screen coordinates
- Visual crosshair for precision
- Grid reference system
- One-click execution option
- **Debug Mode**: Toggle checkbox to test coordinate accuracy - clicks will move mouse to target coordinates without clicking

### Grid Configuration

The default grid is 10x6 (10 columns, 6 rows) which works well for most screen sizes. The zoom factor is 3x for detailed targeting.

### Debug Mode

Enable the "Debug Mode" checkbox in the zoom window to test coordinate accuracy:

1. **Check "Debug Mode"** - Orange indicator appears
2. **Click anywhere in zoom area** - Mouse cursor moves to that exact screen coordinate
3. **Verify position** - Check if the cursor landed where expected
4. **Fine-tune if needed** - Use this to validate coordinate calculations

Debug output appears in console:
```
🐛 DEBUG MODE: Moving mouse to (847, 412) for cell 23
✅ DEBUG: Mouse moved to (847, 412)  
📍 DEBUG: Current mouse position: x:847 y:412 screen:0 window:12345
```

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