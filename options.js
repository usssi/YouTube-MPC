const settingsStorageKey = 'youtubeSampler_currentSet';
const statusElement = document.getElementById('status');
const enableButtonElement = document.getElementById('enable-button');
const bankButtons = document.querySelectorAll('.bank-button');
const padElements = document.querySelectorAll('.pad-grid .mpc-pad');
const displayBankElement = document.getElementById('display-bank');
const displayStatusElement = document.getElementById('display-status');

let isInitialized = false;
let currentSelectedBank = 'A';

function getDefaultBankData() {
    const timestamps = {};
    for (let i = 1; i <= 9; i++) { timestamps[i.toString()] = null; }
    return { timestamps: timestamps, mode: 'trigger' };
}

function getDefaultSettings() {
    return {
        isEnabled: true,
        selectedBank: 'A',
        banks: {
            'A': getDefaultBankData(), 'B': getDefaultBankData(),
            'C': getDefaultBankData(), 'D': getDefaultBankData()
        }
    };
}

function updateUIFromSettings(settings) {
    const selectedBank = settings?.selectedBank || 'A';
    const currentBankData = settings?.banks?.[selectedBank] || getDefaultBankData();
    const isEnabled = (typeof settings?.isEnabled === 'boolean') ? settings.isEnabled : true;

    if (enableButtonElement) {
        enableButtonElement.textContent = isEnabled ? 'ON' : 'OFF';
        enableButtonElement.classList.toggle('enabled-state', isEnabled);
        enableButtonElement.classList.toggle('disabled-state', !isEnabled);
    }
    if (displayStatusElement) {
        displayStatusElement.textContent = isEnabled ? 'ON' : 'OFF';
    }
    if (displayBankElement) displayBankElement.textContent = selectedBank;

    bankButtons.forEach(btn => {
        btn.classList.toggle('active-bank', btn.dataset.bank === selectedBank);
    });

    const timestampsData = currentBankData.timestamps || {};
    padElements.forEach(padDiv => {
        const key = padDiv.dataset.key;
        const inputElement = padDiv.querySelector('.pad-input');

        if (key !== undefined && inputElement) {
            const time = timestampsData[key];
            const hasCue = (time !== null && time !== undefined && !isNaN(time));

            inputElement.value = hasCue ? parseFloat(time).toFixed(2) : '';
            padDiv.classList.toggle('has-cue', hasCue);
        }
    });
}

function saveSettingsToStorage(specificUpdate = null) {
    if (!isInitialized) { return; }

    const currentIsEnabled = enableButtonElement?.classList.contains('enabled-state') ?? true;

    chrome.storage.local.get([settingsStorageKey], (result) => {
        if (chrome.runtime.lastError) { console.error("[Options Save] Read Error:", chrome.runtime.lastError); return; }
        const settingsToSave = result[settingsStorageKey] || getDefaultSettings();

        settingsToSave.banks = settingsToSave.banks || {};
        ['A', 'B', 'C', 'D'].forEach(bankId => {
            settingsToSave.banks[bankId] = settingsToSave.banks[bankId] || getDefaultBankData();
        });
        settingsToSave.selectedBank = settingsToSave.selectedBank || 'A';
        settingsToSave.isEnabled = (typeof settingsToSave.isEnabled === 'boolean') ? settingsToSave.isEnabled : true;

        if (specificUpdate && specificUpdate.key !== undefined && specificUpdate.key !== null && specificUpdate.key !== '0') {
             settingsToSave.banks[currentSelectedBank].timestamps = settingsToSave.banks[currentSelectedBank].timestamps || {};
             let finalValue = null;
             if(specificUpdate.value !== null && specificUpdate.value !== '' && !isNaN(parseFloat(specificUpdate.value)) && parseFloat(specificUpdate.value) >= 0){
                 finalValue = parseFloat(parseFloat(specificUpdate.value).toFixed(2));
             } else {
                 finalValue = null;
             }
             settingsToSave.banks[currentSelectedBank].timestamps[specificUpdate.key] = finalValue;
        }

        settingsToSave.isEnabled = currentIsEnabled;
        settingsToSave.selectedBank = currentSelectedBank;

        chrome.storage.local.set({ [settingsStorageKey]: settingsToSave }, () => {
             if (chrome.runtime.lastError) {
                 console.error("[Options Save] SAVE FAILED:", chrome.runtime.lastError);
                 statusElement.textContent = 'Error saving settings!'; statusElement.style.color = 'red';
             } else {
                 updateUIFromSettings(settingsToSave);

                 if(isInitialized){
                     statusElement.textContent = 'Saved.'; statusElement.style.color = 'green';
                     statusElement.style.opacity = '1';
                     setTimeout(() => { if (statusElement.textContent === 'Saved.') statusElement.style.opacity = '0'; }, 1500);
                 }
             }
        });
    });
}

