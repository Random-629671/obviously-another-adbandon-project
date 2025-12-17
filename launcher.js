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
const CONFIG_CACHE_FILE = path.join(VENV_PATH, 'installed_config.txt');

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

async function verifyNodeModules() {
    log("Verifying Node modules...");
    if (!fs.existsSync(path.join(ROOT_DIR, 'node_modules'))) return false;
    
    try {
        require.resolve('electron');
        require.resolve('fs-extra'); 
        return true;
    } catch (e) {
        log("Node modules missing or broken.");
        return false;
    }
}

async function verifyPythonLibs(pythonEnv) {
    log("Verifying Python libraries...");
    const checkScriptPath = path.join(ROOT_DIR, 'verify_libs_temp.py');
    
    const checkScript = `
import sys
try:
    print("Checking core libraries...")
    import torch
    import torchaudio
    import numpy
    import soundfile
    
    print("Checking AI libraries...")
    import faster_whisper
    import huggingface_hub
    
    # Piper python binding (thường là package 'piper-tts', module 'piper')
    import piper
    
    print("All libraries imported successfully.")
    sys.exit(0)
except ImportError as e:
    print(f"MISSING LIBRARY: {e}")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
`;
    fs.writeFileSync(checkScriptPath, checkScript);

    try {
        await runCmd(PYTHON_PATH, [checkScriptPath], ROOT_DIR, pythonEnv);
        fs.unlinkSync(checkScriptPath);
        return true;
    } catch (error) {
        log("Verification failed: Missing libraries.");
        if (fs.existsSync(checkScriptPath)) fs.unlinkSync(checkScriptPath);
        return false;
    }
}

(async () => {
    try {
        log("=== SYSTEM CHECK & LAUNCH ===");

        if (!(await verifyNodeModules())) {
            log("Installing Node modules...");
            await new Promise((resolve, reject) => {
                const npm = spawn('npm', ['install'], { stdio: 'inherit', cwd: ROOT_DIR, shell: true });
                npm.on('close', code => code === 0 ? resolve() : reject(new Error('npm install failed')));
            });
        }

        if (!fs.existsSync(VENV_PATH)) {
            log("Creating Python Venv...");
            await runCmd('python', ['-m', 'venv', '.venv']);
        }

        const pythonEnv = GET_PYTHON_ENV();

        let currentMode = 'none';
        let targetMode = 'cpu';

        try {
            const checkCmd = IS_WIN ? 'wmic path win32_VideoController get name' : 'lspci | grep -i nvidia';
            const output = execSync(checkCmd, { stdio: 'pipe' }).toString().toLowerCase();
            if (output.includes('nvidia')) targetMode = 'gpu';
        } catch (e) {}
        
        log(`Hardware Check -> Target Mode: [${targetMode}]`);

        if (fs.existsSync(CONFIG_CACHE_FILE)) {
            currentMode = fs.readFileSync(CONFIG_CACHE_FILE, 'utf8').trim();
        }

        const areLibsIntact = await verifyPythonLibs(pythonEnv);

        if (currentMode !== targetMode || !areLibsIntact) {
            log(`Starting Dependency Installation (Mode: ${targetMode})...`);
            
            await runCmd(PYTHON_PATH, ['-m', 'pip', 'install', '--upgrade', 'pip'], ROOT_DIR, pythonEnv);
            
            const torchUrl = targetMode === 'gpu' 
                ? "https://download.pytorch.org/whl/cu118" 
                : "https://download.pytorch.org/whl/cpu";
            
            log(`Installing PyTorch (${targetMode})...`);
            await runCmd(PYTHON_PATH, ['-m', 'pip', 'install', 'torch', 'torchaudio', '--index-url', torchUrl], ROOT_DIR, pythonEnv);
            
            log("Installing AI Dependencies...");
            await runCmd(PYTHON_PATH, ['-m', 'pip', 'install', 'faster-whisper', 'piper-tts', 'huggingface_hub', 'soundfile', 'numpy', 'six'], ROOT_DIR, pythonEnv);

            fs.writeFileSync(CONFIG_CACHE_FILE, targetMode);
            log("Installation Complete.");
        } else {
            log("Python Environment is healthy.");
        }

        const isSttReady = fs.existsSync(STT_MODEL_PATH) && fs.readdirSync(STT_MODEL_PATH).length > 2; // Model thường có > 2 file (bin, config...)
        const isTtsReady = fs.existsSync(TTS_PIPER_MODEL);

        if (!isSttReady || !isTtsReady) {
            log("Missing AI Models. Downloading via Python Script...");
            const dlScriptPath = path.join(ROOT_DIR, 'dl_models_temp.py');
            
            const dlScript = `
import os
from huggingface_hub import snapshot_download, hf_hub_download

# Paths (Raw string để tránh lỗi escape trên Windows)
stt_dir = r"${STT_MODEL_PATH}"
tts_dir = r"${TTS_PIPER_DIR}"

print(f"Downloading STT Model to: {stt_dir}")
snapshot_download(repo_id="systran/faster-whisper-small", local_dir=stt_dir)

print(f"Downloading TTS Model to: {tts_dir}")
os.makedirs(tts_dir, exist_ok=True)
# Tải file onnx
hf_hub_download(repo_id="rhasspy/piper-voices", filename="en/en_US/amy/medium/en_US-amy-medium.onnx", local_dir=tts_dir)
# Tải file json config
hf_hub_download(repo_id="rhasspy/piper-voices", filename="en/en_US/amy/medium/en_US-amy-medium.onnx.json", local_dir=tts_dir)

print("Download sequence finished.")
`;
            fs.writeFileSync(dlScriptPath, dlScript);
            await runCmd(PYTHON_PATH, [dlScriptPath], ROOT_DIR, pythonEnv);
            fs.unlinkSync(dlScriptPath);
        } else {
            log("AI Models are ready.");
        }

        log("Launching Application...");
        if (!fs.existsSync(ELECTRON_PATH)) {
            throw new Error(`Electron binary missing at: ${ELECTRON_PATH}. Re-run npm install.`);
        }

        const app = spawn(ELECTRON_PATH, ['.'], { 
            stdio: 'inherit', 
            cwd: ROOT_DIR, 
            env: pythonEnv, 
            shell: false 
        });

        app.on('close', (code) => {
            log(`Application closed (Code: ${code})`);
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