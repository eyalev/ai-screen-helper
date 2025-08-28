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

#### Quick Install (Debian/Ubuntu) - Recommended

**One-liner command:**
```bash
curl -s https://raw.githubusercontent.com/eyalev/ai-screen-helper/master/install-latest.sh | sudo bash
```

**Or download and run:**
```bash
wget https://raw.githubusercontent.com/eyalev/ai-screen-helper/master/install-latest.sh
chmod +x install-latest.sh
sudo ./install-latest.sh
```

**Features:**
- ✅ Automatically downloads latest release
- ✅ Checks installed version to avoid unnecessary reinstalls  
- ✅ Prompts before reinstalling same version
- ✅ Handles dependency issues automatically
- ✅ Verifies installation success

#### AppImage (Portable)

1. Download the latest `.AppImage` file from [Releases](https://github.com/eyalev/ai-screen-helper/releases)
2. Make it executable: `chmod +x AI-Screen-Helper-*.AppImage`
3. Run it: `./AI-Screen-Helper-*.AppImage`

#### Manual Debian Package

1. Download the latest `.deb` file from [Releases](https://github.com/eyalev/ai-screen-helper/releases)
2. Install: `sudo dpkg -i ai-screen-helper_*.deb`
3. Run: `ai-screen-helper`

#### From Source

```bash
git clone https://github.com/eyalev/ai-screen-helper.git
cd ai-screen-helper
npm install
```

### Running the Application

```bash
npm start
```

### Updating

#### Automatic Update (Debian Package)

```bash
# Re-run the install script to get the latest version
curl -s https://raw.githubusercontent.com/eyalev/ai-screen-helper/master/install-latest.sh | sudo bash
```

The script will:
- Check your current version vs latest release
- Prompt before reinstalling if versions match
- Automatically upgrade if a newer version is available

#### Manual Update

- **AppImage**: Download the latest version and replace the old file
- **Debian Package**: Download and install the new `.deb` file

### Controls

#### Global Hotkeys
- **Ctrl+Shift+G**: Toggle grid overlay
- **Ctrl+Shift+1**: Switch to display 1 
- **Ctrl+Shift+2**: Switch to display 2
- **Escape**: Hide overlay

#### Grid Overlay (Yellow numbered squares)
- **Click numbered square**: Open zoom window for that area
- **Type number + Enter**: Select grid cell by keyboard (e.g., type "12" then Enter for cell 12)
- **Backspace**: Remove last typed digit

#### Zoom Window (Red numbered squares with incremental numbering)
- **Click grid square**: Close zoom window and execute mouse click
- **Type number + Enter**: Select grid square by keyboard (e.g., type "5" then Enter for square 5)
- **Backspace**: Remove last typed digit  
- **Escape**: Close zoom window
- **Hover grid squares**: Visual highlight showing clickable areas

### Multi-Monitor Support

The app automatically detects all displays and targets the largest screen by default. Use hotkeys to switch between displays:
- **Ctrl+Shift+1**: Primary display (usually left monitor)
- **Ctrl+Shift+2**: Secondary display (usually right monitor)

### For AI Agents

#### Keyboard-First Design
The tool now supports **keyboard-only operation**, perfect for AI agents:

**Main Grid Selection:**
```bash
# Type the grid cell number (1-60) then Enter
"12" + Enter  # Selects grid cell 12 and opens zoom window
```

**Zoom Grid Selection:**  
```bash
# Type the square number (1-N) then Enter  
"5" + Enter   # Selects zoom square 5 and executes click
```

**Complete AI Workflow:**
1. Show overlay: `Ctrl+Shift+G`
2. Select main grid: Type `"12"` + `Enter` 
3. Select zoom square: Type `"5"` + `Enter`
4. Mouse automatically moves and clicks at precise coordinates

#### Traditional Output
The tool still outputs xdotool-compatible commands to console:

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
- Click grid square → Zoom window closes → Move mouse + execute left click
- Clean execution without window interference
- Perfect for AI agents to interact with UI elements

**Debug Mode**:
- Click grid square → Move mouse only (no click)
- Zoom window stays open for continued testing
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