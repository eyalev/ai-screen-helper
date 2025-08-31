# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Screen Helper is an Electron-based screen grid overlay tool designed specifically for AI agents to perform precise mouse targeting. It provides a hierarchical grid system with two-level zoom functionality and keyboard-first operation for automated mouse control.

## Development Commands

```bash
# Development
npm start                    # Run the application
npm run dev                  # Run with debug logging enabled
npm run build                # Build for distribution using electron-builder
npm run dist                 # Create AppImage and .deb packages

# Testing
# No specific test framework - manual testing with xdotool commands
```

## Architecture

The application follows Electron's main/renderer process model with a specialized grid overlay system:

### Main Process (`src/main/main.js`)
- **ScreenGridApp class**: Core application logic managing three window types
- **Window Management**: Overlay (transparent grid), zoom (magnified view), settings
- **IPC Handlers**: Communication between main and renderer processes
- **xdotool Integration**: Mouse automation through Linux xdotool command execution
- **Settings Persistence**: JSON-based configuration stored in userData directory

### Renderer Processes
- **Overlay (`src/renderer/overlay.html`)**: Transparent grid overlay with numbered cells (10x6 default)
- **Zoom (`src/renderer/zoom.html`)**: Magnified view with interactive grid squares for precise targeting
- **Settings**: Configuration UI for grid customization

### Key Features
- **Keyboard-First Design**: Type cell number + Enter for AI agent compatibility
- **Global Hotkeys**: Ctrl+Shift+G (toggle), Ctrl+Shift+1/2 (display switching), Escape (hide)
- **Debug Mode**: Move-only testing without clicking for coordinate validation
- **Multi-Monitor Support**: Automatic largest display detection with manual switching
- **Configurable Grid**: Customizable rows/cols, opacity, padding, zoom factors

## Configuration System

Settings are stored in `userData/settings.json` with these key properties:
- `rows`/`cols`: Grid dimensions (default 6x10)
- `gridOpacity`: Visual opacity (0.0-1.0)  
- `zoomFactor`: Magnification level (default 3x)
- `zoomPadding`: Padding around zoom area (default 0.5)
- `zoomGridSize`: Pixel size of zoom grid squares (default 30px)
- `numberPrefix`/`numberSuffix`: Grid number display formatting
- `showCoordinates`: Display pixel coordinates in grid cells

## Core Workflow for AI Agents

1. **Activate**: Ctrl+Shift+G or system tray
2. **Grid Selection**: Type cell number (1-60) + Enter
3. **Zoom Targeting**: Type grid square number + Enter in zoom window
4. **Automatic Execution**: Mouse moves and clicks at calculated coordinates

The tool outputs xdotool-compatible commands and can execute them automatically:
```bash
xdotool mousemove 850 450
xdotool click 1
```

## Development Notes

- Uses `nodeIntegration: true` and `contextIsolation: false` for IPC communication
- Screen capture via `desktopCapturer` for background overlay
- Grid coordinate calculations account for display bounds and zoom padding
- DISPLAY environment variable handling for xdotool execution
- Window lifecycle management prevents overlay auto-reappearance

## System Dependencies

- **xdotool**: Required for mouse automation on Linux
- **X11**: Display server (not Wayland compatible)
- **Electron 28+**: Desktop framework

## Distribution

The project builds both AppImage and .deb packages targeting Ubuntu 22.04/24.04 with GitHub Actions automation for releases.