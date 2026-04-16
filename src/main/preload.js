const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dotapartner', {
  version: '0.1.0',
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
