const speech = require('@google-cloud/speech').v1p1beta1;
const log = require('../utils/logger');

const client = new speech.SpeechClient();

async function transcribeAudio(audioBuffer) {
    const audio = {
        content: audioBuffer.toString('base64'),
    };
    const config = {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
    };
    const request = {
        audio: audio,
        config: config,
    };

    try {
        log.info('Attempting to transcribe audio...');
        const [response] = await client.recognize(request);
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
        log.info('Audio transcription successful', transcription);
        return transcription;
    } catch (error) {
        log.alert('Error during STT', error);
        return null;
    }
}

module.exports = { transcribeAudio };