function restoreOptions() {
    isInitialized = false;
    chrome.storage.local.get([settingsStorageKey], (result) => {
        let settingsToUse;
        if (chrome.runtime.lastError) {
           console.error("Error loading settings:", chrome.runtime.lastError);
           statusElement.textContent = 'Error loading settings. Using defaults.';
           settingsToUse = getDefaultSettings();
        } else {
           const loadedSettings = result[settingsStorageKey];

           if (loadedSettings && typeof loadedSettings.banks === 'object' && typeof loadedSettings.selectedBank === 'string') {
                settingsToUse = loadedSettings;
                settingsToUse.banks = settingsToUse.banks || {};
                ['A', 'B', 'C', 'D'].forEach(bankId => {
                    if (!settingsToUse.banks[bankId] || !settingsToUse.banks[bankId].timestamps) {
                        settingsToUse.banks[bankId] = getDefaultBankData();
                    } else {
                        delete settingsToUse.banks[bankId].timestamps['0'];
                    }
                });
                settingsToUse.isEnabled = (typeof settingsToUse.isEnabled === 'boolean') ? settingsToUse.isEnabled : true;
                settingsToUse.selectedBank = settingsToUse.selectedBank || 'A';
           } else {
                statusElement.textContent = 'Initializing default settings...'; statusElement.style.color = 'orange';
                settingsToUse = getDefaultSettings();
                chrome.storage.local.set({ [settingsStorageKey]: settingsToUse }, () => {
                    if (chrome.runtime.lastError) console.error("Failed to save initial default structure:", chrome.runtime.lastError);
                    else console.log("Successfully saved initial default structure.");
                    setTimeout(() => { if(statusElement.textContent.startsWith('Initializing')) statusElement.textContent = ''; }, 2000);
                });
           }
        }
        currentSelectedBank = settingsToUse.selectedBank;
        updateUIFromSettings(settingsToUse);
        isInitialized = true;
     });
}

function handleBankChange(event) {
    const newBank = event.currentTarget.dataset.bank;
    if (!isInitialized || !newBank || newBank === currentSelectedBank) { return; }

    currentSelectedBank = newBank;

    chrome.storage.local.get([settingsStorageKey], (result) => {
        let settings = result[settingsStorageKey] || getDefaultSettings();
        settings.selectedBank = newBank;
        updateUIFromSettings(settings);
        saveSettingsToStorage();
    });
}

