const { spawn } = require('child_process');
const path = require('path');
const log = require('../utils/logger.js');

function transcribeAudio(filePath) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'stt', 'handler.py');
        const pythonExecutable = process.platform === 'win32'
            ? path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe')
            : path.join(__dirname, '..', '.venv', 'bin', 'python');

        log.info('STT Service', `Spawning Python process: ${pythonExecutable} ${scriptPath} ${filePath}`);

        const pythonProcess = spawn(pythonExecutable, [scriptPath, filePath]);

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