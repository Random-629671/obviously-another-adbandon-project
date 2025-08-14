const { ipcMain } = require('electron');
const chatbotService = require('../services/geminiService');
const fileManager = require('../utils/fileMng');
const log = require('../utils/logger');

function registerIpcHandlers(mainWindow) {
    ipcMain.on('send-message', async (event, userMessage) => {
        if (!userMessage || !userMessage.trim()) {
            mainWindow.webContents.send('bot-response', { type: 'bot', message: "I didn't catch that. Could you please repeat?" });
            return;
        }
        log.info(`User: ${userMessage}`);

        mainWindow.webContents.send('bot-response', { type: 'bot', message: '...' });

        const botResponse = await chatbotService.sendMessage(userMessage);
        log.info(`Bot: ${botResponse}`);

        mainWindow.webContents.send('bot-response', { type: 'bot', message: botResponse, thinking: false });
    });

    ipcMain.handle('get-history', () => fileManager.readFullFullHistory());
    ipcMain.handle('get-config-files', () => fileManager.getConfigFiles());
    ipcMain.handle('get-config-file', (event, filename) => fileManager.readConfigFile(filename));
    ipcMain.handle('save-config-file', (event, { filename, data }) => fileManager.writeConfigFile(filename, data));

    ipcMain.handle('get-log-content', async () => {
        const logFilePath = log.getLogFilePath();
        try {
            return await fileManager.readFile(logFilePath, 'utf8');
        } catch (err) {
            log.alert("Could not load log file.", err);
            return "Could not load log file.";
        }
    });
}

module.exports = { registerIpcHandlers };