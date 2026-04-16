const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('dotapartner', {
  version: '0.1.0'
});
