import type { BrowserWindow } from 'electron';
import type { OverlayState } from '../data/types';
import { IPC_CHANNELS } from '../shared/ipc';

export function broadcastGSIState(
  overlayWindow: BrowserWindow | null,
  state: OverlayState
): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    return;
  }

  overlayWindow.webContents.send(IPC_CHANNELS.gsiUpdate, state);
}

