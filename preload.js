const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    sendMessage: (message) => ipcRenderer.send('send-message', message),

    getHistory: () => ipcRenderer.invoke('get-history'),
    getLogContent: () => ipcRenderer.invoke('get-log-content'),

    getConfigFiles: () => ipcRenderer.invoke('get-config-files'),
    getConfigFile: (filename) => ipcRenderer.invoke('get-config-file', filename),
    saveConfigFile: (payload) => ipcRenderer.invoke('save-config-file', payload),

    onBotResponse: (callback) => ipcRenderer.on('bot-response', (_event, value) => callback(value)),
    onLogUpdate: (callback) => ipcRenderer.on('log-update', (_event, value) => callback(value)),

    onAddChatMessage: (callback) => ipcRenderer.on('add-chat-message', (_event, value) => callback(value)),
});