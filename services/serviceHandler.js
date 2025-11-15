const stateManager = require('./stateManager.js');
const Session = require('./session.js');
const promptGen = require('../data/prompt/promptGen.js');
const log = require('../utils/logger.js');
const functionHandler = require('../externalFunction/functionHandler.js');
const fileManager = require('../utils/fileMng.js');

let currentSession = null;
let uiCallback = null;
let api = null;

function registerUICallback(callback) {
    uiCallback = callback;
}

function sendChatMessageToUI(segments) {
    if (uiCallback) {
        uiCallback('bot', segments);
    } else {
        log.warn("No UI callback registered.");
    }
}

async function initializeService() {
    await stateManager.loadInitState();
    const state = stateManager.getState();

    const ins = promptGen.getSystemInstruction(
        state.persona,
        state.historyLite,
        state.interestData,
        state.notebook,
        state.functionList,
        state.example
    );

    const provider = state.config.provider;
    switch (provider) {
        case "gemini":
            api = require("./apis/gemini.js");
            break;
        // Add more cases for other providers as needed
        default:
            log.alert("No provider found");
            break;
    }

    await api.init(ins, state.functionList, state.config.apis.ext);

    functionHandler.sendMessageCallback(sendMessage);

    log.info("Initing done, me go home");
}

async function sendMessage(message, isSystem = false) {
    if (!currentSession) currentSession = new Session();

    const role = isSystem ? "system" : "user";
    let fullMessage = "";

    const prompt = [];
    if (isSystem) {
        fullMessage = message.message;
        if (message.method == "inline" && message.datatype == "image") {
            for (const img of message.inline) {
                prompt.push({ inlineData: { mimeType: "image/jpeg", data: img } });
            }
        } else if (message.method == "prompt") {
            const fullText = `${message.message}. Returned result: ${message.result}`;
            prompt.push({ text: fullText });
        } else {
            prompt.push({ text: message.message });
        }
    } else {
        fullMessage = message;
        prompt.push({ text: message });
        currentSession.addMessage(role, message);
    }

    try {
        const result = await api.sendMessage(prompt);
        if (result && result.segments) {
            const responseText = result.segments.map(seg => seg.message).join('\n');
            currentSession.addMessage('model', responseText);
            sendChatMessageToUI(result.segments);

            if (result.functionCalls) {
                for (const func of result.functionCalls) {
                    functionHandler.exec(func.name, func.args);
                }
            }
        }
    } catch (error) {
        log.alert("Error sending message through API", error);
        const errorResponse = {
            overallTone: "frustrated",
            segments: [{ tone: "serious", message: "Xin lỗi, tôi đang gặp sự cố khi kết nối. Vui lòng thử lại." }],
            functionCalls: null
        };
        sendChatMessageToUI(errorResponse.segments);
    }
}

