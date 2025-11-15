const fileManager = require('../utils/fileMng.js');
const log = require('../utils/logger.js');
const functionList = require('../externalFunction/functionEntry.js');

let state = {};

async function loadInitState() {
    log.info("Loading initial state...");
    state.persona = await fileManager.readPersona();
    state.historyLite = await fileManager.readHistoryLite();
    state.interestData = await fileManager.readInterestData();
    state.notebook = await fileManager.readNotebook();
    state.example = await fileManager.readExample();
    state.config = await fileManager.readConfig();
    state.functionList = functionList;
    log.info("Initial state loaded.");

    if (!state.persona) {
        log.alert("Persona configuration missing!", "Exiting application due to critical configuration error.");
        process.exit(1);
    }
}

async function reloadState(key) {
    log.info(`Reloading state '${key}'...`);
    switch (key) {
        case 'persona':
            state.persona = await fileManager.readPersona();
            break;
        case 'historyLite':
            state.historyLite = await fileManager.readHistoryLite();
            break;
        case 'interestData':
            state.interestData = await fileManager.readInterestData();
            break;
        case 'notebook':
            state.notebook = await fileManager.readNotebook();
            break;
        case 'example':
            state.example = await fileManager.readExample();
            break;
        case 'config':
            state.config = await fileManager.readConfig();
            break;
        case 'functionList':
            state.functionList = functionList;
            break;
        default:
            log.warn(`Unknown state key: ${key}`);
            return;
    }
    log.info(`State '${key}' reloaded.`);
}

module.exports = {
    loadInitState,
    reloadState,
    getState: () => state
};