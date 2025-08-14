import { UIElements } from './uiMng.js';

let isInitialized = false;

async function loadInitialLog() {
    UIElements.logOutput.textContent = 'Loading log...';
    const logContent = await window.electronAPI.getLogContent();
    UIElements.logOutput.textContent = logContent;
    // Scroll to the bottom of the log
    UIElements.logOutput.scrollTop = UIElements.logOutput.scrollHeight;
}

// This function sets up the initial state and listeners for the log tab
export function initLog() {
    if (isInitialized) return;

    // Load initial content when the app starts
    loadInitialLog();

    // Listen for real-time log updates from the main process
    window.electronAPI.onLogUpdate((logMessage) => {
        // Only append and scroll if the log tab is currently active
        if (UIElements.logTab.classList.contains('active')) {
            UIElements.logOutput.textContent += logMessage;
            UIElements.logOutput.scrollTop = UIElements.logOutput.scrollHeight;
        }
    });

    isInitialized = true;
}

// A separate function to be called when the tab is clicked,
// ensuring the log is up-to-date if the user navigates away and back.
export function refreshLogView() {
    loadInitialLog();
}