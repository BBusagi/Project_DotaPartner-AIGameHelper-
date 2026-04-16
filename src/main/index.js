const path = require('path');
const { app, BrowserWindow, dialog, globalShortcut, screen } = require('electron');
const { startGSIServer } = require('../data/gsi-server');

let overlayWindow = null;
let gsiServer = null;
let isShuttingDown = false;

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
}

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

function focusOverlayWindow() {
  if (!overlayWindow) {
    return;
  }

  if (overlayWindow.isMinimized()) {
    overlayWindow.restore();
  }

  overlayWindow.show();
  overlayWindow.focus();
}

function closeGSIServer() {
  return new Promise((resolve) => {
    if (!gsiServer) {
      resolve();
      return;
    }

    const serverToClose = gsiServer;
    gsiServer = null;

    serverToClose.close(() => {
      const port = serverToClose.__gsiPort || 'unknown';
      console.log(`[GSI] Server on port ${port} closed`);
      resolve();
    });
  });
}

async function gracefulShutdown(reason) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`[App] Shutting down: ${reason}`);

  await closeGSIServer();
  globalShortcut.unregisterAll();
}

if (hasSingleInstanceLock) {
  app.on('second-instance', () => {
    focusOverlayWindow();
  });
}

app.whenReady().then(() => {
  createOverlayWindow();
  gsiServer = startGSIServer();
  registerShortcuts();

  if (gsiServer) {
    gsiServer.on('error', (error) => {
      if (error.code !== 'EADDRINUSE') {
        return;
      }

      dialog.showErrorBox(
        'GSI Port In Use',
        '127.0.0.1:3001 is already in use.\n\n' +
        'Close the old DotaPartner process or the other local service using this port, then start the app again.'
      );
    });
  }

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

app.on('before-quit', async (event) => {
  event.preventDefault();
  await gracefulShutdown('before-quit');
  app.exit(0);
});

app.on('will-quit', async () => {
  await gracefulShutdown('will-quit');
});

process.on('SIGINT', async () => {
  await gracefulShutdown('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await gracefulShutdown('SIGTERM');
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('[App] Uncaught exception:', error);
  await gracefulShutdown('uncaughtException');
  process.exit(1);
});
