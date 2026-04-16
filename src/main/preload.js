const { contextBridge, ipcRenderer } = require('electron');

const debugFlag = process.argv.find((arg) => arg.startsWith('--overlay-debug='));
const debugMode = debugFlag === '--overlay-debug=true';

contextBridge.exposeInMainWorld('dotapartner', {
  version: '0.1.0',
  debugMode,
  onGSIUpdate(callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }

    const wrappedListener = (_event, state) => {
      callback(state);
    };

    ipcRenderer.on('gsi:update', wrappedListener);

    return () => {
      ipcRenderer.removeListener('gsi:update', wrappedListener);
    };
  }
});