function handleClearAll() {
    if (!isInitialized) return;

    if (confirm(`Are you sure you want to clear all timestamps for Bank ${currentSelectedBank}?`)) {
         chrome.storage.local.get([settingsStorageKey], (result) => {
             if (chrome.runtime.lastError) { console.error("ClearAll Error: Get failed", chrome.runtime.lastError); return; }
             const settingsToSave = result[settingsStorageKey] || getDefaultSettings();
             settingsToSave.banks = settingsToSave.banks || {};
             settingsToSave.banks[currentSelectedBank] = getDefaultBankData();
             settingsToSave.selectedBank = currentSelectedBank;
             settingsToSave.isEnabled = enableButtonElement?.classList.contains('enabled-state') ?? true;

             chrome.storage.local.set({ [settingsStorageKey]: settingsToSave }, () => {
                 if (chrome.runtime.lastError) {
                     console.error("ClearAll Error: Set failed", chrome.runtime.lastError);
                     statusElement.textContent = `Error clearing Bank ${currentSelectedBank}.`; statusElement.style.color = 'red';
                 } else {
                      statusElement.textContent = `Timestamps for Bank ${currentSelectedBank} cleared.`;
                      statusElement.style.color = 'blue';
                      setTimeout(() => { statusElement.textContent = ''; }, 2000);
                      updateUIFromSettings(settingsToSave);
                 }
            });
        });
    }
}

function handleEnableToggle() {
    if (!isInitialized) return;
    const currentIsEnabled = enableButtonElement.classList.contains('enabled-state');
    const newState = !currentIsEnabled;

    enableButtonElement.textContent = newState ? 'ON' : 'OFF';
    enableButtonElement.classList.toggle('enabled-state', newState);
    enableButtonElement.classList.toggle('disabled-state', !newState);
    if (displayStatusElement) displayStatusElement.textContent = newState ? 'ON' : 'OFF';

    saveSettingsToStorage();
}

function handlePadInputChange(event) {
    const inputElement = event.target;
    const key = inputElement.dataset.key;
    let value = inputElement.value;

    if (!key || key === '0') return;

    if (value !== '' && (isNaN(parseFloat(value)) || parseFloat(value) < 0)) {
        console.warn(`Invalid input for Pad ${key}: ${value}. Clearing cue.`);
        value = null;
    }

    saveSettingsToStorage({ key: key, value: value });
}

function handlePadAdjustClick(event) {
    const button = event.target.closest('.pad-adjust');
    if (!button) return;

    const key = button.dataset.key;
    const delta = parseFloat(button.dataset.delta);
    const padElement = button.closest('.mpc-pad');
    const inputElement = padElement?.querySelector(`.pad-input[data-key="${key}"]`);

    if (!inputElement || isNaN(delta)) return;

    let currentValue = parseFloat(inputElement.value);
    if (isNaN(currentValue)) {
        currentValue = 0;
    }

    let newValue = Math.max(0, currentValue + delta);
    newValue = parseFloat(newValue.toFixed(2));

    inputElement.value = newValue.toFixed(2);
    saveSettingsToStorage({ key: key, value: newValue });
}

function handlePadClearClick(event) {
    const button = event.target.closest('.pad-clear-button');
    if (!button) return;

    const key = button.dataset.key;
    const padElement = button.closest('.mpc-pad');
    const inputElement = padElement?.querySelector(`.pad-input[data-key="${key}"]`);


    if (!inputElement) return;

    inputElement.value = '';
    saveSettingsToStorage({ key: key, value: null });
}

document.addEventListener('DOMContentLoaded', () => {

    restoreOptions();

    document.getElementById('clear-all')?.addEventListener('click', handleClearAll);
    enableButtonElement?.addEventListener('click', handleEnableToggle);

    bankButtons.forEach(button => {
        button.addEventListener('click', handleBankChange);
    });

    const padArea = document.querySelector('.pad-area');
    if (padArea) {
        padArea.addEventListener('change', (event) => {
            if (event.target.matches('.pad-input')) {
                handlePadInputChange(event);
            }
        });

        padArea.addEventListener('click', (event) => {
            const clearButton = event.target.closest('.pad-clear-button');
            const adjustButton = event.target.closest('.pad-adjust');

            if (clearButton) {
                handlePadClearClick(event);
            } else if (adjustButton) {
                 handlePadAdjustClick(event);
            }
        });
    }
});
