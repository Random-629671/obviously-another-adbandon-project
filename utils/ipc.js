const { ipcMain } = require('electron');
const chatbotService = require('../services/serviceHandler.js');
const fileManager = require('../utils/fileMng');
const log = require('../utils/logger');
const config = require('../config.json');
const tts = require('../services/tts');
const stt = require('../services/stt');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const { TEMP_PATH } = require('./pythonConfig');

const waitingTime = config.inactive_wait_time_minute * 60 * 1000;

let isUserSent = false, timeout = null, proactiveTries = 0;

function registerIpcHandlers(mainWindow) {
    proactiveMessageSingal();
    ipcMain.on('send-message', async (event, userMessage) => {
        if (!userMessage || !userMessage.trim()) {
            mainWindow.webContents.send('bot-response', { type: 'bot', message: "I didn't catch that. Could you please repeat?" });
            return;
        }
        log.info(`User: ${userMessage}`);

        mainWindow.webContents.send('bot-response', { type: 'bot', message: '...' });

        chatbotService.sendMessage(userMessage);

        clearTimeout(timeout);
        proactiveTries = 0;
        proactiveMessageSingal();
        isUserSent = true;
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

    ipcMain.handle('synthesize-speech', async (event, segment) => {
        if (!segment || segment.message.trim() == '' || !segment.message) {
            log.warn('Text is empty or undefined.');
            return;
        }

        try {
            const audioPath = await tts.synthesizeSpeech(segment);
            if (!audioPath) return null;

            const audioBuffer = await fs.readFile(audioPath);
            const base64Audio = `data:audio/wav;base64,${audioBuffer.toString('base64')}`;
            
            await fs.remove(audioPath);
            return base64Audio;
        } catch (error) {
            log.alert('Error synthesizing speech:', error);
            return null;
        }
    });

    ipcMain.handle('transcribe-audio', async (event, audioBuffer) => {
        await fs.ensureDir(TEMP_PATH);
        const tempFilePath = path.join(TEMP_PATH, `temp_rec_${Date.now()}.webm`);
        try {
            const buffer = Buffer.from(audioBuffer);
            await fs.writeFile(tempFilePath, buffer);
            log.info('IPC Handler', `Audio buffer saved to temporary file: ${tempFilePath}`);
            
            const transcription = await stt.transcribeAudio(tempFilePath);
            log.info('IPC Handler', `Transcription received: ${transcription}`);
            return transcription;

        } catch (error) {
            log.alert('Error transcribing audio:', error);
            return 'Error transcribing audio.';
        } finally {
            if (await fs.pathExists(tempFilePath)) {
                await fs.remove(tempFilePath);
                log.info('IPC Handler', `Cleaned up temporary audio file: ${tempFilePath}`);
            }
        }
    });
}

function proactiveMessageSingal() {
    if (proactiveTries <= 3) {
        log.info("Setting proactive timeout...");
        proactiveTries++;
        const initMsg = "You loaded on user system but they didn't send any message. Try to start the conversation first.";
        const proactiveMsg = "User had gone for some time. Try to continue the conversation by continue/change topic or random message based on your persona.";
        timeout = setTimeout(() => {
            if (!isUserSent) {
                chatbotService.sendMessage({ message: initMsg }, true);
            } else {
                chatbotService.sendMessage({ message: proactiveMsg }, true);
            }
        }, waitingTime);
    }
}

module.exports = { registerIpcHandlers };