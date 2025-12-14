const fs = require('fs-extra');
const log = require('../utils/logger');
const path = require('path');
const stateManager = require('./stateManager');
const { spawn } = require('child_process');
const { nanoid } = require('nanoid');
const { PYTHON_PATH, TTS_PIPER_MODEL, GET_PYTHON_ENV, TEMP_PATH } = require('../utils/pythonConfig');

const state = stateManager.getState();

async function synthesizeSpeech(segment) {
    return new Promise(async (resolve, reject) => {
        const { message, tone } = segment;

        if (!message || !message.trim()) {
            return reject(new Error("Text to synthesize cannot be empty."));
        }

        await fs.ensureDir(TEMP_PATH);
        const uniqueId = `tts_output_${Date.now()}.wav`;
        const outputPath = path.join(TEMP_PATH, uniqueId);
        const scriptPath = path.join(__dirname, 'tts', 'handler.py');

        const args = [
            scriptPath,
            '--text', message,
            '--tone', tone || 'friendly',
            '--output', outputPath,
            '--model', state.config.tts?.model || 'piper',
            '--model_dir', TTS_PIPER_MODEL
        ];

        log.info(`TTS Service`, `Spawning Python process for tone '${tone}'...`);
        const pythonProcess = spawn(PYTHON_PATH, args, {
            env: GET_PYTHON_ENV()
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            log.info(`TTS Python stdout: ${data}`);
            stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            //log.alert(`TTS Python stderr: ${data}`);
            stderr += data.toString();
        });

        pythonProcess.on('close', async (code) => {
            if (code === 0) {
                if (await fs.pathExists(outputPath)) {
                    log.info('TTS Service', 'Audio generated successfully.');
                    resolve(outputPath);
                } else {
                    log.alert('TTS Service', 'Python script succeeded but output file is missing.');
                    reject(new Error('Output file missing'));
                }
            } else {
                log.alert('TTS Service Error', `Exit code: ${code}. Details: ${errorOutput}`);
                reject(new Error(`TTS failed: ${errorOutput}`));
            }
        });
    });
}

module.exports = { synthesizeSpeech };