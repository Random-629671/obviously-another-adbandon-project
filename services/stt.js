const { spawn } = require('child_process');
const path = require('path');
const log = require('../utils/logger.js');
const { PYTHON_PATH, STT_MODEL_PATH, GET_PYTHON_ENV } = require('../utils/pythonConfig');

function transcribeAudio(filePath) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'stt', 'handler.py');
        
        log.info('STT Service', `Running STT on: ${path.basename(filePath)}`);

        const pythonProcess = spawn(PYTHON_PATH, [
            scriptPath, 
            filePath, 
            '--model_dir', STT_MODEL_PATH
        ], {
            env: GET_PYTHON_ENV()
        });

        let transcription = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            transcription += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code == 0) {
                log.info('STT Service', `Transcription successful: ${transcription.trim()}`);
                resolve(transcription.trim());
            } else {
                log.alert('STT Service Error', `Python script exited with code ${code}. Error: ${errorOutput}`);
                reject(new Error(`Python script error: ${errorOutput}`));
            }
        });

        pythonProcess.on('error', (err) => {
            log.alert('STT Service Error', `Error spawning Python process: ${err.message}`);
            reject(err);
        });
    });
}

module.exports = { transcribeAudio };