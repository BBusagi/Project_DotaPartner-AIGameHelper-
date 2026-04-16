const path = require('path');
const { execFile } = require('child_process');
const { app, BrowserWindow, dialog, globalShortcut, screen } = require('electron');
const { startGSIServer } = require('../data/gsi-server');

let overlayWindow = null;
let gsiServer = null;
let isShuttingDown = false;
let dotaMonitorTimer = null;
let latestGSIState = {
  connected: false,
  lastUpdated: null,
  system: {
    dotaRunning: false,
    gsiListening: false,
    hasData: false,
    gsiPort: 3001
  },
  summary: {
    gameState: 'waiting',
    gameTime: null,
    heroName: 'unknown',
    playerName: 'unknown'
  }
};

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
}

function createOverlayWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  overlayWindow = new BrowserWindow({
    width: 360,
    height: 220,
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
  overlayWindow.webContents.on('did-finish-load', () => {
    broadcastGSIState();
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    app.quit();
  });
}

function updateSystemState(patch) {
  latestGSIState = {
    ...latestGSIState,
    system: {
      ...latestGSIState.system,
      ...patch
    }
  };

  broadcastGSIState();
}

function broadcastGSIState() {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return;
  }

  overlayWindow.webContents.send('gsi:update', latestGSIState);
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

function detectDotaRunning() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve(false);
      return;
    }

    execFile(
      'tasklist',
      ['/FI', 'IMAGENAME eq dota2.exe', '/FO', 'CSV', '/NH'],
      { windowsHide: true },
      (error, stdout) => {
        if (error) {
          resolve(false);
          return;
        }

        resolve(stdout.toLowerCase().includes('dota2.exe'));
      }
    );
  });
}

function startDotaMonitor() {
  const refresh = async () => {
    if (isShuttingDown) {
      return;
    }

    const dotaRunning = await detectDotaRunning();
    if (dotaRunning !== latestGSIState.system.dotaRunning) {
      updateSystemState({ dotaRunning });
    }
  };

  refresh();
  dotaMonitorTimer = setInterval(refresh, 3000);
}

function stopDotaMonitor() {
  if (!dotaMonitorTimer) {
    return;
  }

  clearInterval(dotaMonitorTimer);
  dotaMonitorTimer = null;
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

  stopDotaMonitor();
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
  gsiServer = startGSIServer({
    onListening: ({ port }) => {
      updateSystemState({
        gsiListening: true,
        gsiPort: port
      });
    },
    onError: (error) => {
      if (error.code === 'EADDRINUSE') {
        updateSystemState({ gsiListening: false });
      }
    },
    onPayload: (_payload, summary) => {
      latestGSIState = {
        connected: true,
        lastUpdated: new Date().toISOString(),
        system: {
          ...latestGSIState.system,
          hasData: true
        },
        summary
      };

      broadcastGSIState();
    }
  });
  registerShortcuts();
  startDotaMonitor();

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
