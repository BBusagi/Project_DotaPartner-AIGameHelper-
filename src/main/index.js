const path = require('path');
const { app, BrowserWindow, globalShortcut, screen } = require('electron');

let overlayWindow = null;

function createOverlayWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  overlayWindow = new BrowserWindow({
    width: 360,
    height: 120,
    x: Math.max(width - 380, 0),
    y: 24,
    frame: false,
    transparent: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#101418',
    title: 'DotaPartner Overlay',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.loadFile(path.join(__dirname, '..', 'ui', 'overlay.html'));

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    app.quit();
  });
}

app.whenReady().then(() => {
  createOverlayWindow();
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOverlayWindow();
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
