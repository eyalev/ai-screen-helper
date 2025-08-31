const { app, BrowserWindow, globalShortcut, screen, desktopCapturer, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

class ScreenGridApp {
  constructor() {
    this.overlayWindow = null;
    this.zoomWindow = null;
    this.settingsWindow = null;
    this.tray = null;
    this.isOverlayVisible = false;
    this.currentScreenshot = null;
    this.executingClick = false;
    this.settingsPath = path.join(app.getPath('userData'), 'settings.json');
    this.defaultGridConfig = {
      rows: 6,
      cols: 10,
      gridOpacity: 0.8, // Default opacity for grid elements (borders, numbers, backgrounds)
      showCoordinates: false, // Show coordinates in grid squares by default
      numberPrefix: '', // Text to display before grid numbers (e.g., "[")
      numberSuffix: '', // Text to display after grid numbers (e.g., "]")
      zoomFactor: 3,
      zoomPadding: 0.5, // Default padding as fraction of grid square size (0.5 = half grid square)
      zoomGridSize: 30 // Size of each grid square in zoom window (pixels)
    };
    this.gridConfig = { ...this.defaultGridConfig };
  }

  loadSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf8');
        const savedSettings = JSON.parse(data);
        
        // Merge with defaults to ensure all properties exist
        this.gridConfig = { ...this.defaultGridConfig, ...savedSettings };
        console.log('💾 SETTINGS: Loaded from disk:', this.gridConfig);
      } else {
        console.log('💾 SETTINGS: No settings file found, using defaults');
      }
    } catch (error) {
      console.error('❌ SETTINGS: Failed to load settings:', error.message);
      this.gridConfig = { ...this.defaultGridConfig };
    }
  }

  saveSettings() {
    try {
      // Ensure userData directory exists
      const userDataDir = app.getPath('userData');
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }
      
      const data = JSON.stringify(this.gridConfig, null, 2);
      fs.writeFileSync(this.settingsPath, data, 'utf8');
      console.log('💾 SETTINGS: Saved to disk:', this.gridConfig);
    } catch (error) {
      console.error('❌ SETTINGS: Failed to save settings:', error.message);
    }
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
      frame: true,
      transparent: false,
      alwaysOnTop: false, // Temporarily disable to allow maximization
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
      console.log(`🔍 ZOOM CLOSED: executingClick=${this.executingClick}, isOverlayVisible=${this.isOverlayVisible}`);
      this.zoomWindow = null;
      
      // NEVER show overlay again automatically - user must explicitly toggle with Ctrl+Shift+G
      console.log('📋 ZOOM CLOSED: Never auto-showing overlay - user must toggle manually');
      
      // Reset the executing flag after a longer delay
      setTimeout(() => {
        console.log('🔄 RESET: executingClick flag reset to false');
        this.executingClick = false;
      }, 3000);
    });
  }

  async createSettingsWindow() {
    this.settingsWindow = new BrowserWindow({
      width: 450,
      height: 600,
      frame: true,
      transparent: false,
      alwaysOnTop: false,
      resizable: false,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      }
    });

    this.settingsWindow.loadFile(path.join(__dirname, '../renderer/settings.html'));

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });

    this.settingsWindow.on('close', (event) => {
      if (!app.isQuitting) {
        event.preventDefault();
        this.settingsWindow.hide();
      }
    });
  }

  createSystemTray() {
    // Create a simple 16x16 icon programmatically
    const icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFkSURBVDiNpZM9SwNBEIafgxCwsLGwsLW1tbW1sLGwsLaxsLGwsLW1tbW1sLGwsLW1sLGwsLW1tbaxsLGwsLW1tbGwsLGwsLW1sLGwsLGwsLW1tbGwsLGwsLW1tbGwsLGwsLW1tbGwsLGwsLW1tbGwsLGwsLW1tZ+7mZ2ZnXmfmZ2ZnQEAAP//7L9hDAAAAwBJREFUeJyl081rE1EQB/DfJm2S1qRJ2qRpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZpmqZp/s/8P/4B8wJwBzALcAcwC3AHMAtw'
    );

    this.tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'AI Screen Helper',
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Toggle Grid Overlay',
        click: () => {
          this.toggleOverlay();
        }
      },
      {
        label: 'Settings',
        click: () => {
          this.showSettings();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip('AI Screen Helper - Grid Overlay Tool');

    this.tray.on('click', () => {
      this.toggleOverlay();
    });
  }

  showSettings() {
    if (!this.settingsWindow) {
      this.createSettingsWindow();
    }
    this.settingsWindow.webContents.send('load-settings', this.gridConfig);
    this.settingsWindow.show();
    this.settingsWindow.focus();
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
      this.isOverlayVisible = true;
      
      // Small delay to ensure window is fully shown before focusing
      setTimeout(() => {
        // Force focus even with focusable: false for keyboard input
        this.overlayWindow.setFocusable(true);
        this.overlayWindow.focus();
        // Set back to non-focusable after a brief moment to prevent UI interference
        setTimeout(() => {
          this.overlayWindow.setFocusable(false);
        }, 100);
        console.log('📋 OVERLAY: Window focused for keyboard input');
      }, 100);
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
      
      // Maximize the window after a brief delay, then set alwaysOnTop
      setTimeout(() => {
        this.zoomWindow.maximize();
        setTimeout(() => {
          this.zoomWindow.setAlwaysOnTop(true); // Set alwaysOnTop after maximization
          this.zoomWindow.focus();
        }, 100);
      }, 50);
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
      console.log('📋 SHOW OVERLAY: Back to Grid button pressed');
      if (this.overlayWindow) {
        this.overlayWindow.show();
        this.isOverlayVisible = true;
        
        // Small delay to ensure window is fully shown before focusing
        setTimeout(() => {
          this.overlayWindow.focus();
          console.log('📋 SHOW OVERLAY: Overlay shown and focused for keyboard input');
        }, 100);
      }
    });

    ipcMain.on('debug-move-mouse', (event, data) => {
      console.log(`🐛 DEBUG: Moving mouse to (${data.x}, ${data.y}) for cell ${data.cellNumber}`);
      
      const { exec } = require('child_process');
      exec(`xdotool mousemove ${data.x} ${data.y}`, { 
        env: { ...process.env, DISPLAY: process.env.DISPLAY || ':1' }
      }, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ DEBUG: xdotool failed:`, error.message);
          console.error(`   Stderr: ${stderr}`);
        } else {
          console.log(`✅ DEBUG: Mouse moved to (${data.x}, ${data.y})`);
          
          // Optional: Add a visual indicator by briefly clicking or moving back
          setTimeout(() => {
            exec('xdotool getmouselocation', { 
              env: { ...process.env, DISPLAY: process.env.DISPLAY || ':1' }
            }, (err, out) => {
              if (!err) {
                console.log(`📍 DEBUG: Current mouse position: ${out.trim()}`);
              }
            });
          }, 500);
        }
      });
    });

    ipcMain.on('hide-overlay-and-execute', (event, data) => {
      console.log(`🚀 HIDE AND EXECUTE: Immediately hiding overlay and executing click at (${data.x}, ${data.y}) for cell ${data.cellNumber}`);
      
      // Set executing flag immediately to prevent overlay from reappearing
      this.executingClick = true;
      
      // Hide overlay window immediately
      if (this.overlayWindow) {
        this.overlayWindow.hide();
        this.isOverlayVisible = false;
        console.log('📋 IMMEDIATE: Overlay hidden');
      }
      
      // Execute the click after a brief delay for window closing
      setTimeout(() => {
        this.executeActualClick(data);
      }, 200);
    });

    ipcMain.on('prepare-execute', (event, data) => {
      console.log(`🚀 PREPARE EXECUTE: Setting up for click at (${data.x}, ${data.y}) for cell ${data.cellNumber}`);
      
      // Set executing flag immediately to prevent overlay from reappearing
      this.executingClick = true;
      
      // Hide overlay window as well
      if (this.overlayWindow) {
        this.overlayWindow.hide();
        this.isOverlayVisible = false;
        console.log('📋 PREPARE: Overlay hidden');
      }
      
      // Execute the click after zoom window closes
      setTimeout(() => {
        this.executeActualClick(data);
      }, 300);
    });

    ipcMain.on('execute-click', (event, data) => {
      // Legacy handler - not used with new prepare-execute flow
      console.log(`🖱️ LEGACY EXECUTE: Move and click at (${data.x}, ${data.y}) for cell ${data.cellNumber}`);
      
      // Set executing flag to prevent overlay from reappearing
      this.executingClick = true;
      
      // Hide overlay window as well
      if (this.overlayWindow) {
        this.overlayWindow.hide();
        this.isOverlayVisible = false;
      }
      
      const { exec } = require('child_process');
      
      // Add a longer delay to ensure zoom window is completely closed
      setTimeout(() => {
        console.log(`📋 EXECUTE: Running xdotool mousemove ${data.x} ${data.y}`);
        
        // First move the mouse
        exec(`xdotool mousemove ${data.x} ${data.y}`, { 
          env: { ...process.env, DISPLAY: process.env.DISPLAY || ':1' }
        }, (moveError, stdout, stderr) => {
          if (moveError) {
            console.error(`❌ EXECUTE: Mouse move failed:`, moveError.message);
            console.error(`   Command: xdotool mousemove ${data.x} ${data.y}`);
            console.error(`   Stderr: ${stderr}`);
            return;
          }
          
          console.log(`✅ EXECUTE: Mouse moved to (${data.x}, ${data.y})`);
          
          // Then click after a brief delay
          setTimeout(() => {
            console.log(`📋 EXECUTE: Running xdotool click 1`);
            
            exec(`xdotool click 1`, { 
              env: { ...process.env, DISPLAY: process.env.DISPLAY || ':1' }
            }, (clickError, stdout, stderr) => {
              if (clickError) {
                console.error(`❌ EXECUTE: Click failed:`, clickError.message);
                console.error(`   Command: xdotool click 1`);
                console.error(`   Stderr: ${stderr}`);
              } else {
                console.log(`✅ EXECUTE: Left click completed at (${data.x}, ${data.y})`);
                
                // Verify final position
                setTimeout(() => {
                  exec('xdotool getmouselocation', { 
                    env: { ...process.env, DISPLAY: process.env.DISPLAY || ':1' }
                  }, (err, out) => {
                    if (!err) {
                      console.log(`📍 EXECUTE: Final mouse position: ${out.trim()}`);
                    }
                  });
                }, 200);
              }
            });
          }, 150); // Small delay between move and click
        });
      }, 300); // Wait for zoom window to close completely
    });

    ipcMain.on('test-xdotool', () => {
      console.log('🧪 TESTING: xdotool functionality');
      
      const { exec } = require('child_process');
      
      // Test 1: Get current mouse position
      exec('xdotool getmouselocation', { 
        env: { ...process.env, DISPLAY: process.env.DISPLAY || ':1' }
      }, (err, out, stderr) => {
        if (err) {
          console.error('❌ TEST: getmouselocation failed:', err.message);
          console.error('   Stderr:', stderr);
        } else {
          console.log('✅ TEST: Current mouse position:', out.trim());
          
          // Test 2: Try to move mouse slightly (save current position first)
          const match = out.match(/x:(\d+) y:(\d+)/);
          if (match) {
            const currentX = parseInt(match[1]);
            const currentY = parseInt(match[2]);
            const testX = currentX + 10;
            const testY = currentY + 10;
            
            console.log(`🧪 TEST: Moving mouse to (${testX}, ${testY})`);
            
            exec(`xdotool mousemove ${testX} ${testY}`, { 
              env: { ...process.env, DISPLAY: process.env.DISPLAY || ':1' }
            }, (moveErr, moveOut, moveStderr) => {
              if (moveErr) {
                console.error('❌ TEST: mousemove failed:', moveErr.message);
                console.error('   Stderr:', moveStderr);
              } else {
                console.log('✅ TEST: Mouse move completed');
                
                // Move back to original position
                setTimeout(() => {
                  exec(`xdotool mousemove ${currentX} ${currentY}`, { 
                    env: { ...process.env, DISPLAY: process.env.DISPLAY || ':1' }
                  }, (backErr) => {
                    if (!backErr) {
                      console.log('✅ TEST: Mouse restored to original position');
                    }
                  });
                }, 500);
              }
            });
          }
        }
      });
    });

    // Settings IPC handlers
    ipcMain.on('save-settings', (event, newConfig) => {
      console.log('💾 SETTINGS: Saving new configuration', newConfig);
      this.gridConfig = { ...this.gridConfig, ...newConfig };
      
      // Save to disk
      this.saveSettings();
      
      // Update any open overlay with new config
      if (this.overlayWindow && this.isOverlayVisible) {
        this.overlayWindow.webContents.send('setup-grid', {
          config: this.gridConfig,
          screenshot: this.currentScreenshot,
          screenSize: this.currentDisplay ? this.currentDisplay.bounds : screen.getPrimaryDisplay().bounds
        });
      }
      
      // Respond to settings window
      event.reply('settings-saved', this.gridConfig);
    });

    ipcMain.on('reset-settings', (event) => {
      console.log('🔄 SETTINGS: Resetting to defaults');
      this.gridConfig = { ...this.defaultGridConfig };
      
      // Save to disk
      this.saveSettings();
      
      event.reply('settings-reset', this.gridConfig);
    });
  }

  executeActualClick(data) {
    console.log(`🖱️ EXECUTING: Move and click at (${data.x}, ${data.y}) for cell ${data.cellNumber}`);
    
    const { exec } = require('child_process');
    
    console.log(`📋 EXECUTE: Running xdotool mousemove ${data.x} ${data.y}`);
    
    // First move the mouse
    exec(`xdotool mousemove ${data.x} ${data.y}`, { 
      env: { ...process.env, DISPLAY: process.env.DISPLAY || ':1' }
    }, (moveError, stdout, stderr) => {
      if (moveError) {
        console.error(`❌ EXECUTE: Mouse move failed:`, moveError.message);
        console.error(`   Command: xdotool mousemove ${data.x} ${data.y}`);
        console.error(`   Stderr: ${stderr}`);
        return;
      }
      
      console.log(`✅ EXECUTE: Mouse moved to (${data.x}, ${data.y})`);
      
      // Then click after a brief delay
      setTimeout(() => {
        console.log(`📋 EXECUTE: Running xdotool click 1`);
        
        exec(`xdotool click 1`, { 
          env: { ...process.env, DISPLAY: process.env.DISPLAY || ':1' }
        }, (clickError, stdout, stderr) => {
          if (clickError) {
            console.error(`❌ EXECUTE: Click failed:`, clickError.message);
            console.error(`   Command: xdotool click 1`);
            console.error(`   Stderr: ${stderr}`);
          } else {
            console.log(`✅ EXECUTE: Left click completed at (${data.x}, ${data.y})`);
            
            // Verify final position
            setTimeout(() => {
              exec('xdotool getmouselocation', { 
                env: { ...process.env, DISPLAY: process.env.DISPLAY || ':1' }
              }, (err, out) => {
                if (!err) {
                  console.log(`📍 EXECUTE: Final mouse position: ${out.trim()}`);
                }
              });
            }, 200);
          }
        });
      }, 150); // Small delay between move and click
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

    // Register number keys for grid input when overlay is visible
    for (let i = 0; i <= 9; i++) {
      globalShortcut.register(`${i}`, () => {
        if (this.isOverlayVisible && this.overlayWindow) {
          this.overlayWindow.webContents.send('global-key-press', { key: i.toString() });
        }
      });
    }

    // Register Enter and Backspace for grid navigation
    globalShortcut.register('Return', () => {
      if (this.isOverlayVisible && this.overlayWindow) {
        this.overlayWindow.webContents.send('global-key-press', { key: 'Enter' });
      }
    });

    globalShortcut.register('BackSpace', () => {
      if (this.isOverlayVisible && this.overlayWindow) {
        this.overlayWindow.webContents.send('global-key-press', { key: 'Backspace' });
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
        focusable: true,
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
    // Load settings from disk first
    this.loadSettings();
    
    await this.createOverlayWindow();
    this.setupIpcHandlers();
    this.registerGlobalShortcuts();
    this.createSystemTray();
    
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
    console.log('  System tray: Right-click for menu');
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