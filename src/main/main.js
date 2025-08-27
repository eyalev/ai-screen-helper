const { app, BrowserWindow, globalShortcut, screen, desktopCapturer, ipcMain } = require('electron');
const path = require('path');

class ScreenGridApp {
  constructor() {
    this.overlayWindow = null;
    this.zoomWindow = null;
    this.isOverlayVisible = false;
    this.currentScreenshot = null;
    this.executingClick = false;
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
    
    // Open dev tools for debugging
    this.overlayWindow.webContents.openDevTools();
    
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

    // Open dev tools for debugging
    this.zoomWindow.webContents.openDevTools();

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
      console.log('📋 SHOW OVERLAY: Back to Grid button pressed');
      if (this.overlayWindow) {
        this.overlayWindow.show();
        this.overlayWindow.focus();
        this.isOverlayVisible = true;
        console.log('📋 SHOW OVERLAY: Overlay shown and focused');
      }
    });

    ipcMain.on('debug-move-mouse', (event, data) => {
      console.log(`🐛 DEBUG: Moving mouse to (${data.x}, ${data.y}) for cell ${data.cellNumber}`);
      
      const { exec } = require('child_process');
      exec(`xdotool mousemove ${data.x} ${data.y}`, { 
        env: { ...process.env, DISPLAY: ':0' }
      }, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ DEBUG: xdotool failed:`, error.message);
          console.error(`   Stderr: ${stderr}`);
        } else {
          console.log(`✅ DEBUG: Mouse moved to (${data.x}, ${data.y})`);
          
          // Optional: Add a visual indicator by briefly clicking or moving back
          setTimeout(() => {
            exec('xdotool getmouselocation', { 
              env: { ...process.env, DISPLAY: ':0' }
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
          env: { ...process.env, DISPLAY: ':0' }
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
              env: { ...process.env, DISPLAY: ':0' }
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
                    env: { ...process.env, DISPLAY: ':0' }
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
        env: { ...process.env, DISPLAY: ':0' }
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
              env: { ...process.env, DISPLAY: ':0' }
            }, (moveErr, moveOut, moveStderr) => {
              if (moveErr) {
                console.error('❌ TEST: mousemove failed:', moveErr.message);
                console.error('   Stderr:', moveStderr);
              } else {
                console.log('✅ TEST: Mouse move completed');
                
                // Move back to original position
                setTimeout(() => {
                  exec(`xdotool mousemove ${currentX} ${currentY}`, { 
                    env: { ...process.env, DISPLAY: ':0' }
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
  }

  executeActualClick(data) {
    console.log(`🖱️ EXECUTING: Move and click at (${data.x}, ${data.y}) for cell ${data.cellNumber}`);
    
    const { exec } = require('child_process');
    
    console.log(`📋 EXECUTE: Running xdotool mousemove ${data.x} ${data.y}`);
    
    // First move the mouse
    exec(`xdotool mousemove ${data.x} ${data.y}`, { 
      env: { ...process.env, DISPLAY: ':0' }
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
          env: { ...process.env, DISPLAY: ':0' }
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
                env: { ...process.env, DISPLAY: ':0' }
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