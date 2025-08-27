const { app, BrowserWindow, globalShortcut, screen, desktopCapturer, ipcMain } = require('electron');
const path = require('path');

class ScreenGridApp {
  constructor() {
    this.overlayWindow = null;
    this.zoomWindow = null;
    this.isOverlayVisible = false;
    this.currentScreenshot = null;
    this.gridConfig = {
      rows: 6,
      cols: 10,
      zoomFactor: 3
    };
  }

  async createOverlayWindow() {
    // Get all displays and find the largest one
    const displays = screen.getAllDisplays();
    const largestDisplay = displays.reduce((largest, current) => {
      const largestArea = largest.bounds.width * largest.bounds.height;
      const currentArea = current.bounds.width * current.bounds.height;
      return currentArea > largestArea ? current : largest;
    });
    
    const { width, height } = largestDisplay.bounds;
    const { x: displayX, y: displayY } = largestDisplay.bounds;

    this.overlayWindow = new BrowserWindow({
      width,
      height,
      x: displayX,
      y: displayY,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      }
    });

    this.overlayWindow.setIgnoreMouseEvents(false);
    this.overlayWindow.loadFile(path.join(__dirname, '../renderer/overlay.html'));
    
    // Hide initially
    this.overlayWindow.hide();

    this.overlayWindow.on('closed', () => {
      this.overlayWindow = null;
    });
  }

  async createZoomWindow() {
    this.zoomWindow = new BrowserWindow({
      width: 600,
      height: 600,
      frame: true,
      transparent: false,
      alwaysOnTop: true,
      resizable: true,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      }
    });

    this.zoomWindow.loadFile(path.join(__dirname, '../renderer/zoom.html'));

    this.zoomWindow.on('closed', () => {
      this.zoomWindow = null;
      // Show overlay again when zoom window closes
      if (this.isOverlayVisible && this.overlayWindow) {
        this.overlayWindow.show();
      }
    });
  }

  async captureScreen() {
    try {
      // Get all displays and find the one we're using
      const displays = screen.getAllDisplays();
      const largestDisplay = displays.reduce((largest, current) => {
        const largestArea = largest.bounds.width * largest.bounds.height;
        const currentArea = current.bounds.width * current.bounds.height;
        return currentArea > largestArea ? current : largest;
      });

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { 
          width: largestDisplay.bounds.width,
          height: largestDisplay.bounds.height
        }
      });
      
      if (sources.length > 0) {
        this.currentScreenshot = sources[0].thumbnail.toDataURL();
        this.currentDisplay = largestDisplay;
        console.log(`📸 Captured screen: ${largestDisplay.bounds.width}x${largestDisplay.bounds.height}`);
        return this.currentScreenshot;
      }
    } catch (error) {
      console.error('Screen capture failed:', error);
    }
    return null;
  }

  async toggleOverlay() {
    if (!this.overlayWindow) {
      await this.createOverlayWindow();
    }

    if (this.isOverlayVisible) {
      this.overlayWindow.hide();
      if (this.zoomWindow) {
        this.zoomWindow.hide();
      }
      this.isOverlayVisible = false;
    } else {
      // Capture screen before showing overlay
      await this.captureScreen();
      
      // Send grid configuration and screenshot to overlay
      this.overlayWindow.webContents.send('setup-grid', {
        config: this.gridConfig,
        screenshot: this.currentScreenshot,
        screenSize: this.currentDisplay ? this.currentDisplay.bounds : screen.getPrimaryDisplay().bounds
      });
      
      this.overlayWindow.show();
      this.overlayWindow.focus();
      this.isOverlayVisible = true;
    }
  }

  setupIpcHandlers() {
    ipcMain.on('grid-cell-clicked', async (event, cellData) => {
      console.log('Grid cell clicked:', cellData);
      
      // Hide the overlay when opening zoom window
      if (this.overlayWindow) {
        this.overlayWindow.hide();
      }
      
      if (!this.zoomWindow) {
        await this.createZoomWindow();
      }

      // Send zoom data to zoom window
      this.zoomWindow.webContents.send('show-zoom', {
        cellData,
        screenshot: this.currentScreenshot,
        config: this.gridConfig,
        screenSize: this.currentDisplay ? this.currentDisplay.bounds : screen.getPrimaryDisplay().bounds
      });

      this.zoomWindow.show();
      this.zoomWindow.focus();
    });

    ipcMain.on('coordinate-selected', (event, data) => {
      console.log('Final coordinates selected:', data);
      // Output coordinates in format suitable for xdotool
      console.log(`xdotool mousemove ${data.x} ${data.y}`);
      console.log(`xdotool click 1`);
      
      // Optionally execute xdotool command
      if (data.executeClick) {
        const { exec } = require('child_process');
        exec(`xdotool mousemove ${data.x} ${data.y}`, (error) => {
          if (!error && data.executeClick) {
            exec(`xdotool click 1`);
          }
        });
      }
    });

    ipcMain.on('hide-overlay', () => {
      if (this.overlayWindow) {
        this.overlayWindow.hide();
        this.isOverlayVisible = false;
      }
      if (this.zoomWindow) {
        this.zoomWindow.hide();
      }
    });

    ipcMain.on('show-overlay-again', () => {
      if (this.isOverlayVisible && this.overlayWindow) {
        this.overlayWindow.show();
        this.overlayWindow.focus();
      }
    });

    ipcMain.on('debug-move-mouse', (event, data) => {
      console.log(`🐛 DEBUG: Moving mouse to (${data.x}, ${data.y}) for cell ${data.cellNumber}`);
      
      const { exec } = require('child_process');
      exec(`xdotool mousemove ${data.x} ${data.y}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ DEBUG: xdotool failed:`, error.message);
        } else {
          console.log(`✅ DEBUG: Mouse moved to (${data.x}, ${data.y})`);
          
          // Optional: Add a visual indicator by briefly clicking or moving back
          setTimeout(() => {
            exec('xdotool getmouselocation', (err, out) => {
              if (!err) {
                console.log(`📍 DEBUG: Current mouse position: ${out.trim()}`);
              }
            });
          }, 500);
        }
      });
    });
  }

  registerGlobalShortcuts() {
    // Ctrl+Shift+G to toggle overlay
    globalShortcut.register('CommandOrControl+Shift+G', () => {
      this.toggleOverlay();
    });

    // Ctrl+Shift+1 for display 1, Ctrl+Shift+2 for display 2, etc.
    globalShortcut.register('CommandOrControl+Shift+1', () => {
      this.switchToDisplay(0);
    });
    
    globalShortcut.register('CommandOrControl+Shift+2', () => {
      this.switchToDisplay(1);
    });

    // Escape to hide overlay
    globalShortcut.register('Escape', () => {
      if (this.isOverlayVisible) {
        if (this.overlayWindow) {
          this.overlayWindow.hide();
          this.isOverlayVisible = false;
        }
        if (this.zoomWindow) {
          this.zoomWindow.hide();
        }
      }
    });
  }

  async switchToDisplay(displayIndex) {
    const displays = screen.getAllDisplays();
    if (displayIndex < displays.length) {
      console.log(`Switching to display ${displayIndex + 1}`);
      
      if (this.overlayWindow) {
        this.overlayWindow.close();
        this.overlayWindow = null;
      }
      
      // Recreate overlay on the selected display
      const targetDisplay = displays[displayIndex];
      const { width, height } = targetDisplay.bounds;
      const { x: displayX, y: displayY } = targetDisplay.bounds;

      this.overlayWindow = new BrowserWindow({
        width,
        height,
        x: displayX,
        y: displayY,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        focusable: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          enableRemoteModule: true
        }
      });

      this.overlayWindow.setIgnoreMouseEvents(false);
      this.overlayWindow.loadFile(path.join(__dirname, '../renderer/overlay.html'));
      this.overlayWindow.hide();

      this.overlayWindow.on('closed', () => {
        this.overlayWindow = null;
      });

      if (this.isOverlayVisible) {
        await this.toggleOverlay();
      }
    }
  }

  async initialize() {
    await this.createOverlayWindow();
    this.setupIpcHandlers();
    this.registerGlobalShortcuts();
    
    const displays = screen.getAllDisplays();
    console.log('AI Screen Helper initialized');
    console.log(`Detected ${displays.length} display(s):`);
    displays.forEach((display, index) => {
      const area = display.bounds.width * display.bounds.height;
      console.log(`  Display ${index + 1}: ${display.bounds.width}x${display.bounds.height} (${Math.round(area/1000000)}MP)`);
    });
    console.log('');
    console.log('Controls:');
    console.log('  Ctrl+Shift+G: Toggle grid overlay');
    console.log('  Ctrl+Shift+1: Switch to display 1');
    console.log('  Ctrl+Shift+2: Switch to display 2'); 
    console.log('  Escape: Hide overlay');
  }
}

// App event handlers
app.whenReady().then(async () => {
  const screenGridApp = new ScreenGridApp();
  await screenGridApp.initialize();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      screenGridApp.initialize();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});