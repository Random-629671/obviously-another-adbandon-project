const log = require('../../utils/logger.js');
const { GoogleGenAI } = require('@google/genai');

const MODEL_NAME_CHAT = "gemini-2.5-flash";
const MODEL_NAME_SUMMARIZE_ANALYZE = "gemini-2.5-flash";

let chatModel = null, chatAPI = null;

const dailySummaryConfig = {
    responseMimeType: 'application/json',
    responseSchema: {
        type: 'object',
        properties: {
            summary: { type: 'string' },
            interests: { type: 'array', items: { type: 'string' } },
            sentiment: {
                type: 'object',
                properties: {
                    tone: { type: 'string' },
                    reaction: { type: 'string' }
                }
            },
            improvementRoom: { type: 'array', items: { type: 'string' } },
            openloop: { type: 'array', items: { type: 'string' } }
        },
        required: ["summary", "interests", "sentiment", "improvementRoom", "openloop"]
    },
    temperature: 0.8
}

/*Expected output schema
{
    summary: "",
    interests: [],
    sentiment: {
        tone: "",
        reaction: ""
    },
    improvementRoom: [],
    openloop: []
}
*/

const overallSummaryConfig = {
    responseMimeType: 'application/json',
    responseSchema: {
        type: 'object',
        properties: {
            overallSummary: { type: 'string' },
            overallInterests: { type: 'array', items: { type: 'string' } },
            overallSentiment: {
                type: 'object',
                properties: {
                    overall_tone: { type: 'string' },
                    recent_reaction: { type: 'string' }
                }
            },
            improvementRoom: { type: 'array', items: { type: 'string' } },
            overallOpenloop: { type: 'array', items: { type: 'string' } }
        },
        required: ["overallSummary", "overallInterests", "overallSentiment", "improvementRoom", "overallOpenloop"]
    },
    temperature: 0.8
}

/*Expected output schema
{
    overallSummary: "",
    overallInterests: [],
    overallSentiment: {
        overall_tone: "",
        recent_reaction: ""
    },
    improvementRoom: [],
    overallOpenloop: []
}
*/

const proactiveMessageMakerConfig = {
    temperature: 1.6,
    responseMimeType: 'application/json',
    responseSchema: {
        type: 'object',
        properties: {
            overallTone: { type: 'string' },
            segments: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        tone: { type: 'string' },
                        message: { type: 'string' }
                    }
                }
            }
        },
        required: ["overallTone", "segments"]
    }
}

/*Expected output schema
{
    overallTone: "",
    segments: [
        {
            tone: "",
            message: ""
        }
    ]
}
*/

const initalMessageMakerConfig = {
    temperature: 1.6,
    responseMimeType: 'application/json',
    responseSchema: {
        type: 'object',
        properties: {
            overallTone: { type: 'string' },
            segments: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        tone: { type: 'string' },
                        message: { type: 'string' }
                    }
                }
            }
        },
        required: ["overallTone", "segments"]
    }
}

/*Expected output schema
{
    overallTone: "",
    segments: [
        {
            tone: "",
            message: ""
        }
    ]
}
*/

async function init(ins, toolList, apiKey) {
    chatAPI = new GoogleGenAI({ apiKey: apiKey });
    let tools = toolList.map(tool => { tool.name });
    chatModel = chatAPI.chats.create({
        model: MODEL_NAME_CHAT,
        config: {
            temperature: 1.6,
            maxOutputTokens: 4096,
            systemInstruction: ins,
            thinkingConfig: {
                thinkingBudget: -1,
            },
            mediaResolution: 'MEDIA_RESOLUTION_MEDIUM',
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_NONE",  // Block none
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_NONE",  // Block none
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_NONE",  // Block none
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_NONE",  // Block none
                },
            ],
            responseMimeType: 'application/json',
            responseSchema: {
                type: 'object',
                properties: {
                    overallTone: { type: 'string', enum: ["neutral","friendly","excited","curious","playful","empathetic","encouraging","serious","flirty","comforting","frustrated"] },
                    segments: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                tone: { type: 'string', enum: ["neutral","friendly","excited","curious","playful","empathetic","encouraging","serious","flirty","comforting","frustrated"] },
                                delay: { type: 'number' },
                                message: { type: 'string' }
                            },
                            propertyOrdering: ["tone", "message"],
                            required: ["tone", "message"]
                        }
                    },
                    functionCalls: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string', enum: tools },
                                args: { type: 'array', items: { type: 'string' } }
                            },
                            propertyOrdering: ["name", "args"],
                            required: ["name", "args"]
                        },
                        nullable: true
                    },
                },
                propertyOrdering: ["overallTone", "segments", "functionCalls"],
                required: ["overallTone", "segments"]
            },
        }
    });
}

/*Expected output schema
{
    overallTone: "",
    segments: [
        {
            tone: "",
            delay: 0,
            message: ""
        }
    ],
    functionCalls: [
        {
            name: '',
            args: []
        }
    ]
}
*/

const gen = async (prompt, config) => {
    const result = await chatAPI.models.generateContent({
        model: MODEL_NAME_SUMMARIZE_ANALYZE,
        contents: prompt,
        config: config
    });
    return JSON.parse(result.candidates[0].content.parts[0].text);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function sendMessage(userMessage) {
    try {
        const result = await chatModel.sendMessage({ message: userMessage });
        await delay(500);
        console.log(result.text);
        await delay(500);
        return JSON.parse(result.text);
    } catch (error) {
        log.alert("Error sending message to Gemini", error);
        const errorResponse = {
            overallTone: "neutral",
            segments: [
                {
                    tone: "neutral",
                    message: "I'm sorry, I'm having trouble connecting right now. Could you please try again?"
                }
            ],
            functionCalls: null
        }
        return errorResponse;
    }
}

async function dailySummary(prompt) {
    try {
        return await gen(prompt, dailySummaryConfig)
    } catch (error) {
        log.alert("Error sending message to Gemini", error);
        return;
    }
}

async function overallSummary(prompt) {
    try {
        return await gen(prompt, overallSummaryConfig);
    } catch (error) {
        log.alert("Error sending message to Gemini", error);
        return;
    }
}

async function proactiveMessageMaker(prompt) {
    try {
        return await gen(prompt, proactiveMessageMakerConfig);
    } catch (error) {
        log.alert("Error sending message to Gemini", error);
        return;
    }
}

async function initalMessageMaker(prompt) {
    try {
        return await gen(prompt, initalMessageMakerConfig);
    } catch (error) {
        log.alert("Error sending message to Gemini", error);
        return;
    }
}

module.exports = {
    init,
    sendMessage,
    dailySummary,
    overallSummary,
    proactiveMessageMaker,
    initalMessageMaker
}