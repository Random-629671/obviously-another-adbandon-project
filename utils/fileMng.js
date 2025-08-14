const fs = require('fs-extra');
const path = require('path');
const log = require(path.join(__dirname, 'logger.js'));

const DATA_PATH = path.join(__dirname, '../data');
const HISTORY_SESSION_PATH = path.join(DATA_PATH, 'history');
const HISTORY_LITE_PATH = path.join(DATA_PATH, 'history_lite.json');
const INTEREST_PATH = path.join(DATA_PATH, 'interest.json');
const PERSONA_PATH = path.join(DATA_PATH, 'persona.json');

let currentSessionHistoryPath;

async function readFile(filePath, encoding = 'utf8') {
    try {
        if (await fs.pathExists(filePath)) {
            return await fs.readFile(filePath, encoding);
        } else {
            const message = `File not found: ${filePath}`;
            log.warn(message);
            return message;
        }
    } catch (error) {
        log.alert(`Error reading file at ${filePath}`, error);
        return `Error reading file: ${error.message}`;
    }
}

function formatDate() {
    const date = new Date();
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

async function getConfigFiles() {
    try {
        const files = await fs.readdir(DATA_PATH);
        return files.filter(file => file.endsWith('.json') && ['persona.json', 'interest.json'].includes(file));
    } catch (error) {
        log.alert('Error reading config directory', error);
        return [];
    }
}

async function readConfigFile(filename) {
    try {
        const filePath = path.join(DATA_PATH, filename);
        return await fs.readJson(filePath);
    } catch (error) {
        log.alert(`Error reading config file: ${filename}`, error);
        return null;
    }
}

async function writeConfigFile(filename, data) {
    try {
        const filePath = path.join(DATA_PATH, filename);
        await fs.writeJson(filePath, data, { spaces: 2 });
        log.info(`Configuration file saved: ${filename}`);
        return { success: true };
    } catch (error) {
        log.alert(`Error writing config file: ${filename}`, error);
        return { success: false, error: error.message };
    }
}

function setCurrentSessionHistoryPath(sessionId) {
    const today = formatDate();
    currentSessionHistoryPath = path.join(HISTORY_SESSION_PATH, `history_${today}_${sessionId}.jsonl`);
    log.info(`Current session history path set to: ${currentSessionHistoryPath}`);
}

async function appendMessageToHistory(message) {
    if (!currentSessionHistoryPath) {
        log.alert('Current session history path not set. Call setCurrentSessionHistoryPath first.');
        return;
    }
    try {
        await fs.appendFile(currentSessionHistoryPath, JSON.stringify(message) + '\n');
    } catch (error) {
        log.alert('Error appending message to history for current session:', error);
    }
}

async function readFullHistory(today) {
    try {
        const historyFiles = (await fs.readdir(HISTORY_SESSION_PATH))
            .filter(file => file.startsWith(`history_${today}_`) && file.endsWith('.jsonl'))
            .map(file => path.join(HISTORY_SESSION_PATH, file));

        let fullHistory = [];
        for (const filePath of historyFiles) {
            if (await fs.pathExists(filePath)) {
                const data = await fs.readFile(filePath, 'utf8');
                fullHistory = fullHistory.concat(data.split('\n').filter(Boolean).map(line => JSON.parse(line)));
            }
        }
        fullHistory.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return fullHistory;
    } catch (error) {
        log.alert('Error reading full history from all session files:', error);
        return [];
    }
}

async function readFullFullHistory() {
    try {
        if (!await fs.pathExists(HISTORY_SESSION_PATH)) {
            return [];
        }
        const historyFiles = (await fs.readdir(HISTORY_SESSION_PATH))
            .filter(file => file.endsWith('.jsonl'))
            .map(file => path.join(HISTORY_SESSION_PATH, file));

        let fullHistory = [];
        for (const filePath of historyFiles) {
            const data = await fs.readFile(filePath, 'utf8');
            fullHistory = fullHistory.concat(data.split('\n').filter(Boolean).map(line => JSON.parse(line)));
        }
        fullHistory.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return fullHistory;
    } catch (error) {
        log.alert('Error reading full history from all session files:', error);
        return [];
    }
}

async function writeHistoryLite(data) {
    try {
        await fs.writeJson(HISTORY_LITE_PATH, data, { spaces: 2 });
    } catch (error) {
        console.error('Error writing history lite', error);
    }
}

async function readHistoryLite() {
    try {
        if (!await fs.pathExists(HISTORY_LITE_PATH)) {
            log.warn("Cannot find history_lite.json");
            return {
                overallSummary: "No past conversations yet.",
                overallLastUpdated: new Date(0).toISOString(),
                dailySummaries: []
            };
        }
        log.info("Reading history lite...");
        return await fs.readJson(HISTORY_LITE_PATH);
    } catch (error) {
        log.alert('Error reading history lite', error);
        return {
            overallSummary: "No past conversations yet.",
            overallLastUpdated: new Date(0).toISOString(),
            dailySummaries: []
        };
    }
}

async function writeInterestData(data) {
    try {
        await fs.writeJson(INTEREST_PATH, data, { spaces: 2 });
    } catch (error) {
        log.alert('Error writing interest data', error);
    }
}

async function readInterestData() {
    try {
        if (!await fs.pathExists(INTEREST_PATH)) {
            return {
                overallInterests: [],
                overallSentiment: { overall_tone: "neutral", recent_reaction: "neutral" },
                overallLastUpdated: new Date(0).toISOString(),
                dailyInterests: []
            };
        }
        log.info("Reading interest...");
        return await fs.readJson(INTEREST_PATH);
    } catch (error) {
        log.alert('Error reading interest data', error);
        return {
            overallInterests: [],
            overallSentiment: { overall_tone: "neutral", recent_reaction: "neutral" },
            overallLastUpdated: new Date(0).toISOString(),
            dailyInterests: []
        };
    }
}

async function readPersona() {
    try {
        log.info("Reading persona...");
        return await fs.readJson(PERSONA_PATH);
    } catch (error) {
        log.alert('Error reading persona', error);
        return null;
    }
}

module.exports = {
    appendMessageToHistory,
    readFullHistory,
    readFullFullHistory,
    writeHistoryLite,
    readHistoryLite,
    writeInterestData,
    readInterestData,
    readPersona,
    setCurrentSessionHistoryPath,
    readFile,
    formatDate,
    getConfigFiles,
    readConfigFile,
    writeConfigFile
};