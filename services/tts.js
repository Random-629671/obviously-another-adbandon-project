const textToSpeech = require('@google-cloud/text-to-speech');
const util = require('util');
const fs = require('fs');
const log = require('../utils/logger');

const client = new textToSpeech.TextToSpeechClient();

async function synthesizeSpeech(text, outputPath = 'output.mp3') {
    const request = {
        input: { text: text },
        voice: { languageCode: 'en-US', ssmlGender: 'FEMALE' },
        audioConfig: { audioEncoding: 'MP3' },
    };

    try {
        log.info(`Attempting to synthesize speech for text: "${text.substring(0, 50)}..."`);
        const [response] = await client.synthesizeSpeech(request);
        const writeFile = util.promisify(fs.writeFile);
        await writeFile(outputPath, response.audioContent, 'binary');
        log.info(`Audio content written to file: ${outputPath}`);
        return outputPath;
    } catch (error) {
        log.alert('Error during TTS', error);
        return null;
    }
}

module.exports = { synthesizeSpeech };