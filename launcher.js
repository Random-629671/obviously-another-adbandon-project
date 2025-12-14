const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { 
    PYTHON_PATH, 
    VENV_PATH, 
    GET_PYTHON_ENV, 
    DATA_MODEL_PATH,
    STT_MODEL_PATH,
    TTS_PIPER_DIR,
    TTS_PIPER_MODEL,
    ELECTRON_PATH,
    ROOT_DIR 
} = require('./utils/pythonConfig');

const IS_WIN = process.platform === 'win32';
const MARKER_FILE = path.join(VENV_PATH, 'installed_config.txt');

function log(msg) { console.log(`\x1b[36m[LAUNCHER]\x1b[0m ${msg}`); }

function runCmd(cmd, args, cwd = ROOT_DIR, env = process.env) {
    return new Promise((resolve, reject) => {
        log(`Running: ${path.basename(cmd)} ${args.join(' ')}`);
        
        const proc = spawn(cmd, args, { 
            stdio: 'inherit', 
            cwd, 
            env, 
            shell: false 
        });

        proc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`Command exited with code ${code}`));
        });
        
        proc.on('error', err => reject(err));
    });
}

(async () => {
    try {
        log("=== STARTING SETUP & LAUNCHER ===");

        if (!fs.existsSync(path.join(ROOT_DIR, 'node_modules'))) {
            log("Installing Node modules...");
            await new Promise((resolve, reject) => {
                const npm = spawn('npm', ['install'], { stdio: 'inherit', cwd: ROOT_DIR, shell: true });
                npm.on('close', code => code === 0 ? resolve() : reject(new Error('npm install failed')));
            });
        }

        if (!fs.existsSync(VENV_PATH)) {
            log("Creating Python Virtual Environment...");
            await runCmd('python', ['-m', 'venv', '.venv']);
        }

        const pythonEnv = GET_PYTHON_ENV();
        let currentConfig = 'none';
        let targetConfig = 'cpu';

        try {
            if (IS_WIN) {
                execSync('nvidia-smi', { stdio: 'ignore' });
                targetConfig = 'gpu';
            } else {
                execSync('lspci | grep -i nvidia', { stdio: 'ignore' });
                targetConfig = 'gpu';
            }
            log(`GPU Detected. Mode: [${targetConfig}]`);
        } catch (e) {
            log("No NVIDIA GPU detected. Mode: [cpu]");
        }

        if (fs.existsSync(MARKER_FILE)) {
            currentConfig = fs.readFileSync(MARKER_FILE, 'utf8').trim();
        }

        if (currentConfig !== targetConfig) {
            log(`Config mismatch. Updating dependencies...`);
            await runCmd(PYTHON_PATH, ['-m', 'pip', 'install', '--upgrade', 'pip'], ROOT_DIR, pythonEnv);
            
            const pipArgs = ['-m', 'pip', 'install'];
            const torchUrl = targetConfig === 'gpu' 
                ? "https://download.pytorch.org/whl/cu118" 
                : "https://download.pytorch.org/whl/cpu";

            log("Installing PyTorch...");
            await runCmd(PYTHON_PATH, [...pipArgs, "torch", "torchaudio", "--index-url", torchUrl], ROOT_DIR, pythonEnv);
            
            log("Installing libraries...");
            await runCmd(PYTHON_PATH, [...pipArgs, "faster-whisper", "piper-tts", "huggingface_hub", "soundfile", "numpy", "six"], ROOT_DIR, pythonEnv);

            fs.writeFileSync(MARKER_FILE, targetConfig);
        } else {
            log("Dependencies are ready.");
        }

        const sttOk = fs.existsSync(STT_MODEL_PATH) && fs.readdirSync(STT_MODEL_PATH).length > 0;
        const ttsOk = fs.existsSync(TTS_PIPER_MODEL); 

        if (!sttOk || !ttsOk) {
            log("Downloading AI Models...");
            const scriptPath = path.join(ROOT_DIR, 'download_models.py');
            const pyContent = `
import os
from huggingface_hub import snapshot_download, hf_hub_download

stt_path = r"${STT_MODEL_PATH}"
tts_path = r"${TTS_PIPER_DIR}"

print(f"STT -> {stt_path}")
snapshot_download(repo_id="systran/faster-whisper-small", local_dir=stt_path)

print(f"TTS -> {tts_path}")
os.makedirs(tts_path, exist_ok=True)
hf_hub_download(repo_id="rhasspy/piper-voices", filename="en/en_US/amy/medium/en_US-amy-medium.onnx", local_dir=tts_path)
hf_hub_download(repo_id="rhasspy/piper-voices", filename="en/en_US/amy/medium/en_US-amy-medium.onnx.json", local_dir=tts_path)
`;
            fs.writeFileSync(scriptPath, pyContent);
            await runCmd(PYTHON_PATH, [scriptPath], ROOT_DIR, pythonEnv);
            fs.unlinkSync(scriptPath);
        }

        log(`Launching Electron Binary: ${ELECTRON_PATH}`);
        
        if (!fs.existsSync(ELECTRON_PATH)) {
            throw new Error(`Electron binary not found at: ${ELECTRON_PATH}. Please delete node_modules and try again.`);
        }

        const app = spawn(ELECTRON_PATH, ['.'], { 
            stdio: 'inherit', 
            cwd: ROOT_DIR, 
            env: pythonEnv, 
            shell: false 
        });

        app.on('close', (code) => {
            log(`App closed with code ${code}`);
            process.exit(code);
        });

    } catch (err) {
        console.error("\n[CRITICAL ERROR]", err);
        console.log("Press any key to exit...");
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', () => process.exit(1));
    }
})();