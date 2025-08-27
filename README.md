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

### Grid Configuration

The default grid is 10x6 (10 columns, 6 rows) which works well for most screen sizes. The zoom factor is 3x for detailed targeting.

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