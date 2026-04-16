import { contextBridge, ipcRenderer } from 'electron';
import type { OverlayState } from '../data/types';
import { IPC_CHANNELS } from '../shared/ipc';

const debugFlag = process.argv.find((arg) => arg.startsWith('--debugmodel='));
const debugMode = debugFlag === '--debugmodel=true';
const packageJson = require('../../package.json') as { version: string };

contextBridge.exposeInMainWorld('dotapartner', {
  version: packageJson.version,
  debugMode,
  onGSIUpdate(callback: (state: OverlayState) => void) {
    if (typeof callback !== 'function') {
      return () => {};
    }

    const wrappedListener = (_event: Electron.IpcRendererEvent, state: OverlayState) => {
      callback(state);
    };

    ipcRenderer.on(IPC_CHANNELS.gsiUpdate, wrappedListener);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.gsiUpdate, wrappedListener);
    };
  }
});