async function summarizeAndAnalyze() {
    log.info("Running incremental summarization and analysis...");

    const today = fileManager.formatDate();
    let historyLite = await fileManager.readHistoryLite();
    let interestData = await fileManager.readInterestData();
    const allHistory = await fileManager.readFullHistory(today);
    let dailySegmentsToSummarize = {};
    let overallHasNewSegments = false;
    const lastUpdatedForThisDaySummary = historyLite.dailySummaries.find(summary => summary.date == today)?.lastUpdated || new Date(0).toISOString();
    const lastUpdatedForThisDayInterest = interestData.dailyInterests.find(interest => interest.date == today)?.lastUpdated || new Date(0).toISOString();

    let historyLiteIndex, interestIndex, messageDate;
    let historyEntry = {
        "date": `${today}`,
        "summary": "",
        "overloop": [],
        "lastUpdated": ""
    };

    let interestEntry = {
        "date": `${today}`,
        "interests": [],
        "sentiment": {
            "tone": "",
            "reaction": ""
        },
        "improvementRoom": [],
        "lastUpdated": ""
    };

    //get message
    for (const msg of allHistory) {
        if (allHistory.length == 0) {
            messageDate = today;
            return;
        }
        messageDate = fileManager.formatDate(msg.timestamp);

        historyEntry = {
            "date": `${messageDate}`,
            "summary": "",
            "overloop": [],
            "lastUpdated": ""
        };

        interestEntry = {
            "date": `${messageDate}`,
            "interests": [],
            "sentiment": {
                "tone": "",
                "reaction": ""
            },
            "improvementRoom": [],
            "lastUpdated": ""
        };

        if (new Date(msg.timestamp).getTime() > new Date(lastUpdatedForThisDaySummary).getTime() ||
            new Date(msg.timestamp).getTime() > new Date(lastUpdatedForThisDayInterest).getTime()) {
            if (!dailySegmentsToSummarize[messageDate]) {
                dailySegmentsToSummarize[messageDate] = [];
            }
            dailySegmentsToSummarize[messageDate].push(msg);
            overallHasNewSegments = true;
        }
    }

    if (historyLite.dailySummaries.findIndex(summary => summary.date == today) == -1) await historyLite.dailySummaries.push(historyEntry);
    if (interestData.dailyInterests.findIndex(interest => interest.date == today) == -1) await interestData.dailyInterests.push(interestEntry);
    historyLiteIndex = historyLite.dailySummaries.findIndex(summary => summary.date == today);
    interestIndex = interestData.dailyInterests.findIndex(interest => interest.date == today);

    log.info(`Total raw history messages today: ${allHistory.length}`);
    log.info(`Number of daily segments identified for new summarization: ${Object.keys(dailySegmentsToSummarize).length}`);
    log.info(`Overall new segments detected: ${overallHasNewSegments}`);

    //if no new message
    if (!overallHasNewSegments) {
        if (historyLite.overallSummary !== "No past conversations yet.") {
            log.info("No new history segments to process for daily summaries. Updating overall lastUpdated timestamp only.");
            historyLite.overallLastUpdated = new Date().toISOString();
            interestData.overallLastUpdated = new Date().toISOString();
            await fileManager.writeHistoryLite(historyLite);
            await fileManager.writeInterestData(interestData);
        } else {
            log.warn("No history to summarize at all, and no existing summary.");
        }
        return;
    }

    //daily summary
    for (const date of Object.keys(dailySegmentsToSummarize).sort()) {
        const messagesForThisDay = dailySegmentsToSummarize[date];
        const currentDayText = messagesForThisDay.map(m => `${m.role}: ${m.text}`).join('\n');

        const dailyPrompt = promptGen.getDailySummarizeAnalyzePrompt(
            historyLite,
            currentDayText
        );

        try {
            const dailyAnalysis = await api.dailySummary(dailyPrompt);

            historyLite.dailySummaries[historyLiteIndex].summary = dailyAnalysis.summary;
            historyLite.dailySummaries[historyLiteIndex].lastUpdated = new Date().toISOString();
            historyLite.dailySummaries[historyLiteIndex].openloop = dailyAnalysis.openloop;

            interestData.dailyInterests[interestIndex].interests = dailyAnalysis.interests;
            interestData.dailyInterests[interestIndex].sentiment = dailyAnalysis.sentiment;
            interestData.dailyInterests[interestIndex].improvementRoom = dailyAnalysis.improvementRoom;
            interestData.dailyInterests[interestIndex].lastUpdated = new Date().toISOString();
            
            log.info(`Daily summary for ${date} updated.`);
        } catch (error) {
            log.alert(`Error summarizing daily history for ${date}`, error);
        }
    }

    //overall summary
    log.info("Consolidating overall summary and interests...");
    const overallSummarizePrompt = promptGen.getOverallSummarizePrompt(
        historyLite,
        interestData
    );

    try {
        const overallAnalysis = await api.overallSummary(overallSummarizePrompt);
        
        // Update overall fields in historyLite and interestData
        historyLite.overallSummary = overallAnalysis.overallSummary;
        historyLite.overallOpenloop = overallAnalysis.overallOpenloop;
        historyLite.overallLastUpdated = new Date().toISOString(); // Mark when overall summary was updated

        interestData.overallInterests = overallAnalysis.overallInterests;
        interestData.overallSentiment = overallAnalysis.overallSentiment;
        interestData.overallImprovementRoom = overallAnalysis.improvementRoom;
        interestData.overallLastUpdated = new Date().toISOString(); // Mark when overall interests were updated

        log.info("Overall summary and interests consolidated.");
    } catch (error) {
        log.alert("Error consolidating overall summary and interests", error);
    }

    await fileManager.writeHistoryLite(historyLite);
    await fileManager.writeInterestData(interestData);
    log.info("Incremental summarization and analysis complete. Files saved.");
}

module.exports = {
    initializeService,
    sendMessage,
    summarizeAndAnalyze,
    registerUICallback
};