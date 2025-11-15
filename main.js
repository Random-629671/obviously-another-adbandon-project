const { app, BrowserWindow } = require('electron');
const path = require('path');

let chatbotService;
let log;
let registerIpcHandlers;

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true
        }
    });

    mainWindow.loadFile(path.join(__dirname, './ui/index.html'));
    
    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    return mainWindow;
}

function sendLogToUI(logMessage) {
    if (mainWindow) {
        mainWindow.webContents.send('log-update', logMessage);
    }
}

function sendChatMessageToUI(sender, message) {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('bot-response', { type: sender, message: message });

        if (sender == 'bot' && message && Array.isArray(message)) {
            const fullMsg = message.map(seg => seg.message).join(' ');
            if (fullMsg.trim() != '' && fullMsg.trim() != '...') {
                mainWindow.webContents.send('play-bot-speech', fullMsg);
            }
        }
    } else {
        console.log("Could not send chat message to UI: mainWindow is not available.");
    }
}

app.whenReady().then(async () => {
    chatbotService = require('./services/serviceHandler.js');
    log = require('./utils/logger.js');
    registerIpcHandlers = require('./utils/ipc').registerIpcHandlers;

    try {
        await chatbotService.initializeService();
        log.info("Bot is awake and ready in the UI!");
    } catch (error) {
        log.alert("CRITICAL: Failed to initialize chatbot service.", error);
        app.quit();
        return;
    }

    const window = createWindow();

    log.initLogger(sendLogToUI);
    chatbotService.registerUICallback(sendChatMessageToUI);
    registerIpcHandlers(window);

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', async () => {
    if (chatbotService) {
        log.warn("All windows closed. Shutting down.");
        await chatbotService.summarizeAndAnalyze();
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

process.on('uncaughtException', (error) => {
    console.error('UNCAUGHT EXCEPTION:', error);
    process.exit(1);
});