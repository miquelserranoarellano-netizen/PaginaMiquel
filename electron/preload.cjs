/**
 * Puente seguro entre la interfaz y el sistema (contextIsolation + sandbox).
 * Expone únicamente las operaciones necesarias como window.homeDesign.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('homeDesign', {
  isDesktop: true,
  platform: process.platform,
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    read: (id) => ipcRenderer.invoke('projects:read', id),
    write: (id, docJson, metaJson) => ipcRenderer.invoke('projects:write', id, docJson, metaJson),
    remove: (id) => ipcRenderer.invoke('projects:remove', id),
    folder: () => ipcRenderer.invoke('projects:folder'),
  },
  files: {
    save: (options) => ipcRenderer.invoke('files:save', options),
    open: (options) => ipcRenderer.invoke('files:open', options),
  },
  /** Fichero .hdsp abierto desde el sistema (doble clic / arrastrar al icono). */
  takePendingFile: () => ipcRenderer.invoke('app:pending-file'),
  onFileAvailable: (handler) => ipcRenderer.on('app:file-available', () => handler()),
  onBeforeClose: (handler) => {
    ipcRenderer.on('app:before-close', async () => {
      try {
        await handler();
      } finally {
        ipcRenderer.send('app:close-ready');
      }
    });
  },
});
