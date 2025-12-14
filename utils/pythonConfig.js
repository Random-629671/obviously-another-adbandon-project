const path = require('path');
const os = require('os');

const ROOT_DIR = path.resolve(__dirname, '..');
const IS_WIN = process.platform === 'win32';

const VENV_PATH = path.join(ROOT_DIR, '.venv');

const PYTHON_PATH = IS_WIN 
    ? path.join(VENV_PATH, 'Scripts', 'python.exe')
    : path.join(VENV_PATH, 'bin', 'python');

const DATA_DIR = path.join(ROOT_DIR, 'data');
const TEMP_PATH = path.join(DATA_DIR, 'temp');
const DATA_MODEL_PATH = path.join(DATA_DIR, 'models');
const HF_CACHE_PATH = path.join(DATA_MODEL_PATH, 'cache');

const STT_MODEL_PATH = path.join(DATA_MODEL_PATH, 'stt', 'faster-whisper-small');
const TTS_PIPER_DIR = path.join(DATA_MODEL_PATH, 'tts', 'piper');
const TTS_PIPER_MODEL = path.join(
    TTS_PIPER_DIR, 
    'en', 'en_US', 'amy', 'medium', 
    'en_US-amy-medium.onnx'
);

const ELECTRON_DIST = path.join(ROOT_DIR, 'node_modules', 'electron', 'dist');
const ELECTRON_PATH = IS_WIN 
    ? path.join(ELECTRON_DIST, 'electron.exe') 
    : path.join(ELECTRON_DIST, 'electron');

const GET_PYTHON_ENV = () => {
    const env = { ...process.env };
    
    env.HF_HOME = HF_CACHE_PATH;
    env.TRANSFORMERS_CACHE = HF_CACHE_PATH;
    env.PYTHONNOUSERSITE = '1';
    
    const venvBin = IS_WIN ? path.join(VENV_PATH, 'Scripts') : path.join(VENV_PATH, 'bin');
    env.PATH = `${venvBin}${path.delimiter}${env.PATH}`;
    env.VIRTUAL_ENV = VENV_PATH;

    for (const key in env) {
        if (env[key] === undefined || env[key] === null) {
            delete env[key];
        } else {
            env[key] = String(env[key]);
        }
    }

    return env;
};

module.exports = {
    ROOT_DIR,
    VENV_PATH,
    PYTHON_PATH,
    ELECTRON_PATH,
    DATA_MODEL_PATH,
    STT_MODEL_PATH,
    TTS_PIPER_DIR,
    TTS_PIPER_MODEL,
    GET_PYTHON_ENV,
    TEMP_PATH
};