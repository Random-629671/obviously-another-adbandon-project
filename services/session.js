const { nanoid } = require('nanoid');
const log = require('../utils/logger.js');
const fileManager = require('../utils/fileMng.js');

class Session {
    constructor() {
        this.sessionId = nanoid(16);
        this.lastMessageTime = new Date();
        
        fileManager.setCurrentSessionHistoryPath(this.sessionId);
        log.info(`Session ${this.sessionId} started.`);
    }

    addMessage(role, message) {
        fileManager.appendMessageToHistory({
            role: role,
            text: message,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId
        });
    }

    getSessionId() {
        return this.sessionId;
    }

    async endSession() {
        log.info(`Session ${this.sessionId} ended.`);
        // Perform any cleanup or final saves if necessary
    }
}

module.exports = Session;