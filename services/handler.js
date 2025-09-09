const fileManager = require('../utils/fileMng.js');
const log = require('../utils/logger.js');
const { nanoid } = require('nanoid');
const promptGen = require('../data/prompt/promptGen.js');

const provider = "gemini";
let api = null;
const functionList = require('../externalFunction/functionEntry.js');
const functionHandler = require('../externalFunction/functionHandler.js');
const context = require('../data/prompt/contextLoader.js');

//heh
let chatHistory = [];
let sessionId = nanoid(16);
let ins = null, initHistory = null, uiCallback = null, lastMessageTime = null;

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

function sendMessage(message, isSystem = false) {
    const d = new Date();
    const time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();

    let role = isSystem ? "system" : "user";
    let parts = null;
    const diff = (d - new Date(lastMessageTime)) / 1000; //should be second
    
    console.log(message);
    if (!isSystem) {
        parts = {
            message: message,
            metadata: {
                timestamp: time,
                timefromlastprompt: diff
            }
        };
    } else {
        parts = {
            message: message.message,
            datatype: message.datatype,
            method: message.method,
            inline: message.inline ? message.inline : null,
            result: message.result,
            metadata: {
                timestamp: time,
                timefromlastprompt: diff
            }
        }
    }
    
    try {
        processMessage(role, parts);
    } catch (error) {
        log.alert("Error processing message", error);
    }

    lastMessageTime = time;
}

async function setProvider() {
    switch (provider) {
        case "gemini":
            api = require("./apis/gemini.js");
            break;
        // Add more cases for other providers as needed
        default:
            log.alert("No provider found");
            break;
    }
}

async function initializeService() { //todo: fix init message
    const persona = await fileManager.readPersona();
    const historyLite = await fileManager.readHistoryLite();
    const interestData = await fileManager.readInterestData();
    const config = await fileManager.readConfig();
    const notebook = await fileManager.readNotebook();
    const example = await fileManager.readExample();

    if (!persona) {
        log.alert("Persona configuration missing!", "Exiting application due to critical configuration error.");
        process.exit(1);
    }

    fileManager.setCurrentSessionHistoryPath(sessionId);
    await setProvider();

    ins = promptGen.getSystemInstruction(persona, historyLite, interestData, notebook, functionList, example);
    //console.log(ins);

    await api.init(ins, functionList, config.apis.ext);

    functionHandler.sendMessageCallback(sendMessage);

    //for init message: add in sesson prompt as system role to tell model to do init, same as proactive
    //need to test precision (is this word correct?)

    log.info("Initing done, me go home");
}

async function processMessage(role, parts) {
    try {
        console.log(parts);
        const message = parts.message;
        chatHistory.push({ role: role, parts: [{ text: message }] });

        let prompt = [], inlineData = null, text = null;

        if (role == "system") {
            const textprompt =
`System: ${message}
Metadata: {
    ${parts.metadata.timestamp},
    ${parts.metadata.timefromlastprompt} seconds
}`;

            text = { text: textprompt };
            if (parts.method == "inline") {
                if (parts.datatype == "image") {
                    for (const img of parts.inline) {
                        inlineData = {
                            mimeType: "image/jpeg",
                            data: img
                        };
                        prompt.push({ inlineData: inlineData });
                    }
                } //else other file type leave first
            } else if (parts.method == "files") {
                //something
            } else if (parts.method == "prompt") {
                const l = parts.message + ". Returned result: " + parts.result;
                text = { text: l }; //overwrite text
            }
            
            prompt.push(text);
        } else if (role == "user") {
            const textprompt =
`User: ${message}
Metadata: {
    ${parts.metadata.timestamp},
    ${parts.metadata.timefromlastprompt} seconds
}`;

            text = { text: textprompt };
            prompt.push(text);
        }

        //console.log(prompt);

        const result = await api.sendMessage(prompt);
        const segments = result.segments;
        const response = segments.map(seg => seg.message).join('\n');
        //log.info(`Bot in handler.js: ${response}`);

        if (result.functionCalls) {
            for (const func of result.functionCalls) {
                functionHandler.exec(func.name, func.args);
            }
        }

        chatHistory.push({ role: "model", parts: [{ text: response }] });

        await fileManager.appendMessageToHistory({
            role: role,
            text: message,
            timestamp: new Date().toISOString(),
            sessionId: sessionId
        });
        fileManager.appendMessageToHistory({
            role: "model",
            text: response,
            timestamp: new Date().toISOString(),
            sessionId: sessionId
        });

        sendChatMessageToUI(segments);
    } catch (error) {
        log.alert("Error sending message through API", error);
        const errorResponse = "I'm sorry, I'm having trouble connecting right now. Could you please try again?";
        sendChatMessageToUI([{ message: errorResponse }]);
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
            const dailyResult = await api.dailySummary(dailyPrompt);

            const dailyAnalysis = JSON.parse(dailyResult);

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
        const overallResult = await api.overallSummary(overallSummarizePrompt);

        const overallAnalysis = JSON.parse(overallResult);
        
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

async function retrieveRelevantHistory(query) {
    const fullHistory = await fileManager.readFullHistory();
    const relevantChunks = [];
    const keywords = query.toLowerCase().split(' ').filter(word => word.length > 2);

    for (const msg of fullHistory) {
    const textLower = msg.text.toLowerCase();
    if (keywords.some(kw => textLower.includes(kw))) {
        relevantChunks.push(msg);
        if (relevantChunks.length >= 5) break;
    }
    }

    if (relevantChunks.length > 0) {
    return "Here's something from our past conversations that might be relevant:\n" +
            relevantChunks.map(m => `${m.role}: ${m.text}`).join('\n');
    }
    return "";
}

module.exports = {
    initializeService,
    sendMessage,
    summarizeAndAnalyze,
    retrieveRelevantHistory,
    registerUICallback
};