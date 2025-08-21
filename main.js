const { app, BrowserWindow } = require('electron');
const path = require('path');
const chatbotService = require('./services/handler.js');
const log = require('./utils/logger.js');
const { registerIpcHandlers } = require('./utils/ipc');

let mainWindow;

//process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'key.json');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('./ui/index.html');
    
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
    if (mainWindow) {
        mainWindow.webContents.send('add-chat-message', { sender, message });
    } else {
        console.log("Could not send chat message to UI: mainWindow is not available.");
    }
}

async function startApp() {
    await chatbotService.initializeService();
    log.info("Bot is awake and ready in the UI!");
}

app.on('ready', () => {
    const window = createWindow();
    log.initLogger(sendLogToUI);
    registerIpcHandlers(window);
    startApp();
});

app.on('window-all-closed', async () => {
    log.warn("All windows closed. Shutting down.");
    await chatbotService.summarizeAndAnalyze();
    if (process.platform !== 'darwin') {
        app.quit();
    }
    log.warn("Real quitting...");
    process.exit(1);
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

module.exports = { sendLogToUI, sendChatMessageToUI };