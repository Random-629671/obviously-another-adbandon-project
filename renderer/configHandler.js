import { UIElements } from './uiMng.js';

let isInitialized = false; // Prevents re-attaching event listeners

async function loadConfigFilesDropdown() {
    const files = await window.electronAPI.getConfigFiles();
    UIElements.configDropdown.innerHTML = '';
    files.forEach(file => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file;
        UIElements.configDropdown.appendChild(option);
    });
    // Automatically display the first file's content
    if (files.length > 0) {
        displayConfigContent(files[0]);
    }
}

async function displayConfigContent(filename) {
    UIElements.configView.innerHTML = 'Loading...';
    const data = await window.electronAPI.getConfigFile(filename);
    UIElements.configView.innerHTML = '';

    if (!data) {
        UIElements.configView.innerHTML = 'Error loading config file.';
        return;
    }

    // Dynamically create form fields based on JSON content
    for (const key in data) {
        const fieldContainer = document.createElement('div');
        fieldContainer.className = 'config-field';

        const keyLabel = document.createElement('label');
        keyLabel.className = 'config-key';
        keyLabel.textContent = key.replace(/_/g, ' '); // Make keys more readable
        keyLabel.htmlFor = `config-val-${key}`;

        let input;
        const value = data[key];

        if (Array.isArray(value) || typeof value === 'object') {
            input = document.createElement('textarea');
            input.value = JSON.stringify(value, null, 2); // Pretty-print JSON
            input.rows = 5;
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.value = value;
        }
        input.className = 'config-value-input';
        input.id = `config-val-${key}`;
        input.dataset.key = key; // Store original key for saving

        fieldContainer.appendChild(keyLabel);
        fieldContainer.appendChild(input);
        UIElements.configView.appendChild(fieldContainer);
    }
}

async function saveChanges() {
    const filename = UIElements.configDropdown.value;
    if (!filename) return;

    const inputs = UIElements.configView.querySelectorAll('.config-value-input');
    const data = {};

    inputs.forEach(input => {
        const key = input.dataset.key;
        let value = input.value;
        try {
            // Attempt to parse textareas back into JSON objects/arrays
            if (input.tagName.toLowerCase() === 'textarea') {
                value = JSON.parse(value);
            }
        } catch (e) {
            console.warn(`Could not parse JSON for key "${key}", saving as string.`);
        }
        data[key] = value;
    });

    UIElements.configSaveButton.textContent = 'Saving...';
    const result = await window.electronAPI.saveConfigFile({ filename, data });
    
    if (result.success) {
        UIElements.configSaveButton.textContent = 'Saved!';
    } else {
        UIElements.configSaveButton.textContent = 'Save Failed!';
    }
    // Reset button text after 2 seconds
    setTimeout(() => { UIElements.configSaveButton.textContent = 'Save Changes'; }, 2000);
}

// This function is called when the config tab is first clicked
export function initConfig() {
    if (isInitialized) return; // Only run once

    loadConfigFilesDropdown();

    UIElements.configDropdown.addEventListener('change', (e) => {
        displayConfigContent(e.target.value);
    });

    UIElements.configSaveButton.addEventListener('click', saveChanges);

    isInitialized = true;
}